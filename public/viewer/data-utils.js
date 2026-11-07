// Workspace/your_open_repos/public/viewer/data-utils.js

function parseJsonWithNonFiniteValues(source) {
    let output = "";
    let inString = false;
    let escaped = false;

    for (let index = 0; index < source.length;) {
        const character = source[index];

        if (inString) {
            output += character;
            if (escaped) {
                escaped = false;
            } else if (character === "\\") {
                escaped = true;
            } else if (character === "\"") {
                inString = false;
            }
            index++;
            continue;
        }

        if (character === "\"") {
            inString = true;
            output += character;
            index++;
            continue;
        }

        const token = source.slice(index).match(/^-?(?:NaN|Infinity)\b/);
        if (token) {
            const previous = source[index - 1];
            const next = source[index + token[0].length];
            if (
                (previous === ":" || previous === "," || previous === "[" || /\s/.test(previous ?? ""))
                && (next === "," || next === "]" || next === "}" || /\s/.test(next ?? ""))
            ) {
                output += "null";
                index += token[0].length;
                continue;
            }
        }

        output += character;
        index++;
    }

    return JSON.parse(output);
}

export async function fetchGeoData(url, formatName) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`${formatName} load failed (${response.status}): ${url}`);
    }
    return parseJsonWithNonFiniteValues(await response.text());
}

function transformedPoint(point, transform) {
    if (!Array.isArray(point) || point.length < 2) return null;
    if (!transform) {
        return point.every(Number.isFinite) ? point : null;
    }

    const [scaleX, scaleY] = transform.scale;
    const [translateX, translateY] = transform.translate;
    const transformed = [
        point[0] * scaleX + translateX,
        point[1] * scaleY + translateY,
        ...point.slice(2)
    ];
    return transformed.every(Number.isFinite) ? transformed : null;
}

function decodeArcs(topology) {
    const transform = topology.transform;
    return (topology.arcs ?? []).map((arc) => {
        let x = 0;
        let y = 0;
        const points = [];

        for (const point of arc) {
            if (!Array.isArray(point) || point.length < 2) continue;
            if (transform) {
                x += point[0];
                y += point[1];
                const decoded = transformedPoint([x, y, ...point.slice(2)], transform);
                if (decoded) points.push(decoded);
            } else if (point.every(Number.isFinite)) {
                points.push(point);
            }
        }
        return points;
    });
}

function joinArcs(references, arcs) {
    const coordinates = [];
    for (const reference of references ?? []) {
        if (!Number.isInteger(reference)) continue;
        const index = reference < 0 ? ~reference : reference;
        const arc = arcs[index];
        if (!arc) continue;
        const points = reference < 0 ? [...arc].reverse() : arc;
        coordinates.push(...(coordinates.length ? points.slice(1) : points));
    }
    return coordinates;
}

function convertGeometry(geometry, arcs, transform) {
    if (!geometry || typeof geometry !== "object") return null;

    if (geometry.type === "Feature") {
        return geometry.geometry ? [geometry] : [];
    }

    if (geometry.type === "GeometryCollection") {
        return (geometry.geometries ?? []).flatMap((child) =>
            convertGeometry(child, arcs, transform) ?? []
        );
    }

    let converted;
    switch (geometry.type) {
        case "Point":
            converted = {
                type: "Point",
                coordinates: transformedPoint(geometry.coordinates, transform)
            };
            break;
        case "MultiPoint":
            converted = {
                type: "MultiPoint",
                coordinates: (geometry.coordinates ?? [])
                    .map((point) => transformedPoint(point, transform))
                    .filter(Boolean)
            };
            break;
        case "LineString":
            converted = { type: geometry.type, coordinates: joinArcs(geometry.arcs, arcs) };
            break;
        case "MultiLineString":
        case "Polygon":
            converted = {
                type: geometry.type,
                coordinates: (geometry.arcs ?? []).map((ring) => joinArcs(ring, arcs))
            };
            break;
        case "MultiPolygon":
            converted = {
                type: geometry.type,
                coordinates: (geometry.arcs ?? []).map((polygon) =>
                    polygon.map((ring) => joinArcs(ring, arcs))
                )
            };
            break;
        default:
            return null;
    }

    if (converted.coordinates == null) return [];
    return [{
        type: "Feature",
        id: geometry.id,
        properties: geometry.properties ?? {},
        geometry: converted
    }];
}

export function toFeatureCollection(data, format) {
    if (data?.type === "FeatureCollection" && Array.isArray(data.features)) {
        return data;
    }
    if (data?.type === "Feature") {
        return { type: "FeatureCollection", features: [data] };
    }

    if (format === "topojson" && data?.type === "Topology") {
        const objects = Object.values(data.objects ?? {});
        const arcs = decodeArcs(data);
        const features = objects.flatMap((object) => {
            if (object.type !== "GeometryCollection") {
                return convertGeometry(object, arcs, data.transform) ?? [];
            }
            return (object.geometries ?? []).flatMap((geometry) =>
                convertGeometry(geometry, arcs, data.transform) ?? []
            );
        });
        return { type: "FeatureCollection", features };
    }

    throw new Error(`Unsupported ${format} data structure`);
}

export function getFeatureBounds(featureCollection) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const visit = (coordinates) => {
        if (!Array.isArray(coordinates)) return;
        if (
            coordinates.length >= 2
            && Number.isFinite(coordinates[0])
            && Number.isFinite(coordinates[1])
        ) {
            minX = Math.min(minX, coordinates[0]);
            minY = Math.min(minY, coordinates[1]);
            maxX = Math.max(maxX, coordinates[0]);
            maxY = Math.max(maxY, coordinates[1]);
            return;
        }
        for (const child of coordinates) visit(child);
    };

    for (const feature of featureCollection.features ?? []) {
        visit(feature?.geometry?.coordinates);
    }
    return Number.isFinite(minX) ? [minX, minY, maxX, maxY] : null;
}


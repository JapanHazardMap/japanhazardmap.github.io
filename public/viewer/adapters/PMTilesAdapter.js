// Workspace/japanhazardmap.github.io/public/viewer/adapters/PMTilesAdapter.js

import * as maplibregl from '../vendor/maplibre-gl.mjs';
import { Protocol, PMTiles } from 'https://jsdelivr.net';

// import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.15.0/dist/maplibre-gl.mjs';
// import { Protocol, PMTiles } from 'https://cdn.jsdelivr.net/npm/pmtiles@4.5.0/+esm';

let protocolInstalled = false;

export class PMTilesAdapter {

    constructor(map) {

        this.map = map;

        this.sources =
            new Map();

        if (!protocolInstalled) {

            const protocol =
                new Protocol();

            maplibregl.addProtocol(
                "pmtiles",
                protocol.tile
            );

            protocolInstalled =
                true;
        }
    }

    async load(layer) {

        const sourceId =
            `pmtiles-${layer.id}`;

        if (this.sources.has(layer.id)) return;

        const archive =
            new PMTiles(
                layer.path
            );

        const header =
            await archive
                .getHeader();

        const sourceLayer =
            layer.sourceLayer
            ?? header?.json?.vector_layers?.[0]?.id;
        if (!sourceLayer) {
            throw new Error(`PMTiles has no vector layer metadata: ${layer.path}`);
        }

        this.map.addSource(
            sourceId,
            {
                type: "vector",
                url:
                    `pmtiles://${layer.path}`
            }
        );

        this.map.addLayer({
            id: `${sourceId}-fill`,
            source: sourceId,
            "source-layer": sourceLayer,
            type: "fill",
            filter: ["==", ["geometry-type"], "Polygon"],
            paint: {
                "fill-color": "#3388ff",
                "fill-opacity": 0.4
            }
        });
        this.map.addLayer({
            id: `${sourceId}-line`,
            source: sourceId,
            "source-layer": sourceLayer,
            type: "line",
            filter: ["==", ["geometry-type"], "LineString"],
            paint: {
                "line-color": "#3388ff",
                "line-width": 2
            }
        });
        this.map.addLayer({
            id: `${sourceId}-point`,
            source: sourceId,
            "source-layer": sourceLayer,
            type: "circle",
            filter: ["==", ["geometry-type"], "Point"],
            paint: {
                "circle-color": "#3388ff",
                "circle-radius": 5,
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 1
            }
        });

        this.sources.set(
            layer.id,
            sourceId
        );

        if (header?.minLon != null && header?.minLat != null
            && header?.maxLon != null && header?.maxLat != null) {
            this.map.fitBounds(
                [[header.minLon, header.minLat], [header.maxLon, header.maxLat]],
                { padding: 40, maxZoom: 12 }
            );
        }
    }

    hide(layerId) {

        const sourceId =
            this.sources.get(
                layerId
            );

        if (!sourceId) {
            return;
        }

        for (const suffix of ["fill", "line", "point"]) {
            const layerName = `${sourceId}-${suffix}`;
            if (this.map.getLayer(layerName)) {
                this.map.removeLayer(layerName);
            }
        }

        if (
            this.map.getSource(
                sourceId
            )
        ) {

            this.map.removeSource(
                sourceId
            );
        }

        this.sources.delete(
            layerId
        );
    }
}


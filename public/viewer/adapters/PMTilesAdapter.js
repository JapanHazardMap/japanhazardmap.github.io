// Workspace/publicRepos/JapanHazardMap/japanhazardmap.github.io/public/viewer/adapters/PMTilesAdapter.js

import * as maplibregl from '/vendor/maplibre-gl/maplibre-gl.mjs';

const { Protocol, PMTiles } = window.pmtiles;

let protocolInstalled = false;

export class PMTilesAdapter {

    constructor(map, dictionaryManager = null) {
        this.map = map;
        this.dictionaryManager = dictionaryManager;
        this.sources = new Map();

        if (!protocolInstalled) {
            const protocol = new Protocol();
            maplibregl.addProtocol("pmtiles", protocol.tile);
            protocolInstalled = true;
        }
    }

    async load(layer) {
        const sourceId = `pmtiles-${layer.id}`;
        if (this.sources.has(layer.id)) return;

        const pmtilesUrl = layer.path || layer.url;
        const archive = new PMTiles(pmtilesUrl);

        const [header, metadata] = await Promise.all([
            archive.getHeader(),
            archive.getMetadata().catch(() => ({}))
        ]);

        // 埋め込みメタデータ内の fieldLabels があれば辞書へ登録
        if (this.dictionaryManager && metadata?.description) {
            try {
                const descObj = typeof metadata.description === "string"
                    ? JSON.parse(metadata.description)
                    : metadata.description;
                if (descObj?.fieldLabels) {
                    this.dictionaryManager.registerEmbeddedFieldLabels(layer.id, descObj.fieldLabels);
                }
            } catch {}
        }

        const sourceLayer =
            layer.sourceLayer
            ?? metadata?.vector_layers?.[0]?.id
            ?? header?.json?.vector_layers?.[0]?.id;

        if (!sourceLayer) {
            throw new Error(`PMTiles has no vector layer metadata: ${pmtilesUrl}`);
        }

        this.map.addSource(sourceId, {
            type: "vector",
            url: `pmtiles://${pmtilesUrl}`
        });

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

        this.sources.set(layer.id, sourceId);

        if (header?.minLon != null && header?.minLat != null
            && header?.maxLon != null && header?.maxLat != null) {
            this.map.fitBounds(
                [[header.minLon, header.minLat], [header.maxLon, header.maxLat]],
                { padding: 40, maxZoom: 12 }
            );
        }
    }

    hide(layerId) {
        const sourceId = this.sources.get(layerId);
        if (!sourceId) return;

        for (const suffix of ["fill", "line", "point"]) {
            const layerName = `${sourceId}-${suffix}`;
            if (this.map.getLayer(layerName)) {
                this.map.removeLayer(layerName);
            }
        }

        if (this.map.getSource(sourceId)) {
            this.map.removeSource(sourceId);
        }

        this.sources.delete(layerId);
    }
}


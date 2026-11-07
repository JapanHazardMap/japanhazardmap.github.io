// Workspace/your_open_repos/public/viewer/adapters/TopoJSONAdapter.js

import {
    fetchGeoData,
    getFeatureBounds,
    toFeatureCollection
} from "../data-utils.js";

export class TopoJSONAdapter {

    constructor(map) {
        this.map = map;
        this.layers = new Map();
    }

    async load(layer) {
        if (this.layers.has(layer.id)) return;

        const topology = await fetchGeoData(layer.path, "TopoJSON");
        const data = toFeatureCollection(topology, "topojson");
        if (data.features.length === 0) {
            throw new Error(`TopoJSON has no drawable features: ${layer.path}`);
        }

        const mapLayerId = `topojson-${layer.id}`;
        this.map.addGeoJSONLayer({ id: mapLayerId, data });
        this.map.fitBounds(getFeatureBounds(data));
        this.layers.set(layer.id, mapLayerId);
    }

    hide(layerId) {
        const mapLayerId = this.layers.get(layerId);
        if (!mapLayerId) return;
        this.map.removeLayer(mapLayerId);
        this.layers.delete(layerId);
    }
}

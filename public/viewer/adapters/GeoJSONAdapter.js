// Workspace/publicRepos/JapanHazardMap/japanhazardmap.github.io/public/viewer/adapters/GeoJSONAdapter.js

import {
    fetchGeoData,
    getFeatureBounds,
    toFeatureCollection
} from "../data-utils.js";

export class GeoJSONAdapter {

    constructor(map) {
        this.map = map;
        this.layers = new Map();
    }

    async load(layer) {
        if (this.layers.has(layer.id)) return;

        const geojson = await fetchGeoData(layer.path, "GeoJSON");
        const data = toFeatureCollection(geojson, "geojson");
        if (data.features.length === 0) {
            throw new Error(`GeoJSON has no drawable features: ${layer.path}`);
        }

        const mapLayerId = `geojson-${layer.id}`;
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

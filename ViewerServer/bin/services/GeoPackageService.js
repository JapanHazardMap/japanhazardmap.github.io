// Workspace/your_open_repos/ViewerServer/bin/services/GeoPackageService.js

import { BoundingBox, GeoPackageAPI } from "@ngageoint/geopackage";

const MAX_FEATURES = 5000;

export class GeoPackageService {

    constructor() {
        this.layers = new Map();
    }

    async open(layerId, filePath) {
        if (this.layers.has(layerId)) return this.layers.get(layerId);

        const gpkg = await GeoPackageAPI.open(filePath);
        const layer = {
            gpkg,
            tables: gpkg.getFeatureTables()
        };
        this.layers.set(layerId, layer);
        return layer;
    }

    async queryExtent(layerId, filePath, extent) {
        const layer = await this.open(layerId, filePath);
        const [west, south, east, north] = extent;
        const bbox = new BoundingBox(west, east, south, north);
        const features = [];

        for (const tableName of layer.tables) {
            const tableFeatures = layer.gpkg.queryForGeoJSONFeaturesInTable(tableName, bbox);
            for (const feature of tableFeatures) {
                features.push(feature);
                if (features.length > MAX_FEATURES) {
                    return {
                        features: features.slice(0, MAX_FEATURES),
                        truncated: true
                    };
                }
            }
        }
        return { features, truncated: false };
    }

    closeAll() {
        for (const layer of this.layers.values()) {
            layer.gpkg.close();
        }
        this.layers.clear();
    }
}


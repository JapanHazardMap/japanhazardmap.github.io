// Workspace/your_open_repos/public/viewer/adapters/ServerVectorAdapter.js

export class ServerVectorAdapter {

    constructor(viewerMap, onStatus = () => {}) {
        this.viewerMap = viewerMap;
        this.onStatus = onStatus;
        this.layers = new Map();
    }

    async fetchFeatures(layer, extent) {
        const bbox = extent.join(",");
        const url = `/api/layers/${encodeURIComponent(layer.id)}/features?bbox=${encodeURIComponent(bbox)}`;
        const response = await fetch(url);
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error ?? `GIS query failed (${response.status})`);
        }
        const data = await response.json();
        if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
            throw new Error("GIS feature API returned invalid GeoJSON");
        }
        return data;
    }

    async load(layer) {
        if (this.layers.has(layer.id)) return;

        const data = await this.fetchFeatures(layer, this.viewerMap.getExtent4326());

        const mapLayerId = `${layer.type}-${layer.id}`;
        this.viewerMap.addGeoJSONLayer({ id: mapLayerId, data });
        const state = { mapLayerId, requestId: 0, removeMoveListener: null };
        this.layers.set(layer.id, state);
        this.onStatus(data.truncated
            ? `${layer.name}: 表示範囲の地物が多いため先頭5,000件を表示しています。拡大すると残りも確認できます。`
            : "");

        state.removeMoveListener = this.viewerMap.onMoveEnd(async (extent) => {
            if (this.layers.get(layer.id) !== state) return;
            const requestId = ++state.requestId;
            try {
                const updated = await this.fetchFeatures(layer, extent);
                if (this.layers.get(layer.id) === state && state.requestId === requestId) {
                    this.viewerMap.updateGeoJSONLayer(mapLayerId, updated);
                    this.onStatus(updated.truncated
                        ? `${layer.name}: 表示範囲の地物が多いため先頭5,000件を表示しています。拡大すると残りも確認できます。`
                        : "");
                }
            } catch (error) {
                this.onStatus(`${layer.name}: ${error.message}`);
                console.error(`Failed to refresh ${layer.name}:`, error);
            }
        });

    }

    hide(layerId) {
        const state = this.layers.get(layerId);
        if (!state) return;
        state.requestId++;
        state.removeMoveListener?.();
        this.viewerMap.removeLayer(state.mapLayerId);
        this.layers.delete(layerId);
    }
}

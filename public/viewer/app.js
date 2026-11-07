// Workspace/japanhazardmap.github.io/public/viewer/app.js

import { ViewerMap }
from "./map.js";

import { loadCatalog }
from "./catalog.js";

import { createLayerTree }
from "./layer-tree.js";

import { PMTilesAdapter }
from "./adapters/PMTilesAdapter.js";

import { TopoJSONAdapter }
from "./adapters/TopoJSONAdapter.js";

import { GeoJSONAdapter }
from "./adapters/GeoJSONAdapter.js";

import { ServerVectorAdapter }
from "./adapters/ServerVectorAdapter.js";

const SERVER_ONLY_TYPES = new Set(["gpkg", "parquet"]);

async function checkServerAvailable() {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1500);
        const res = await fetch("/healthz", {
            signal: controller.signal,
            cache: "no-store"
        });
        clearTimeout(timer);
        if (!res.ok) return false;
        const body = await res.json().catch(() => null);
        return body?.status === "ok";
    } catch {
        return false;
    }
}

async function bootstrap() {
    const status = document.getElementById("viewerStatus");
    try {
        const viewerMap = new ViewerMap("map");
        await viewerMap.initialize();

        const map = viewerMap.getMap();
        const pmtilesAdapter = new PMTilesAdapter(map);
        const geojsonAdapter = new GeoJSONAdapter(viewerMap);
        const topojsonAdapter = new TopoJSONAdapter(viewerMap);
        const serverVectorAdapter = new ServerVectorAdapter(viewerMap, (message) => {
            status.textContent = message;
        });

        const [catalog, serverAvailable] = await Promise.all([
            loadCatalog(),
            checkServerAvailable()
        ]);

        if (catalog.length === 0) {
            status.textContent = "public/data 内に表示可能なGISファイルがありません。";
        } else if (!serverAvailable) {
            const hasServerLayers = catalog.some((layer) => SERVER_ONLY_TYPES.has(layer.type));
            if (hasServerLayers) {
                status.textContent = "静的配信モード: gpkg / parquet はローカルサーバー起動時のみ表示できます。";
            }
        }

        async function toggleLayer(layer, visible) {
            if (visible) {
                switch (layer.type) {
                    case "pmtiles":
                        return pmtilesAdapter.load(layer);
                    case "topojson":
                        return topojsonAdapter.load(layer);
                    case "geojson":
                        return geojsonAdapter.load(layer);
                    case "gpkg":
                    case "parquet":
                        if (!serverAvailable) {
                            throw new Error("ローカルサーバー（ViewerServer）起動時のみ表示できます。");
                        }
                        return serverVectorAdapter.load(layer);
                    default:
                        throw new Error(`Unsupported GIS format: ${layer.type}`);
                }
            }

            switch (layer.type) {
                case "pmtiles":
                    return pmtilesAdapter.hide(layer.id);
                case "topojson":
                    return topojsonAdapter.hide(layer.id);
                case "geojson":
                    return geojsonAdapter.hide(layer.id);
                case "gpkg":
                case "parquet":
                    return serverVectorAdapter.hide(layer.id);
            }
        }

        createLayerTree(catalog, toggleLayer, { serverAvailable });
    } catch (error) {
        status.textContent = `地図ビューアーを初期化できませんでした: ${error.message}`;
        console.error(error);
    }
}

bootstrap();


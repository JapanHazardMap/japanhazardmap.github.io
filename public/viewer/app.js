// Workspace/publicRepos/JapanHazardMap/japanhazardmap.github.io/public/viewer/app.js

import * as maplibregl from "/vendor/maplibre-gl/maplibre-gl.mjs";
import { ViewerMap } from "./map.js";
import { loadCatalog } from "./catalog.js";
import { createLayerTree } from "./layer-tree.js";
import { FieldDictionaryManager } from "./i18n-dictionary.js";
import { PMTilesAdapter } from "./adapters/PMTilesAdapter.js";
import { TopoJSONAdapter } from "./adapters/TopoJSONAdapter.js";
import { GeoJSONAdapter } from "./adapters/GeoJSONAdapter.js";
import { ServerVectorAdapter } from "./adapters/ServerVectorAdapter.js";

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

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function resolveLayerMetaFromMapLayerId(mapLayerId, layerMetaMap) {
    // 例: pmtiles-ksjN03_raw_pmtiles/N03-20260101_01101-fill -> prefix を除去して照合
    const stripped = mapLayerId
        .replace(/^(pmtiles|geojson|topojson|gpkg|parquet)-/, "")
        .replace(/-(fill|line|point)$/, "");
    return layerMetaMap.get(stripped) || null;
}

function buildFeaturePopupHTML(features, layerMetaMap, dictionaryManager) {
    const sections = features.slice(0, 5).map((feat) => {
        const layerMeta = resolveLayerMetaFromMapLayerId(feat.layer.id, layerMetaMap);
        const datasetId = layerMeta?.datasetId || "unknown";
        const layerId = layerMeta?.id || null;
        const headerTitle = layerMeta?.name || dictionaryManager.getDatasetTitle(datasetId);

        const props = feat.properties || {};
        const rows = Object.entries(props)
            .filter(([k]) => !k.startsWith("__"))
            .map(([key, val]) => {
                const label = dictionaryManager.formatFieldLabel(datasetId, key, layerId);
                const formattedVal = dictionaryManager.formatFieldValue(datasetId, key, val);
                return `
                    <tr>
                        <th style="text-align:left;padding:3px 6px;border-bottom:1px solid #eee;background:#f8f9fa;font-weight:600;white-space:nowrap;">${escapeHtml(label)}</th>
                        <td style="padding:3px 6px;border-bottom:1px solid #eee;word-break:break-all;">${escapeHtml(formattedVal)}</td>
                    </tr>
                `;
            })
            .join("");

        return `
            <div style="margin-bottom:8px;">
                <div style="font-weight:bold;font-size:12px;margin-bottom:4px;color:#1a365d;border-bottom:2px solid #3388ff;padding-bottom:2px;">
                    ${escapeHtml(headerTitle)}
                </div>
                <table style="border-collapse:collapse;width:100%;font-size:11px;">
                    <tbody>${rows || '<tr><td>属性データなし</td></tr>'}</tbody>
                </table>
            </div>
        `;
    });

    return `<div style="max-height:280px;overflow-y:auto;padding-right:2px;">${sections.join("")}</div>`;
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

        const [{ datasets: catalog, dictionary }, serverAvailable] = await Promise.all([
            loadCatalog(),
            checkServerAvailable()
        ]);

        const dictionaryManager = new FieldDictionaryManager(dictionary);
        const layerMetaMap = new Map(catalog.map((item) => [item.id, item]));

        if (catalog.length === 0) {
            status.textContent = "public/data 内に表示可能なGISファイルがありません。";
        } else if (!serverAvailable) {
            const hasServerLayers = catalog.some((layer) => SERVER_ONLY_TYPES.has(layer.type));
            if (hasServerLayers) {
                status.textContent = "静的配信モード: gpkg / parquet はローカルサーバー起動時のみ表示できます。";
            }
        }

        // 地図クリック時の多言語属性ポップアップ
        let activePopup = null;
        let lastClickedState = null;

        const renderPopupAt = (lngLat, features) => {
            if (activePopup) {
                activePopup.remove();
                activePopup = null;
            }
            if (!features || features.length === 0) return;

            const html = buildFeaturePopupHTML(features, layerMetaMap, dictionaryManager);
            activePopup = new maplibregl.Popup({ maxWidth: "360px" })
                .setLngLat(lngLat)
                .setHTML(html)
                .addTo(map);
        };

        map.on("click", (e) => {
            const interactiveLayers = map
                .getStyle()
                .layers.filter((l) => l.id !== "background")
                .map((l) => l.id);

            if (interactiveLayers.length === 0) return;
            const features = map.queryRenderedFeatures(e.point, { layers: interactiveLayers });
            if (features.length === 0) return;

            lastClickedState = { lngLat: e.lngLat, features };
            renderPopupAt(e.lngLat, features);
        });

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

        createLayerTree(catalog, toggleLayer, {
            serverAvailable,
            dictionaryManager,
            onDisplayModeChange: () => {
                if (activePopup?.isOpen() && lastClickedState) {
                    renderPopupAt(lastClickedState.lngLat, lastClickedState.features);
                }
            }
        });
    } catch (error) {
        status.textContent = `地図ビューアーを初期化できませんでした: ${error.message}`;
        console.error(error);
    }
}

bootstrap();


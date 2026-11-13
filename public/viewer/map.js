// Workspace/publicRepos/JapanHazardMap/japanhazardmap.github.io/public/viewer/map.js

import * as maplibregl from './vendor/maplibre-gl.mjs';

import { BASEMAPS } from "./basemaps.js";
/**
 * ベースマップ切替用のカスタムコントロール（MapLibre IControl 準拠）
 */
class BasemapSwitcherControl {
    constructor(basemaps, initialId, onChange) {
        this.basemaps = basemaps;
        this.currentId = initialId;
        this.onChange = onChange;
    }

    onAdd() {
        this.container = document.createElement("div");
        this.container.className = "maplibregl-ctrl maplibregl-ctrl-group";
        this.container.style.padding = "4px";
        this.container.style.background = "#ffffff";

        const select = document.createElement("select");
        select.ariaLabel = "背景地図の切り替え";
        select.style.fontSize = "12px";
        select.style.padding = "3px 6px";
        select.style.border = "1px solid #ccc";
        select.style.borderRadius = "3px";
        select.style.cursor = "pointer";
        select.style.background = "#fff";

        for (const bm of Object.values(this.basemaps)) {
            const option = document.createElement("option");
            option.value = bm.id;
            option.textContent = bm.label;
            if (bm.id === this.currentId) {
                option.selected = true;
            }
            select.appendChild(option);
        }

        select.addEventListener("change", (e) => {
            this.currentId = e.target.value;
            this.onChange(this.currentId);
        });

        this.container.appendChild(select);
        return this.container;
    }

    onRemove() {
        this.container?.remove();
    }
}

export class ViewerMap {

    constructor(containerId = "map") {
        this.containerId = containerId;
        this.map = null;
        this.loadedLayers = new Map();
        this.currentBasemapId = "pale"; // 初期表示は淡色地図
    }

    async initialize() {
        console.log("map.js loaded");

        if (this.map) {
            return this.map;
        }

        // 全ベースマップの raster ソースとレイヤーを初期スタイルに組み込む
        const sources = {};
        const layers = [
            {
                id: "background",
                type: "background",
                paint: {
                    "background-color": "#f5f5f5"
                }
            }
        ];

        for (const bm of Object.values(BASEMAPS)) {
            if (!bm.tiles) continue;

            sources[`basemap-${bm.id}`] = {
                type: "raster",
                tiles: bm.tiles,
                tileSize: 256,
                attribution: bm.attribution,
                maxzoom: bm.maxzoom || 18
            };

            layers.push({
                id: `basemap-layer-${bm.id}`,
                type: "raster",
                source: `basemap-${bm.id}`,
                layout: {
                    visibility: bm.id === this.currentBasemapId ? "visible" : "none"
                }
            });
        }

        this.map = new maplibregl.Map({
            container: this.containerId,
            style: {
                version: 8,
                sources,
                layers
            },
            center: [135.5023, 34.6937],
            zoom: 5
        });

        // ズーム・回転コントロール
        this.map.addControl(
            new maplibregl.NavigationControl(),
            "top-right"
        );

        // 背景地図切替コントロール
        this.map.addControl(
            new BasemapSwitcherControl(BASEMAPS, this.currentBasemapId, (id) => {
                this.setBasemap(id);
            }),
            "top-right"
        );

        // スケールバー（縮尺表示）
        this.map.addControl(
            new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }),
            "bottom-left"
        );

        return new Promise((resolve) => {
            this.map.on("load", () => resolve(this.map));
        });
    }

    /**
     * 背景地図を切り替える
     */
    setBasemap(basemapId) {
        if (!this.map || !BASEMAPS[basemapId]) return;
        this.currentBasemapId = basemapId;

        for (const bm of Object.values(BASEMAPS)) {
            if (!bm.tiles) continue;
            const layerId = `basemap-layer-${bm.id}`;
            if (this.map.getLayer(layerId)) {
                this.map.setLayoutProperty(
                    layerId,
                    "visibility",
                    bm.id === basemapId ? "visible" : "none"
                );
            }
        }
    }

    getMap() {
        return this.map;
    }

    // ...（以降の addGeoJSONLayer / updateGeoJSONLayer / setVisible / removeLayer / fitBounds / getExtent4326 / onMoveEnd は既存コードのまま）...
    addGeoJSONLayer({
        id,
        data,
        color = "#3388ff",
        visible = true
    }) {

        if (this.map.getSource(`${id}-source`)) {
            this.removeLayer(id);
        }

        this.map.addSource(
            `${id}-source`,
            {
                type: "geojson",
                data
            }
        );

        this.map.addLayer({
            id: `${id}-fill`,
            source: `${id}-source`,
            type: "fill",
            filter: ["==", ["geometry-type"], "Polygon"],
            paint: {
                "fill-color": color,
                "fill-opacity": 0.4
            }
        });

        this.map.addLayer({
            id: `${id}-line`,
            source: `${id}-source`,
            type: "line",
            filter: ["==", ["geometry-type"], "LineString"],
            paint: {
                "line-color": color,
                "line-width": 2
            }
        });

        this.map.addLayer({
            id: `${id}-point`,
            source: `${id}-source`,
            type: "circle",
            filter: ["==", ["geometry-type"], "Point"],
            paint: {
                "circle-color": color,
                "circle-radius": 5,
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 1
            }
        });

        this.loadedLayers.set(id, true);
        this.setVisible(id, visible);
    }

    updateGeoJSONLayer(id, data) {
        const source = this.map.getSource(`${id}-source`);
        if (!source) {
            throw new Error(`Map layer is not loaded: ${id}`);
        }
        source.setData(data);
    }

    setVisible(
        layerId,
        visible
    ) {

        for (const suffix of ["fill", "line", "point"]) {
            const id = `${layerId}-${suffix}`;
            if (this.map.getLayer(id)) {
                this.map.setLayoutProperty(
                    id,
                    "visibility",
                    visible ? "visible" : "none"
                );
            }
        }
    }

    removeLayer(
        layerId
    ) {

        for (const suffix of ["fill", "line", "point"]) {
            const id = `${layerId}-${suffix}`;
            if (this.map.getLayer(id)) {
                this.map.removeLayer(id);
            }
        }

        if (this.map.getSource(`${layerId}-source`)) {
            this.map.removeSource(`${layerId}-source`);
        }

        this.loadedLayers.delete(
            layerId
        );
    }

    fitBounds(bounds) {
        if (bounds && bounds.length === 4 && bounds.every(Number.isFinite)) {
            this.map.fitBounds(
                [[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
                { padding: 40, maxZoom: 12 }
            );
        }
    }

    getExtent4326() {

        const bounds =
            this.map.getBounds();

        return [

            bounds.getWest(),
            bounds.getSouth(),

            bounds.getEast(),
            bounds.getNorth()
        ];
    }

    onMoveEnd(
        callback
    ) {

        const handler = () => callback(this.getExtent4326());
        this.map.on("moveend", handler);
        return () => this.map.off("moveend", handler);
    }
}


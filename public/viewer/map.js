// Workspace/publicRepos/JapanHazardMap/japanhazardmap.github.io/public/viewer/map.js

import * as maplibregl from '/vendor/maplibre-gl/maplibre-gl.mjs';

// import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.15.0/dist/maplibre-gl.mjs';

export class ViewerMap {

    constructor(
        containerId = "map"
    ) {

        this.containerId =
            containerId;

        this.map =
            null;

        this.loadedLayers =
            new Map();
    }

    async initialize() {

        console.log("map.js loaded");

        if (this.map) {
            return this.map;
        }

        this.map =
            new maplibregl.Map({

                container:
                    this.containerId,

                style:
                    {
                        version: 8,

                        sources: {},

                        layers: [
                            {
                                id: "background",
                                type: "background",
                                paint: {
                                    "background-color":
                                        "#f5f5f5"
                                }
                            }
                        ]
                    },

                center: [
                    135.5023,
                    34.6937
                ],

                zoom: 5
            });

        this.map.addControl(
            new maplibregl.NavigationControl(),
            "top-right"
        );

        return new Promise(
            resolve => {

                this.map.on(
                    "load",
                    () =>
                        resolve(
                            this.map
                        )
                );

            }
        );
    }

    getMap() {

        return this.map;
    }

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


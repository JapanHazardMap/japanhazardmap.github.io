// Workspace/your_open_repos/ViewerServer/bin/services/GeoParquetService.js

import { DuckDBInstance } from "@duckdb/node-api";

const MAX_FEATURES = 5000;
const GEOMETRY_COLUMN_NAMES = new Set(["geometry", "geom", "wkb_geometry"]);

function quoteIdentifier(identifier) {
    return `"${identifier.replaceAll('"', '""')}"`;
}

export class GeoParquetService {

    constructor() {
        this.instance = null;
        this.initializing = null;
        this.layers = new Map();
    }

    async initialize() {
        if (this.instance) return;
        if (!this.initializing) {
            this.initializing = (async () => {
                const instance = await DuckDBInstance.create();
                const connection = await instance.connect();
                try {
                    await connection.run("INSTALL spatial");
                    await connection.run("LOAD spatial");
                } finally {
                    connection.closeSync();
                }
                this.instance = instance;
            })();
        }
        await this.initializing;
    }

    async open(layerId, parquetPath) {
        if (this.layers.has(layerId)) return this.layers.get(layerId);
        await this.initialize();

        const connection = await this.instance.connect();
        try {
            const schema = await connection.run(
                "DESCRIBE SELECT * FROM read_parquet($1)",
                [parquetPath]
            );
            const columns = await schema.getRows();
            const geometryColumn = columns
                .map(([name]) => name)
                .find((name) => GEOMETRY_COLUMN_NAMES.has(name.toLowerCase()));

            if (!geometryColumn) {
                throw new Error(`GeoParquet geometry column not found: ${parquetPath}`);
            }

            const layer = { connection, parquetPath, geometryColumn };
            this.layers.set(layerId, layer);
            return layer;
        } catch (error) {
            connection.closeSync();
            throw error;
        }
    }

    async queryExtent(layerId, parquetPath, extent) {
        const layer = await this.open(layerId, parquetPath);
        const geometry = quoteIdentifier(layer.geometryColumn);
        const sql = `
            SELECT
                * EXCLUDE (${geometry}),
                ST_AsGeoJSON(${geometry}) AS "__viewer_geometry"
            FROM read_parquet($1)
            WHERE ST_Intersects(
                ${geometry},
                ST_MakeEnvelope($2, $3, $4, $5)
            )
            LIMIT $6
        `;
        const [west, south, east, north] = extent;
        const result = await layer.connection.run(
            sql,
            [layer.parquetPath, west, south, east, north, MAX_FEATURES + 1]
        );
        const rows = await result.getRowObjectsJS();

        const truncated = rows.length > MAX_FEATURES;
        const features = rows.slice(0, MAX_FEATURES).map((row, index) => {
            const { __viewer_geometry: geometryJson, ...properties } = row;
            if (typeof geometryJson !== "string") {
                throw new Error(`GeoParquet returned invalid geometry in ${parquetPath}`);
            }
            return {
                type: "Feature",
                id: row.fid ?? row.id ?? index,
                properties,
                geometry: JSON.parse(geometryJson)
            };
        });
        return { features, truncated };
    }

    closeAll() {
        for (const layer of this.layers.values()) {
            layer.connection.closeSync();
        }
        this.layers.clear();
        this.instance?.closeSync();
        this.instance = null;
    }
}


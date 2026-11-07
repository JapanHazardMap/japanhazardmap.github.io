// Workspace/your_open_repos/ViewerServer/bin/server.js

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getJSTTimestamp } from "./getJST.js";

import { ConnectionDrainManager } from "./ConnectionDrainManager.js";
import { DiagnosticCollector } from "./DiagnosticCollector.js";

import { CatalogService }
from "./services/CatalogService.js";

import { GeoPackageService }
from "./services/GeoPackageService.js";

import { GeoParquetService }
from "./services/GeoParquetService.js";

const __dirname =
    path.dirname(
        fileURLToPath(
            import.meta.url
        )
    );

const publicRoot =
    path.resolve(
        __dirname,
        "../../public"
    );

const catalogService =
    new CatalogService(
        publicRoot
    );

const geoPackageService =
    new GeoPackageService();

const geoParquetService =
    new GeoParquetService();

const staticOnly =
    process.argv.includes("--static");
/*
 * 起動毎に catalog.json を再生成
 */
console.log(
    `[${getJSTTimestamp()}][ViewerServer] rebuilding catalog...`
);

await catalogService
    .rebuildCatalogJson();

console.log(
    `[${getJSTTimestamp()}][ViewerServer] catalog.json updated`
);

const app =
    express();

app.use(
    express.json()
);

/*
 * catalog.json
 */
app.get(
    "/catalog.json",
    async (
        req,
        res,
        next
    ) => {

        try {

            res.json(
                await catalogService
                    .getCatalog()
            );

        } catch (
            error
        ) {

            next(
                error
            );
        }
    }
);

/*
 * 手動 rebuild
 */
app.post(
    "/api/catalog/rebuild",
    async (
        req,
        res,
        next
    ) => {

        try {

            const catalog =
                await catalogService
                    .rebuildCatalogJson();

            res.json({

                success:
                    true,

                count:
                    catalog.length
            });

        } catch (
            error
        ) {

            next(
                error
            );
        }
    }
);

/*
 * GIS Query
 */
app.get(
    "/api/layers/:layerId/features",
    async (
        req,
        res,
        next
    ) => {

        try {

            const layer =
                await catalogService
                    .resolveLayer(
                        req.params.layerId
                    );

            if (
                !layer
            ) {

                return res
                    .status(404)
                    .json({
                        error:
                            "GIS layer not found"
                    });
            }

            if (
                ![
                    "gpkg",
                    "parquet"
                ].includes(
                    layer.type
                )
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Layer does not support feature queries"
                    });
            }

            const bboxValue =
                req.query.bbox;

            const extent =
                typeof bboxValue ===
                "string"
                    ? bboxValue
                        .split(",")
                        .map(Number)
                    : [];

            if (

                extent.length !== 4 ||

                !extent.every(
                    Number.isFinite
                ) ||

                extent[0] >= extent[2] ||

                extent[1] >= extent[3]

            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "bbox must be west,south,east,north"
                    });
            }

            const result =
                layer.type === "gpkg"

                ? await geoPackageService
                    .queryExtent(
                        layer.id,
                        layer.filePath,
                        extent
                    )

                : await geoParquetService
                    .queryExtent(
                        layer.id,
                        layer.filePath,
                        extent
                    );

            res.json({

                type:
                    "FeatureCollection",

                features:
                    result.features,

                truncated:
                    result.truncated
            });

        } catch (
            error
        ) {

            next(
                error
            );
        }
    }
);

/*
 * static
 */
app.use(
    express.static(
        publicRoot
    )
);

const diagnostics =
    new DiagnosticCollector();

/*
 * health
 */
app.get(
    "/healthz",
    (
        req,
        res
    ) => {

        res.json({

            status:
                "ok"
        });
    }
);

/*
 * favicon
 */
app.get(
    "/favicon.ico",
    (
        req,
        res
    ) => {

        res
            .status(204)
            .end();
    }
);

const server =
    app.listen(
        3000,
        () => {

            console.log(
                `[${getJSTTimestamp()}] ViewerServer started`
            );
            console.log(
                `view -> http://localhost:3000`
            );
        }
    );

const drainManager =
    new ConnectionDrainManager({

        server,

        diagnostics
    });

app.use(
    drainManager.middleware()
);

/*
 * error handler
 */
app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(

            `[${getJSTTimestamp()}][ViewerServer] ${req.method} ${req.path}`,

            error
        );

        if (
            res.headersSent
        ) {

            return next(
                error
            );
        }

        res
            .status(500)
            .json({

                error:
                    error.message
            });
    }
);

/*
 * shutdown
 */
async function shutdown(
    signal
) {

    console.log(
        `[${getJSTTimestamp()}][ViewerServer] shutdown ${signal}`
    );

    try {

        await geoPackageService
            .closeAll();

        await geoParquetService
            .closeAll();

        await drainManager
            .drain();

    } catch (
        error
    ) {

        console.error(
            error
        );

    } finally {

        process.exit(0);
    }
}

process.on(
    "SIGTERM",
    () =>
        shutdown(
            "SIGTERM"
        )
);

process.on(
    "SIGINT",
    () =>
        shutdown(
            "SIGINT"
        )
);


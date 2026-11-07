// Workspace/your_open_repos/ViewerServer/bin/query/EnvelopeIndexBuilder.js

import fs from "node:fs";
import path from "node:path";

export class EnvelopeIndexBuilder {

    constructor({
        cacheRoot
    }) {

        this.cacheRoot =
            cacheRoot;
    }

    async build({
        gpkg,
        layerId,
        tableName,
        pkColumn
    }) {

        const featureDao =
            gpkg.getFeatureDao(
                tableName
            );

        const rows = [];

        const iterator =
            featureDao.queryForEach();

        for (
            const featureRow
            of iterator
        ) {

            const geometry =
                featureRow.geometry;

            if (!geometry) {
                continue;
            }

            const envelope =
                geometry.envelope;

            if (!envelope) {
                continue;
            }

            rows.push({

                id:
                    featureRow.getValue(
                        pkColumn
                    ),

                minX:
                    envelope.minX,

                minY:
                    envelope.minY,

                maxX:
                    envelope.maxX,

                maxY:
                    envelope.maxY
            });

        }

        const outDir =
            path.join(
                this.cacheRoot,
                "gpkg",
                layerId
            );

        fs.mkdirSync(
            outDir,
            {
                recursive:true
            }
        );

        const outputFile =
            path.join(
                outDir,
                "envelope-index.json"
            );

        fs.writeFileSync(
            outputFile,
            JSON.stringify(
                rows,
                null,
                2
            )
        );

        return rows;
    }
}


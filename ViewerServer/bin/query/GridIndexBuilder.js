// Workspace/your_open_repos/ViewerServer/bin/query/GridIndexBuilder.js

import fs from "node:fs";
import path from "node:path";

export class GridIndexBuilder {

    constructor({
        cacheRoot,
        cellSize = 0.1
    }) {

        this.cacheRoot =
            cacheRoot;

        this.cellSize =
            cellSize;
    }

    build(
        envelopeIndex,
        layerId
    ) {

        const grid = {};

        for (
            const feature
            of envelopeIndex
        ) {

            const minX =
                Math.floor(
                    feature.minX
                    / this.cellSize
                );

            const maxX =
                Math.floor(
                    feature.maxX
                    / this.cellSize
                );

            const minY =
                Math.floor(
                    feature.minY
                    / this.cellSize
                );

            const maxY =
                Math.floor(
                    feature.maxY
                    / this.cellSize
                );

            for (
                let x=minX;
                x<=maxX;
                x++
            ) {

                for (
                    let y=minY;
                    y<=maxY;
                    y++
                ) {

                    const key =
                        `${x}_${y}`;

                    if (
                        !grid[key]
                    ) {

                        grid[key] = [];
                    }

                    grid[key]
                        .push(
                            feature.id
                        );

                }
            }
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

        fs.writeFileSync(
            path.join(
                outDir,
                "grid-index.json"
            ),
            JSON.stringify(
                grid
            )
        );

        return grid;
    }
}


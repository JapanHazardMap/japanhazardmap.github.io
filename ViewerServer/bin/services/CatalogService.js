// Workspace/japanhazardmap.github.io/ViewerServer/bin/services/CatalogService.js

import { createHash } from "node:crypto";
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getJSTTimestamp } from "../getJST.js";

const VIEWABLE_EXTENSIONS = new Map([
    [".geojson", "geojson"],
    [".topojson", "topojson"],
    [".pmtiles", "pmtiles"],
    [".gpkg", "gpkg"],
    [".parquet", "parquet"]
]);

const STATIC_EXTENSIONS = new Map([
    [".topojson", "topojson"],
    [".pmtiles", "pmtiles"]
]);

const IGNORED_DIRECTORIES = new Set([
    "over100mb_usedlfs"
]);

export class CatalogService {

    constructor(publicRoot) {

        this.publicRoot =
            path.resolve(publicRoot);

        this.dataRoot =
            path.join(
                this.publicRoot,
                "data"
            );
    }

    async getCatalog({ staticOnly = false } = {}) {

        const extensions =
            staticOnly
                ? STATIC_EXTENSIONS
                : VIEWABLE_EXTENSIONS;

        const files =
            await this.listFiles(
                this.dataRoot
            );

        return files
            .map(
                filePath =>
                    this.toCatalogEntry(
                        filePath,
                        extensions
                    )
            )
            .filter(Boolean)
            .sort(
                (left, right) =>
                    left.path.localeCompare(
                        right.path
                    )
            );
    }

    async rebuildCatalogJson({ staticOnly = false } = {}) {

        const catalog =
            await this.getCatalog({
                staticOnly
            });

        const catalogPath =
            path.join(
                this.publicRoot,
                "catalog.json"
            );

        await writeFile(
            catalogPath,
            JSON.stringify(
                catalog,
                null,
                2
            ),
            "utf8"
        );

        const modeLabel =
            staticOnly
                ? "static-only (topojson/pmtiles)"
                : "all";

        console.log(
            `[${getJSTTimestamp()}][CatalogService] catalog.json updated [${modeLabel}] (${catalog.length} entries)`
        );
        console.log(
            `[${getJSTTimestamp()}][CatalogService] catalog.json saved -> ${catalogPath}`
        );

        return catalog;
    }

    async resolveLayer(
        layerId
    ) {

        const files =
            await this.listFiles(
                this.dataRoot
            );

        for (
            const filePath
            of files
        ) {

            const layer =
                this.toCatalogEntry(
                    filePath,
                    VIEWABLE_EXTENSIONS
                );

            if (
                layer?.id ===
                layerId
            ) {

                return {
                    ...layer,
                    filePath
                };
            }
        }

        return null;
    }

    async listFiles(
        directory
    ) {

        let entries;

        try {

            entries =
                await readdir(
                    directory,
                    {
                        withFileTypes:
                            true
                    }
                );

        } catch (
            error
        ) {

            if (
                error.code ===
                "ENOENT"
            ) {

                return [];
            }

            throw error;
        }

        const files = [];

        for (
            const entry
            of entries
        ) {

            if (
                entry.isDirectory() &&
                IGNORED_DIRECTORIES.has(entry.name)
            ) {
                continue;
            }

            const entryPath =
                path.join(
                    directory,
                    entry.name
                );

            if (
                entry.isDirectory()
            ) {

                files.push(
                    ...await this.listFiles(
                        entryPath
                    )
                );

            } else if (
                entry.isFile()
            ) {

                files.push(
                    entryPath
                );
            }
        }

        return files;
    }

    toCatalogEntry(
        filePath,
        extensions = VIEWABLE_EXTENSIONS
    ) {

        const extension =
            path.extname(
                filePath
            )
            .toLowerCase();

        const type =
            extensions.get(
                extension
            );

        if (!type) {

            return null;
        }

        const relativePath =
            path.relative(
                this.dataRoot,
                filePath
            );

        const relativeUrl =
            relativePath
                .split(path.sep)
                .map(
                    encodeURIComponent
                )
                .join("/");

        const stem =
            relativePath.slice(
                0,
                -extension.length
            );

        const slug =
            stem
                .split(path.sep)
                .join("-")
                .replace(
                    /[^a-zA-Z0-9_-]/g,
                    "-"
                )
                .replace(
                    /-+/g,
                    "-"
                )
                .replace(
                    /^-|-$/g,
                    ""
                );

        const suffix =
            createHash("sha1")
                .update(
                    relativePath
                )
                .digest("hex")
                .slice(0, 8);

        return {

            id:
                `${slug || "layer"}-${suffix}`,

            name:
                stem
                    .split(path.sep)
                    .join("/"),

            type,

            path:
                `/data/${relativeUrl}`
        };
    }
}

// CLI実行用: node bin/services/CatalogService.js --static
const isMain =
    process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
    const __dirname =
        path.dirname(
            fileURLToPath(import.meta.url)
        );
    const publicRoot =
        path.resolve(
            __dirname,
            "../../../public"
        );
    const staticOnly =
        process.argv.includes("--static");

    const service =
        new CatalogService(publicRoot);

    await service.rebuildCatalogJson({
        staticOnly
    });
}


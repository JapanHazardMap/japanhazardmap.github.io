// Workspace/japanhazardmap.github.io/public/viewer/layer-tree.js

const SERVER_ONLY_TYPES = new Set(["gpkg", "parquet"]);

export function createLayerTree(layers, handler, { serverAvailable = true } = {}) {
    const root = document.getElementById("layerTree");
    const status = document.getElementById("viewerStatus");

    for (const layer of layers) {
        const isServerOnly = SERVER_ONLY_TYPES.has(layer.type);
        const disabledByEnv = isServerOnly && !serverAvailable;

        const row = document.createElement("div");
        row.className = "layer-row";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `layer-${layer.id}`;
        checkbox.disabled = disabledByEnv;

        if (!disabledByEnv) {
            checkbox.addEventListener("change", async () => {
                checkbox.disabled = true;
                status.textContent = "";
                try {
                    await handler(layer, checkbox.checked);
                } catch (error) {
                    checkbox.checked = false;
                    status.textContent = `${layer.name}: ${error.message}`;
                    console.error(error);
                } finally {
                    checkbox.disabled = false;
                }
            });
        }

        const label = document.createElement("label");
        label.htmlFor = checkbox.id;
        label.textContent = disabledByEnv
            ? `${layer.name} (${layer.type} - ローカルサーバー専用)`
            : `${layer.name} (${layer.type})`;

        if (disabledByEnv) {
            label.style.opacity = "0.55";
            label.title = "GitHub Pages等の静的環境では利用できません";
        }

        row.append(checkbox, label);
        root.appendChild(row);
    }
}


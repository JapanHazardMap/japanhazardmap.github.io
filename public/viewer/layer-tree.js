// Workspace/publicRepos/JapanHazardMap/japanhazardmap.github.io/public/viewer/layer-tree.js

import { DISPLAY_MODES } from "./i18n-dictionary.js";

const SERVER_ONLY_TYPES = new Set(["gpkg", "parquet"]);

export function createLayerTree(
    layers,
    handler,
    { serverAvailable = true, dictionaryManager = null, onDisplayModeChange = null } = {}
) {
    const root = document.getElementById("layerTree");
    const status = document.getElementById("viewerStatus");

    // 表示形式・言語モード切替UI
    if (dictionaryManager) {
        const modeBox = document.createElement("div");
        modeBox.className = "layer-display-mode";
        modeBox.style.marginBottom = "8px";
        modeBox.style.paddingBottom = "8px";
        modeBox.style.borderBottom = "1px solid #ddd";

        const modeLabel = document.createElement("label");
        modeLabel.textContent = "属性ラベル表記: ";
        modeLabel.style.fontSize = "12px";
        modeLabel.style.display = "block";
        modeLabel.style.marginBottom = "4px";

        const select = document.createElement("select");
        select.style.width = "100%";
        select.style.fontSize = "12px";
        select.style.padding = "3px";

        for (const mode of DISPLAY_MODES) {
            const opt = document.createElement("option");
            opt.value = mode.id;
            opt.textContent = mode.label;
            select.appendChild(opt);
        }

        select.addEventListener("change", () => {
            dictionaryManager.setMode(select.value);
            onDisplayModeChange?.(select.value);
        });

        modeBox.append(modeLabel, select);
        root.appendChild(modeBox);
    }

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


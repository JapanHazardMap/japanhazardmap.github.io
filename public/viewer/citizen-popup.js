// public/viewer/citizen-popup.js

import * as maplibregl from './vendor/maplibre-gl.mjs';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function setupMapPopup(map, dictionaryManager) {
  const excludedLayers = new Set([
    'background',
    'nearby-radius-circle-fill',
    'nearby-radius-circle-line',
  ]);

  map.on('click', (e) => {
    const style = map.getStyle();
    if (!style || !Array.isArray(style.layers)) return;

    const interactiveLayers = style.layers
      .filter((l) => !excludedLayers.has(l.id) && !l.id.startsWith('basemap-layer-'))
      .map((l) => l.id);

    if (interactiveLayers.length === 0) return;

    const features = map.queryRenderedFeatures(e.point, { layers: interactiveLayers });
    if (!features.length) return;

    const html = features
      .slice(0, 5)
      .map((f) => {
        const props = f.properties || {};
        const rows = Object.entries(props)
          .map(([k, v]) => {
            const label =
              typeof dictionaryManager?.getFieldLabel === 'function'
                ? dictionaryManager.getFieldLabel(k)
                : k;
            return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(v)}</td></tr>`;
          })
          .join('');
        return `<div class="popup-layer-title">${escapeHtml(f.layer.id)}</div><table class="popup-table">${rows}</table>`;
      })
      .join('');

    new maplibregl.Popup({ maxWidth: '380px' }).setLngLat(e.lngLat).setHTML(html).addTo(map);
  });
}

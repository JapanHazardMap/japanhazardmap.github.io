// public/viewer/citizen-app.js
import { ViewerMap } from './map.js';
import { loadCatalog, loadMunicipalityDatasets } from './catalog.js';
import { PMTilesAdapter } from './adapters/PMTilesAdapter.js';
import { FieldDictionaryManager } from './i18n-dictionary.js';
import { createCircleGeoJSON, getCircleBBox, intersectsBBox } from './citizen-geo.js';
import { CitizenUI } from './citizen-ui.js';
import { setupMapPopup } from './citizen-popup.js';

async function init() {
  try {
    const viewerMap = new ViewerMap('map');
    const map = await viewerMap.initialize();

    const { dictionary, municipalities } = await loadCatalog();
    const dictionaryManager = new FieldDictionaryManager(dictionary);
    const pmtilesAdapter = new PMTilesAdapter(map, dictionaryManager);

    const loadedLayerIds = new Set();

    function clearLoadedLayers() {
      for (const id of loadedLayerIds) {
        pmtilesAdapter.hide(id);
      }
      loadedLayerIds.clear();
    }

    function updateSearchCircle(geojson) {
      const sourceId = 'nearby-radius-circle';
      const fillId = 'nearby-radius-circle-fill';
      const lineId = 'nearby-radius-circle-line';

      if (!geojson) {
        if (map.getLayer(lineId)) map.removeLayer(lineId);
        if (map.getLayer(fillId)) map.removeLayer(fillId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        return;
      }

      if (map.getSource(sourceId)) {
        map.getSource(sourceId).setData(geojson);
      } else {
        map.addSource(sourceId, { type: 'geojson', data: geojson });
        map.addLayer({
          id: fillId,
          type: 'fill',
          source: sourceId,
          paint: { 'fill-color': '#0284c7', 'fill-opacity': 0.12 },
        });
        map.addLayer({
          id: lineId,
          type: 'line',
          source: sourceId,
          paint: { 'line-color': '#0284c7', 'line-width': 2, 'line-dasharray': [4, 2] },
        });
      }
    }

    // options を受け取れるように変更
    async function handleToggleLayer(layer, checked, options = {}) {
      if (checked) {
        if (loadedLayerIds.has(layer.id)) return;
        await pmtilesAdapter.load(layer, options);
        loadedLayerIds.add(layer.id);
      } else {
        if (!loadedLayerIds.has(layer.id)) return;
        pmtilesAdapter.hide(layer.id);
        loadedLayerIds.delete(layer.id);
      }
    }

    const ui = new CitizenUI({
      municipalities,
      onSelectMuni: async (code) => {
        updateSearchCircle(null);
        clearLoadedLayers();

        const info = municipalities[code];
        const title = info?.fullName
          ? `${info.prefectureName || ''} ${info.fullName}`
          : `自治体コード: ${code}`;

        if (Array.isArray(info?.bbox) && info.bbox.length >= 4) {
          map.fitBounds(
            [
              [info.bbox[0], info.bbox[1]],
              [info.bbox[2], info.bbox[3]],
            ],
            { padding: 40, maxZoom: 14 },
          );
        }

        const list = await loadMunicipalityDatasets(code);
        const muniDatasetsMap = new Map([[code, list]]);
        await ui.renderMunicipalityLayers(muniDatasetsMap, title, false);
      },
      onToggleLayer: handleToggleLayer,
    });

    ui.initDropdowns();

    ui.btnNearby.addEventListener('click', () => {
      if (!navigator.geolocation) {
        alert('お使いのブラウザは位置情報取得に対応していません。');
        return;
      }

      ui.setNearbyLoading(true);

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { longitude: lon, latitude: lat } = pos.coords;
          const circleGeoJSON = createCircleGeoJSON(lon, lat, 500);
          updateSearchCircle(circleGeoJSON);
          clearLoadedLayers();

          const circleBBox = getCircleBBox(circleGeoJSON);
          const matchedCodes = Object.entries(municipalities)
            .filter(
              ([, info]) => info.datasetIds?.length > 0 && intersectsBBox(circleBBox, info.bbox),
            )
            .map(([code]) => code)
            .sort();

          const fetchedLists = await Promise.all(
            matchedCodes.map(async (code) => [code, await loadMunicipalityDatasets(code)]),
          );
          const muniDatasetsMap = new Map(fetchedLists.filter(([, list]) => list.length > 0));

          map.flyTo({ center: [lon, lat], zoom: 15 });
          await ui.renderMunicipalityLayers(
            muniDatasetsMap,
            '現在地から半径500m圏内の行政区域',
            true,
          );

          ui.setNearbyLoading(false);
        },
        (err) => {
          alert(`位置情報の取得に失敗しました: ${err.message}`);
          ui.setNearbyLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });

    setupMapPopup(map, dictionaryManager);
  } catch (err) {
    console.error('[citizen-app] Initialization failed:', err);
    const statusEl = document.getElementById('status-text');
    if (statusEl) statusEl.textContent = `初期化エラー: ${err.message}`;
  }
}

init();

// public/viewer/catalog.js

export async function loadCatalog() {
  const catalogUrl = new URL('../catalog.json', import.meta.url);
  const response = await fetch(catalogUrl, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`catalog.json load failed : ${response.status}`);
  }

  const data = await response.json();

  // CatalogService.js が出力した短縮キー (c, pc, pn, fn, ds) を正規化
  const rawMunis = data?.municipalities || {};
  const municipalities = {};
  for (const [code, m] of Object.entries(rawMunis)) {
    municipalities[code] = {
      municipalityCode: m.c || code,
      prefectureCode: m.pc || code.slice(0, 2),
      prefectureName: m.pn || '',
      fullName: m.fn || '',
      bbox: m.bbox || null,
      datasetIds: Array.isArray(m.ds) ? m.ds : [],
    };
  }

  return {
    version: data?.version || 1,
    datasets: Array.isArray(data?.datasets) ? data.datasets : [],
    dictionary: data?.dictionary && typeof data.dictionary === 'object' ? data.dictionary : {},
    municipalities,
  };
}

/**
 * 指定した市区町村コードのデータセット一覧のみをオンデマンド取得（1〜5KB）
 */
export async function loadMunicipalityDatasets(muniCode) {
  const code = String(muniCode).padStart(5, '0');
  const url = new URL(`../catalog/muni/${code}.json`, import.meta.url);
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return [];
  return await response.json();
}

/**
 * /layers 全レイヤー一覧画面用：コンパクトタプルを展開して返す
 */
export async function loadAllDatasets() {
  const url = new URL('../catalog/all-datasets.json', import.meta.url);
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return [];
  const tuples = await response.json();
  return tuples.map(([id, name, layerUrl, datasetId, fileName, municipalityCode]) => ({
    id,
    name,
    url: layerUrl,
    path: layerUrl,
    type: 'pmtiles',
    datasetId,
    fileName,
    municipalityCode,
  }));
}

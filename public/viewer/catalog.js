// Workspace/publicRepos/JapanHazardMap/japanhazardmap.github.io/public/viewer/catalog.js

export async function loadCatalog() {
  const response = await fetch('./catalog.json', { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`catalog.json load failed : ${response.status}`);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return { datasets: data, dictionary: {} };
  }
  return {
    datasets: Array.isArray(data?.datasets) ? data.datasets : [],
    dictionary: data?.dictionary && typeof data.dictionary === 'object' ? data.dictionary : {},
  };
}


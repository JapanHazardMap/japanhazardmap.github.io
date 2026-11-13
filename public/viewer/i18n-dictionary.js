// Workspace/publicRepos/JapanHazardMap/japanhazardmap.github.io/public/viewer/i18n-dictionary.js

export const DISPLAY_MODES = [
  { id: 'code_ja', label: 'コード＋日本語 (N03_001（都道府県名）)' },
  { id: 'ja_only', label: '日本語のみ (都道府県名)' },
  { id: 'bilingual', label: '日英併記 (都道府県名 / English)' },
  { id: 'code_only', label: 'フィールドコードのみ (N03_001)' },
];

// 将来的に他言語辞書JSONを外部からマージ可能にする拡張レジストリ
const externalLangPacks = new Map();

export class FieldDictionaryManager {
  constructor(dictionary = {}) {
    this.dictionary = dictionary || {};
    this.embeddedMetadataCache = new Map();
    this.mode = 'code_ja';
    this.primaryLang = 'ja';
  }

  setMode(mode) {
    this.mode = mode;
  }

  setPrimaryLang(lang) {
    this.primaryLang = lang;
  }

  /**
   * 将来的に en / zh-TW / th / ru 等の追加翻訳パックを動的ロード・マージする口
   */
  registerLanguagePack(langCode, packData) {
    externalLangPacks.set(langCode, packData);
    for (const [datasetId, dsPatch] of Object.entries(packData || {})) {
      if (!this.dictionary[datasetId]) {
        this.dictionary[datasetId] = { datasetId, dataName: {}, fields: {} };
      }
      if (dsPatch.dataName) {
        Object.assign(this.dictionary[datasetId].dataName, dsPatch.dataName);
      }
      for (const [fieldCode, labels] of Object.entries(dsPatch.fields || {})) {
        if (!this.dictionary[datasetId].fields[fieldCode]) {
          this.dictionary[datasetId].fields[fieldCode] = {};
        }
        Object.assign(this.dictionary[datasetId].fields[fieldCode], labels);
      }
    }
  }

  /**
   * PMTiles 内部メタデータ（description JSON の fieldLabels）をキャッシュ登録
   */
  registerEmbeddedFieldLabels(layerId, fieldLabels) {
    if (fieldLabels && typeof fieldLabels === 'object') {
      this.embeddedMetadataCache.set(layerId, fieldLabels);
    }
  }

  getDatasetTitle(datasetId) {
    const entry = this.dictionary?.[datasetId];
    if (!entry) return datasetId;
    const primary = entry.dataName?.[this.primaryLang] || entry.dataName?.ja || datasetId;
    const en = entry.dataName?.en;
    if (this.mode === 'bilingual' && en && en !== primary) {
      return `${primary} / ${en} (${datasetId})`;
    }
    return primary !== datasetId ? `${primary} (${datasetId})` : datasetId;
  }

  formatFieldLabel(datasetId, fieldCode, layerId = null) {
    const fieldDef = this.dictionary?.[datasetId]?.fields?.[fieldCode];
    const embeddedAlias = layerId ? this.embeddedMetadataCache.get(layerId)?.[fieldCode] : null;

    if (this.mode === 'code_only') {
      return fieldCode;
    }

    const jaLabel = fieldDef?.ja || (embeddedAlias ? embeddedAlias.replace(/^[^（]+（|）$/g, '') : '');
    const primaryLabel = fieldDef?.[this.primaryLang] || jaLabel;
    const enLabel = fieldDef?.en || '';

    if (!primaryLabel) {
      return embeddedAlias || fieldCode;
    }

    if (this.mode === 'ja_only') {
      return primaryLabel;
    }

    if (this.mode === 'bilingual') {
      const biText = enLabel && enLabel !== primaryLabel ? `${primaryLabel} / ${enLabel}` : primaryLabel;
      return `${biText} (${fieldCode})`;
    }

    // デフォルト: N03_001（都道府県名）
    return `${fieldCode}（${primaryLabel}）`;
  }

  /**
   * 属性値がコードリストに一致する場合に人間が読める解説を併記する
   */
  formatFieldValue(datasetId, fieldCode, rawValue) {
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return '—';
    }
    const strVal = String(rawValue);
    const codeLists = this.dictionary?.[datasetId]?.codeLists;
    if (!codeLists) return strVal;

    // フィールドに紐づくコードリスト定義を検索
    for (const cl of Object.values(codeLists)) {
      if (cl?.items && Object.prototype.hasOwnProperty.call(cl.items, strVal)) {
        return `${strVal}（${cl.items[strVal]}）`;
      }
    }
    return strVal;
  }
}


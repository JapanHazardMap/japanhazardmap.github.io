// public/viewer/citizen-ui.js
import { PREF_NAMES } from './citizen-geo.js';

export class CitizenUI {
  constructor({ municipalities, onSelectMuni, onToggleLayer }) {
    this.municipalities = municipalities;
    this.onSelectMuni = onSelectMuni;
    this.onToggleLayer = onToggleLayer;

    this.prefSelect = document.getElementById('pref-select');
    this.muniSelect = document.getElementById('muni-select');
    this.btnNearby = document.getElementById('btn-nearby');
    this.drawer = document.getElementById('layer-drawer');
    this.btnDrawerOpen = document.getElementById('btn-drawer-open');
    this.btnDrawerClose = document.getElementById('btn-drawer-close');
    this.drawerTitle = document.getElementById('drawer-title');
    this.statusText = document.getElementById('status-text');
    this.activeLayersEl = document.getElementById('active-layers');

    this.initDrawerControls();
  }

  initDrawerControls() {
    if (this.btnDrawerClose) {
      this.btnDrawerClose.addEventListener('click', () => this.collapseDrawer());
    }
    if (this.btnDrawerOpen) {
      this.btnDrawerOpen.addEventListener('click', () => this.expandDrawer());
    }

    // スマホ向け：パネルを左にスワイプしたら格納する
    if (this.drawer) {
      let touchStartX = 0;
      let touchStartY = 0;
      this.drawer.addEventListener(
        'touchstart',
        (e) => {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        },
        { passive: true },
      );
      this.drawer.addEventListener(
        'touchend',
        (e) => {
          const dx = e.changedTouches[0].clientX - touchStartX;
          const dy = e.changedTouches[0].clientY - touchStartY;
          // 縦スクロールではなく左方向へ50px以上スワイプした場合
          if (dx < -50 && Math.abs(dx) > Math.abs(dy)) {
            this.collapseDrawer();
          }
        },
        { passive: true },
      );
    }
  }

  collapseDrawer() {
    if (this.drawer) this.drawer.classList.add('collapsed');
    if (this.btnDrawerOpen) this.btnDrawerOpen.classList.remove('hidden');
  }

  expandDrawer() {
    if (this.drawer) this.drawer.classList.remove('collapsed');
    if (this.btnDrawerOpen) this.btnDrawerOpen.classList.add('hidden');
  }

  initDropdowns() {
    const availablePrefs = new Map();
    for (const [code, info] of Object.entries(this.municipalities)) {
      if (!Array.isArray(info.datasetIds) || info.datasetIds.length === 0) continue;
      const prefCode = info.prefectureCode || code.slice(0, 2);
      if (!availablePrefs.has(prefCode)) {
        availablePrefs.set(prefCode, info.prefectureName || PREF_NAMES[prefCode] || '');
      }
    }

    for (const [prefCode, prefName] of Array.from(availablePrefs.entries()).sort()) {
      const opt = document.createElement('option');
      opt.value = prefCode;
      opt.textContent = `${prefCode} ${prefName}`;
      this.prefSelect.appendChild(opt);
    }

    this.prefSelect.addEventListener('change', () => {
      this.updateMuniDropdown(this.prefSelect.value);
    });

    this.muniSelect.addEventListener('change', () => {
      const code = this.muniSelect.value;
      if (code && this.onSelectMuni) {
        this.onSelectMuni(code);
      }
    });
  }

  updateMuniDropdown(prefCode) {
    this.muniSelect.innerHTML = '';

    if (!prefCode) {
      this.muniSelect.disabled = true;
      this.muniSelect.innerHTML = '<option value="">先に都道府県を選択</option>';
      return;
    }

    const muniCodes = Object.entries(this.municipalities)
      .filter(([code, info]) => code.startsWith(prefCode) && info.datasetIds?.length > 0)
      .map(([code]) => code)
      .sort();

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = `市区町村を選択 (${muniCodes.length}件)`;
    this.muniSelect.appendChild(defaultOpt);

    for (const code of muniCodes) {
      const info = this.municipalities[code];
      const label = info?.fullName ? `${info.fullName} (${code})` : `自治体コード: ${code}`;
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = label;
      this.muniSelect.appendChild(opt);
    }
    this.muniSelect.disabled = false;
  }

  setNearbyLoading(isLoading) {
    this.btnNearby.disabled = isLoading;
    this.btnNearby.textContent = isLoading
      ? '位置情報を取得中...'
      : '📍 現在地周辺（半径500m）を表示';
  }

  async renderMunicipalityLayers(muniDatasetsMap, title, autoLoadAdminOnly = false) {
    this.expandDrawer();
    this.activeLayersEl.innerHTML = '';
    this.drawerTitle.textContent = title;

    const entries = Array.from(muniDatasetsMap.entries());
    if (entries.length === 0) {
      this.statusText.textContent = '該当する市区町村データが見つかりませんでした。';
      return;
    }

    this.statusText.textContent = `${entries.length} 件の自治体のデータを表示しています。チェックボックスでレイヤーを切り替えられます。`;

    for (const [code, list] of entries) {
      const info = this.municipalities[code];
      const muniLabel = info?.fullName ? `${info.fullName} (${code})` : `自治体コード: ${code}`;

      const groupEl = document.createElement('div');
      groupEl.className = 'dataset-group';

      const titleEl = document.createElement('div');
      titleEl.className = 'dataset-group-title';
      titleEl.textContent = muniLabel;
      groupEl.appendChild(titleEl);

      for (const layer of list) {
        const label = document.createElement('label');
        label.className = 'layer-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';

        const isAdminPolygon =
          layer.datasetId === 'N03' || String(layer.fileName || '').startsWith('N03');
        const shouldAutoCheck = autoLoadAdminOnly ? isAdminPolygon : true;
        checkbox.checked = shouldAutoCheck;

        const text = document.createElement('span');
        text.textContent = `${layer.titleJa || layer.datasetId} (${layer.fileName})`;

        checkbox.addEventListener('change', async () => {
          await this.onToggleLayer(layer, checkbox.checked);
        });

        label.appendChild(checkbox);
        label.appendChild(text);
        groupEl.appendChild(label);

        if (shouldAutoCheck) {
          await this.onToggleLayer(layer, true);
        }
      }

      this.activeLayersEl.appendChild(groupEl);
    }
  }
}

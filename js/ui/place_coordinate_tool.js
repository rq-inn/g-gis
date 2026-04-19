window.PlaceCoordinateTool = {
  CSV_URL: './data/place_name_cooddinates.csv',
  CSV_PICKER_SUGGESTED_NAME: 'place_name_cooddinates.csv',
  CACHE_KEY: 'GGIS_PLACE_COORDINATE_STAGING_V1',
  REQUIRED_HEADERS: ['L1', 'L2', 'L2_read', 'X', 'Y'],
  SHOW_REGISTER_UI: false,
  SHOW_MARKERS: false,
  _rows: [],
  _header: [],
  _lineBreak: '\r\n',
  _selectedIndex: -1,
  _selectedWord: '',
  _elements: {},
  _stagedByRead: {},
  _markerLayer: null,

  _t(key, fallback = '') {
    const text = window.I18N?.t?.(key);
    return text && text !== 'I18N_INIT_FAILED' ? text : fallback;
  },

  _msg(key, replacements = {}, fallback = '') {
    let text = this._t(key, fallback);
    Object.entries(replacements).forEach(([name, value]) => {
      text = text.replaceAll(`{${name}}`, String(value));
    });
    return text;
  },

  async init() {
    this._render();
    this._bind();
    this._loadStaged();
    await this._loadCsv();
    this._applyStagedToRows();
    this._renderSelection();
    this._renderList();
    this.updateCenterPreview();
    this._renderMarkers();
    window.addEventListener('GGIS_IMAGE_STATE_CHANGED', () => {
      this.updateCenterPreview();
      this._renderMarkers();
    });
  },

  _render() {
    if (document.getElementById('placeCoordinateCard')) return;

    const card = document.createElement('aside');
    card.id = 'placeCoordinateCard';
    card.className = 'gg-place-card';
    card.hidden = !this.SHOW_REGISTER_UI;
    card.innerHTML = `
      <div class="gg-place-card-title">${this._t('PLACE_COORDINATE_TITLE', 'Coordinate Register')}</div>
      <label class="gg-place-card-label" for="placeCoordinateSearch">${this._t('PLACE_JUMP_SEARCH_LABEL', 'Search')}</label>
      <input id="placeCoordinateSearch" class="gg-place-card-input" type="text" inputmode="hiragana" autocomplete="off" spellcheck="false" />
      <div id="placeCoordinateSelected" class="gg-place-card-selected">${this._t('PLACE_JUMP_NOTHING_SELECTED', 'Nothing selected')}</div>
      <div id="placeCoordinateCenter" class="gg-place-card-center">${this._t('PLACE_COORDINATE_CENTER_PREFIX', 'Center')}: ${this._t('PLACE_COORDINATE_CENTER_NO_MAP', 'No map loaded')}</div>
      <div id="placeCoordinateList" class="gg-place-card-list" role="listbox" aria-label="${this._t('PLACE_COORDINATE_LIST_ARIA_LABEL', 'Candidate list')}"></div>
      <div class="gg-place-card-actions">
        <button id="placeCoordinateRegister" class="gg-place-card-button" type="button">${this._t('PLACE_COORDINATE_REGISTER', 'Register')}</button>
        <button id="placeCoordinateSaveCsv" class="gg-place-card-button is-secondary" type="button">${this._t('PLACE_COORDINATE_SAVE_CSV', 'Save CSV')}</button>
        <button id="placeCoordinateRecoverCsv" class="gg-place-card-button is-secondary" type="button">${this._t('PLACE_COORDINATE_RECOVER_CSV', 'Recover CSV')}</button>
      </div>
      <div id="placeCoordinateStatus" class="gg-place-card-status">${this._t('PLACE_COORDINATE_STATUS_LOADING', 'Loading CSV...')}</div>
    `;

    document.body.appendChild(card);
    this._elements = {
      card,
      search: card.querySelector('#placeCoordinateSearch'),
      selected: card.querySelector('#placeCoordinateSelected'),
      center: card.querySelector('#placeCoordinateCenter'),
      list: card.querySelector('#placeCoordinateList'),
      register: card.querySelector('#placeCoordinateRegister'),
      saveCsv: card.querySelector('#placeCoordinateSaveCsv'),
      recoverCsv: card.querySelector('#placeCoordinateRecoverCsv'),
      status: card.querySelector('#placeCoordinateStatus'),
    };
  },

  _bind() {
    const { search, register, saveCsv, recoverCsv } = this._elements;

    search?.addEventListener('input', () => {
      this._selectedIndex = -1;
      this._selectedWord = '';
      this._renderSelection();
      this._renderList();
    });

    search?.addEventListener('keydown', (event) => {
      if (event.isComposing) return;
      if (event.key !== 'Enter') return;

      const rows = this._getFilteredRows();
      if (!rows.length) return;

      event.preventDefault();

      if (this._selectedIndex < 0) {
        const firstIndex = this._rows.indexOf(rows[0]);
        if (firstIndex >= 0) {
          this._selectRowByIndex(firstIndex);
        }
        return;
      }

      this._registerSelection();
    });

    register?.addEventListener('click', () => {
      this._registerSelection();
    });

    saveCsv?.addEventListener('click', () => {
      this._saveStagedToCsv();
    });

    recoverCsv?.addEventListener('click', () => {
      this._recoverCurrentRowsToCsv();
    });
  },

  async _loadCsv() {
    try {
      const response = await fetch(this.CSV_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`CSV_FETCH_FAILED (${response.status})`);
      const text = await response.text();
      this._lineBreak = text.includes('\r\n') ? '\r\n' : '\n';
      this._header = this._parseHeader(text);
      this._rows = this._parseCsvRows(text);
      this._setStatus(this._msg('PLACE_COORDINATE_STATUS_LOADED', { count: this._rows.length }, `${this._rows.length} candidates loaded.`));
    } catch (error) {
      console.error('[PlaceCoordinateTool] CSV load failed:', error);
      this._rows = [];
      this._setStatus(this._t('PLACE_COORDINATE_STATUS_LOAD_FAILED', 'Failed to load CSV.'));
    }
  },

  _parseHeader(text) {
    const firstLine = String(text || '').replace(/^\uFEFF/, '').split(/\r\n|\n|\r/, 1)[0] || '';
    return firstLine.split(',').map((cell) => cell.trim()).filter(Boolean);
  },

  _getFilteredRows() {
    const query = this._normalizeSearchText(this._elements.search?.value || '');
    const candidates = this._rows.filter((row) => String(row?.L2_read || '').trim());
    if (!query) return candidates.slice(0, 100);

    const startsWithMatches = candidates.filter((row) => this._rowSearchTexts(row).some((text) => text.startsWith(query)));
    if (startsWithMatches.length) return startsWithMatches.slice(0, 100);

    return candidates.filter((row) => this._rowSearchTexts(row).some((text) => text.includes(query))).slice(0, 100);
  },

  _renderList() {
    const list = this._elements.list;
    if (!list) return;

    list.innerHTML = '';
    const rows = this._getFilteredRows();
    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'gg-place-card-empty';
      empty.textContent = this._t('PLACE_COORDINATE_EMPTY', 'No candidates');
      list.appendChild(empty);
      return;
    }

    rows.forEach((row) => {
      const rowIndex = this._rows.indexOf(row);
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'gg-place-card-item';
      if (rowIndex === this._selectedIndex) item.classList.add('is-selected');

      const name = document.createElement('span');
      name.className = 'gg-place-card-item-name';
      const staged = this._stagedByRead[String(row.L2_read || '')];
      const hasCsvCoords = this._hasSavedCoords(row);
      if (hasCsvCoords) item.classList.add('is-from-csv');
      if (staged) item.classList.add('is-staged');
      name.textContent = this.getRowDisplayName(row);

      const read = document.createElement('span');
      read.className = 'gg-place-card-item-read';
      read.textContent = String(row.L2_read || '');

      item.appendChild(name);
      item.appendChild(read);

      if (hasCsvCoords) {
        const csvMeta = document.createElement('span');
        csvMeta.className = 'gg-place-card-item-meta is-csv';
        csvMeta.textContent = this._msg('PLACE_COORDINATE_CSV_META', { x: row.X, y: row.Y }, `CSV X ${row.X}, Y ${row.Y}`);
        item.appendChild(csvMeta);
      }

      if (staged) {
        const browserMeta = document.createElement('span');
        browserMeta.className = 'gg-place-card-item-meta is-browser';
        browserMeta.textContent = this._msg('PLACE_COORDINATE_BROWSER_META', { x: staged.X, y: staged.Y }, `BROWSER X ${staged.X}, Y ${staged.Y}`);
        item.appendChild(browserMeta);
      }

      item.addEventListener('click', () => {
        this._selectRowByIndex(rowIndex);
      });

      item.addEventListener('dblclick', () => {
        this._selectRowByIndex(rowIndex);
        this._setStatus(this._msg('PLACE_COORDINATE_SELECTED_MESSAGE', { name: this._selectedWord }, `Selected "${this._selectedWord}".`));
      });

      list.appendChild(item);
    });
  },

  _renderSelection() {
    const selectedRow = this._rows[this._selectedIndex];
    if (!this._elements.selected) return;
    this._elements.selected.textContent = selectedRow
      ? `${this._t('PLACE_COORDINATE_SELECTED_PREFIX', 'Selected')}: ${selectedRow.L2_read} / ${this.getRowDisplayName(selectedRow)}`
      : this._t('PLACE_JUMP_NOTHING_SELECTED', 'Nothing selected');
  },

  updateCenterPreview() {
    const point = window.MapCanvas?.getCenterMapPoint?.();
    if (!this._elements.center) return;
    if (!point) {
      this._elements.center.textContent = `${this._t('PLACE_COORDINATE_CENTER_PREFIX', 'Center')}: ${this._t('PLACE_COORDINATE_CENTER_NO_MAP', 'No map loaded')}`;
      return;
    }
    this._elements.center.textContent = `${this._t('PLACE_COORDINATE_CENTER_PREFIX', 'Center')}: ${this._t('COORD_X', 'X')} ${Math.round(point.x)}, ${this._t('COORD_Y', 'Y')} ${Math.round(point.y)}`;
  },

  async _registerSelection() {
    this.updateCenterPreview();

    if (this._selectedIndex < 0) {
      this._setStatus(this._t('PLACE_COORDINATE_SELECT_FIRST', 'Double-click a candidate to confirm.'));
      return;
    }

    const point = window.MapCanvas?.getCenterMapPoint?.();
    if (!point) {
      this._setStatus(this._t('PLACE_COORDINATE_MAP_NOT_LOADED', 'Map is not loaded yet.'));
      return;
    }

    const row = this._rows[this._selectedIndex];
    if (!row) {
      this._setStatus(this._t('PLACE_COORDINATE_TARGET_NOT_FOUND', 'Selected item was not found.'));
      return;
    }

    const nextX = String(Math.round(point.x));
    const nextY = String(Math.round(point.y));
    row.X = nextX;
    row.Y = nextY;
    this._stagedByRead[String(row.L2_read || '')] = {
      X: nextX,
      Y: nextY,
    };
    this._saveStaged();
    this._setStatus(this._msg('PLACE_COORDINATE_STAGED_REGISTERED', {
      name: row.L2_read,
      x: row.X,
      y: row.Y,
    }, `Temporarily saved in browser: ${row.L2_read} -> X ${row.X}, Y ${row.Y}`));
    this._resetForNextSelection();
    this._renderList();
    this._renderMarkers();
  },

  async _saveStagedToCsv() {
    if (!('showOpenFilePicker' in window)) {
      this._setStatus(this._t('PLACE_COORDINATE_DIRECT_SAVE_UNSUPPORTED', 'Direct CSV save is not supported in this environment.'));
      return false;
    }

    const stagedKeys = Object.keys(this._stagedByRead);
    if (!stagedKeys.length) {
      this._setStatus(this._t('PLACE_COORDINATE_NO_STAGED_COORDS', 'There are no browser-staged coordinates.'));
      return false;
    }

    try {
      const handle = await this._pickCsvHandleForSave();
      if (!handle) return false;
      const refreshed = await this._refreshRowsFromHandle(handle);
      if (!refreshed) return false;
      const writable = await handle.createWritable();
      await writable.write(this._serializeCsv());
      await writable.close();
      this._stagedByRead = {};
      this._saveStaged();
      this._renderList();
      this._renderSelection();
      this._renderMarkers();
      this._setStatus(this._msg('PLACE_COORDINATE_SAVE_DONE', { count: stagedKeys.length }, `CSV save complete: wrote ${stagedKeys.length} items.`));
      return true;
    } catch (error) {
      console.error('[PlaceCoordinateTool] CSV save failed:', error);
      if (error?.name === 'InvalidStateError') {
        this._setStatus(this._t('PLACE_COORDINATE_SAVE_STATE_CHANGED', 'CSV changed and could not be saved. Close the CSV and try Register again.'));
        return false;
      }
      this._setStatus(this._t('PLACE_COORDINATE_SAVE_FAILED', 'Failed to save CSV. Check that the CSV is not open in another app.'));
      return false;
    }
  },

  async _recoverCurrentRowsToCsv() {
    if (!('showOpenFilePicker' in window)) {
      this._setStatus(this._t('PLACE_COORDINATE_DIRECT_SAVE_UNSUPPORTED', 'Direct CSV save is not supported in this environment.'));
      return false;
    }

    if (!this._rows.length) {
      this._setStatus(this._t('PLACE_COORDINATE_NO_RECOVER_DATA', 'There is no data in memory to recover.'));
      return false;
    }

    if (!this._hasMeaningfulRows(this._rows)) {
      this._setStatus(this._t('PLACE_COORDINATE_RECOVER_ABORT_EMPTY', 'Recovery from nearly empty data was stopped.'));
      return false;
    }

    try {
      const handle = await this._pickCsvHandleForSave();
      if (!handle) return false;
      const writable = await handle.createWritable();
      await writable.write(this._serializeCsv());
      await writable.close();
      this._setStatus(this._msg('PLACE_COORDINATE_RECOVER_DONE', { count: this._rows.length }, `CSV recovery complete: restored ${this._rows.length} items from the current screen.`));
      return true;
    } catch (error) {
      console.error('[PlaceCoordinateTool] CSV recover failed:', error);
      this._setStatus(this._t('PLACE_COORDINATE_RECOVER_FAILED', 'Failed to recover CSV.'));
      return false;
    }
  },

  async _pickCsvHandleForSave() {
    this._setStatus(this._t('PLACE_COORDINATE_PICK_CSV', 'Choose the CSV to save.'));
    const handles = await window.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: 'CSV Files',
          accept: { 'text/csv': ['.csv'] },
        },
      ],
    });
    const handle = handles?.[0];
    if (!handle) {
      this._setStatus(this._t('PLACE_COORDINATE_PICK_CANCELLED', 'CSV selection was cancelled.'));
      return null;
    }

    if (handle.name !== this.CSV_PICKER_SUGGESTED_NAME) {
      this._setStatus(this._msg('PLACE_COORDINATE_WRONG_FILE', { name: this.CSV_PICKER_SUGGESTED_NAME }, `The selected file is not ${this.CSV_PICKER_SUGGESTED_NAME}.`));
      return null;
    }

    const permission = await this._requestPermission(handle);
    if (permission !== 'granted') {
      this._setStatus(this._t('PLACE_COORDINATE_WRITE_PERMISSION_DENIED', 'No write permission for the CSV.'));
      return null;
    }

    return handle;
  },

  async _requestPermission(handle) {
    if (!handle) return 'denied';
    const options = { mode: 'readwrite' };
    if (await handle.queryPermission(options) === 'granted') return 'granted';
    return handle.requestPermission(options);
  },

  async _refreshRowsFromHandle(handle) {
    const file = await handle.getFile();
    const text = await file.text();
    const latestRows = this._parseCsvRows(text);
    const latestHeader = this._parseHeader(text);
    const lineBreak = text.includes('\r\n') ? '\r\n' : '\n';

    if (!this._isValidHeader(latestHeader) || !this._hasMeaningfulRows(latestRows)) {
      this._setStatus(this._t('PLACE_COORDINATE_INVALID_OR_EMPTY', 'CSV is empty or broken, so overwrite was stopped.'));
      return false;
    }

    Object.entries(this._stagedByRead).forEach(([read, coords]) => {
      const latestSelectedRow = latestRows.find((row) => String(row?.L2_read || '') === read);
      if (latestSelectedRow) {
        latestSelectedRow.X = String(coords?.X ?? '');
        latestSelectedRow.Y = String(coords?.Y ?? '');
      }
    });

    this._rows = latestRows;
    this._header = latestHeader.length ? latestHeader : this._header;
    this._lineBreak = lineBreak;
    this._applyStagedToRows();
    const selectedRead = this._selectedWord || String(this._rows[this._selectedIndex]?.L2_read || '');
    if (selectedRead) this._selectedIndex = this._rows.findIndex((row) => String(row?.L2_read || '') === selectedRead);
    return true;
  },

  _loadStaged() {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.CACHE_KEY) || '{}');
      this._stagedByRead = parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      this._stagedByRead = {};
    }
  },

  _saveStaged() {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(this._stagedByRead));
  },

  _parseCsvRows(text) {
    const rows = window.CSV?.parse?.(text) || [];
    return Array.isArray(rows) ? rows : [];
  },

  _isValidHeader(header) {
    const actual = Array.isArray(header) ? header : [];
    return this.REQUIRED_HEADERS.every((key) => actual.includes(key));
  },

  _hasMeaningfulRows(rows) {
    return Array.isArray(rows) && rows.some((row) => {
      const l1 = String(row?.L1 ?? '').trim();
      const l2 = String(row?.L2 ?? '').trim();
      const l2Read = String(row?.L2_read ?? '').trim();
      return l1 !== '' || l2 !== '' || l2Read !== '';
    });
  },

  _applyStagedToRows() {
    this._rows.forEach((row) => {
      const staged = this._stagedByRead[String(row?.L2_read || '')];
      if (!staged) return;
      row.X = String(staged.X ?? row.X ?? '');
      row.Y = String(staged.Y ?? row.Y ?? '');
    });
  },

  _rowSearchTexts(row) {
    return [
      this._normalizeSearchText(row?.L1 || ''),
      this._normalizeSearchText(row?.L2 || ''),
      this._normalizeSearchText(row?.L2_read || ''),
      ...this._getSearchAliases(row),
    ].filter(Boolean);
  },

  _getSearchAliases(row) {
    void row;
    return [];
  },
  _normalizeSearchText(value) {
    const src = String(value || '').trim();
    if (!src) return '';

    const katakana = Array.from(src).map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 0x3041 && code <= 0x3096) return String.fromCharCode(code + 0x60);
      return ch;
    }).join('');

    return katakana
      .toLowerCase()
      .replace(/[\s\u3000]+/g, '');
  },

  _getMarkerPoints() {
    return this._rows
      .map((row) => ({
        x: Number(row?.X),
        y: Number(row?.Y),
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  },

  _ensureMarkerLayer() {
    if (!this.SHOW_MARKERS) return null;
    const wrap = document.getElementById('baseWrap');
    const size = window.MapCanvas?.getReferenceSize?.();
    if (!wrap || !size?.width || !size?.height) return null;

    let layer = this._markerLayer;
    if (!(layer instanceof HTMLDivElement) || !wrap.contains(layer)) {
      layer = document.createElement('div');
      layer.id = 'placeCoordinateMarkerLayer';
      layer.style.position = 'absolute';
      layer.style.left = '0';
      layer.style.top = '0';
      layer.style.width = `${size.width}px`;
      layer.style.height = `${size.height}px`;
      layer.style.pointerEvents = 'none';
      layer.style.zIndex = '999';
      wrap.appendChild(layer);
      this._markerLayer = layer;
    }

    layer.style.width = `${size.width}px`;
    layer.style.height = `${size.height}px`;
    return layer;
  },

  _renderMarkers() {
    if (!this.SHOW_MARKERS) {
      if (this._markerLayer) this._markerLayer.innerHTML = '';
      return;
    }
    const layer = this._ensureMarkerLayer();
    if (!layer) return;
    layer.innerHTML = '';
    const points = this._getMarkerPoints();
    points.forEach((point) => {
      const marker = document.createElement('div');
      marker.className = 'gg-place-map-marker';
      marker.style.left = `${point.x}px`;
      marker.style.top = `${point.y}px`;
      layer.appendChild(marker);
    });
  },

  _hasSavedCoords(row) {
    const x = String(row?.X ?? '').trim();
    const y = String(row?.Y ?? '').trim();
    return x !== '' && y !== '';
  },

  _selectRowByIndex(rowIndex) {
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= this._rows.length) return;
    this._selectedIndex = rowIndex;
    this._selectedWord = String(this._rows[rowIndex]?.L2_read || '');
    this._renderSelection();
    this._renderList();
  },

  _resetForNextSelection() {
    this._selectedIndex = -1;
    this._selectedWord = '';
    if (this._elements.search) {
      this._elements.search.value = '';
      this._elements.search.focus();
    }
    this._renderSelection();
    this._renderList();
  },

  _serializeCsv() {
    const header = this._header.length ? this._header : ['L1', 'L2', 'L2_read', 'X', 'Y'];
    const lines = [header.map((value) => this._escapeCsv(value)).join(',')];

    this._rows.forEach((row) => {
      const cells = header.map((key) => this._escapeCsv(row?.[key] ?? ''));
      lines.push(cells.join(','));
    });

    return lines.join(this._lineBreak) + this._lineBreak;
  },

  _escapeCsv(value) {
    const text = String(value ?? '');
    if (!/[",\r\n]/.test(text)) return text;
    return `"${text.replace(/"/g, '""')}"`;
  },

  _setStatus(text) {
    if (this._elements.status) this._elements.status.textContent = String(text || '');
  },

  searchRows(query = '', { requireCoords = false, limit = 100 } = {}) {
    const normalizedQuery = this._normalizeSearchText(query);
    const candidates = this._rows.filter((row) => {
      if (!String(row?.L2_read || '').trim()) return false;
      if (requireCoords && !this._hasSavedCoords(row)) return false;
      return true;
    });

    const max = Math.max(1, Number(limit) || 100);
    if (!normalizedQuery) return candidates.slice(0, max);

    const startsWithMatches = candidates.filter((row) => this._rowSearchTexts(row).some((text) => text.startsWith(normalizedQuery)));
    if (startsWithMatches.length) return startsWithMatches.slice(0, max);

    return candidates.filter((row) => this._rowSearchTexts(row).some((text) => text.includes(normalizedQuery))).slice(0, max);
  },

  getRowDisplayName(row) {
    const primary = String(row?.L2 || '').trim();
    const english = String(row?.L1 || '').trim();
    if (String(window.I18N?.current || '') !== 'L2') return english;
    if (primary && english && primary !== english) return `${primary} 　 ${english}`;
    return primary || english;
  },

  getRowReading(row) {
    if (String(window.I18N?.current || '') !== 'L2') return '';
    return String(row?.L2_read || '').trim();
  },

  getRowCoords(row) {
    const x = Number(row?.X);
    const y = Number(row?.Y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  },
};

window.MapTravelNavigator = {
  _overlay: null,
  _rune: null,
  _caption: null,
  _raf: 0,
  _busy: false,

  _easeOutCubic(t) {
    const x = 1 - Math.max(0, Math.min(1, t));
    return 1 - (x * x * x);
  },

  _easeInOutSine(t) {
    const x = Math.max(0, Math.min(1, t));
    return -(Math.cos(Math.PI * x) - 1) / 2;
  },

  _lerp(a, b, t) {
    return a + ((b - a) * t);
  },

  _cubicBezierPoint(p0, p1, p2, p3, t) {
    const x = Math.max(0, Math.min(1, t));
    const inv = 1 - x;
    const inv2 = inv * inv;
    const x2 = x * x;
    return {
      x: (inv2 * inv * p0.x) + (3 * inv2 * x * p1.x) + (3 * inv * x2 * p2.x) + (x2 * x * p3.x),
      y: (inv2 * inv * p0.y) + (3 * inv2 * x * p1.y) + (3 * inv * x2 * p2.y) + (x2 * x * p3.y),
    };
  },

  _centerOffsetForPoint(point, zoom) {
    const viewport = window.MapView?.getViewportSize?.() || {};
    if (!viewport.width || !viewport.height || !Number.isFinite(point?.x) || !Number.isFinite(point?.y) || !Number.isFinite(zoom) || zoom <= 0) {
      return null;
    }

    return {
      x: (viewport.width / 2) - (point.x * zoom),
      y: (viewport.height / 2) - (point.y * zoom),
    };
  },

  _clampOffset(offset, zoom) {
    const viewport = window.MapView?.getViewportSize?.() || {};
    const size = window.MapCanvas?.getReferenceSize?.() || {};
    if (!Number.isFinite(offset?.x) || !Number.isFinite(offset?.y) || !Number.isFinite(zoom) || zoom <= 0) {
      return offset;
    }

    const scaledWidth = (Number(size.width) || 0) * zoom;
    const scaledHeight = (Number(size.height) || 0) * zoom;
    const viewportWidth = Number(viewport.width) || 0;
    const viewportHeight = Number(viewport.height) || 0;

    const minX = Math.min(0, viewportWidth - scaledWidth);
    const maxX = 0;
    const minY = Math.min(0, viewportHeight - scaledHeight);
    const maxY = 0;

    return {
      x: Math.min(maxX, Math.max(minX, offset.x)),
      y: Math.min(maxY, Math.max(minY, offset.y)),
    };
  },

  _fitCoverZoom(minZoom = 1) {
    const viewport = window.MapView?.getViewportSize?.() || {};
    const size = window.MapCanvas?.getReferenceSize?.() || {};
    const coverZoom = Math.max(
      Number(minZoom) || 1,
      (Number(viewport.width) || 0) / Math.max(1, Number(size.width) || 1),
      (Number(viewport.height) || 0) / Math.max(1, Number(size.height) || 1),
    );
    return Math.max(0.1, coverZoom);
  },

  _getCenterMarkScreenPosition() {
    const centerMark = document.getElementById('centerMark');
    if (!centerMark) {
      return {
        left: window.innerWidth / 2,
        top: window.innerHeight / 2,
      };
    }

    const rect = centerMark.getBoundingClientRect();
    return {
      left: rect.left + (rect.width / 2),
      top: rect.top + (rect.height / 2),
    };
  },

  _ensureOverlay() {
    if (this._overlay && document.body.contains(this._overlay)) return this._overlay;

    const overlay = document.createElement('div');
    overlay.className = 'gg-travel-overlay';
    overlay.hidden = true;
    overlay.innerHTML = '<div class="gg-travel-rune" aria-hidden="true">s</div><div class="gg-travel-caption"></div>';

    document.body.appendChild(overlay);
    this._overlay = overlay;
    this._rune = overlay.querySelector('.gg-travel-rune');
    this._caption = overlay.querySelector('.gg-travel-caption');
    const caption = window.I18N?.t?.('TRAVEL_NOW');
    if (this._caption) {
      this._caption.textContent = caption && caption !== 'I18N_INIT_FAILED' ? caption : '';
    }
    return overlay;
  },

  _applyOverlayState({ opacity = 0, scale = 0.6, rotate = 0, captionOpacity = 0, vignette = 0 } = {}) {
    this._ensureOverlay();
    if (!this._overlay || !this._rune || !this._caption) return;
    const center = this._getCenterMarkScreenPosition();
    this._overlay.style.setProperty('--gg-travel-left', `${center.left}px`);
    this._overlay.style.setProperty('--gg-travel-top', `${center.top}px`);
    this._overlay.style.setProperty('--gg-travel-opacity', String(opacity));
    this._overlay.style.setProperty('--gg-travel-scale', String(scale));
    this._overlay.style.setProperty('--gg-travel-rotate', `${rotate}deg`);
    this._overlay.style.setProperty('--gg-travel-caption-opacity', String(captionOpacity));
    this._overlay.style.setProperty('--gg-travel-vignette', String(vignette));
  },

  async travelTo(row) {
    if (this._busy) return false;
    if (!window.MapCanvas?.hasImages?.()) return false;

    const targetPoint = window.PlaceCoordinateTool?.getRowCoords?.(row);
    const currentPoint = window.MapCanvas?.getCenterMapPoint?.();
    const startState = window.MapView?.getState?.();
    if (!targetPoint || !currentPoint || !startState) return false;

    const safeStartZoom = Math.max(0.1, Number(startState.zoom) || 1);
    const targetZoom = Math.max(safeStartZoom, safeStartZoom < 1 ? 2 : safeStartZoom);
    const worldZoom = this._fitCoverZoom(1);

    const worldStartOffset = this._clampOffset(this._centerOffsetForPoint(currentPoint, worldZoom), worldZoom);
    const worldTargetAtOne = this._clampOffset(this._centerOffsetForPoint(targetPoint, worldZoom), worldZoom);
    const worldTravelOffset = {
      x: worldTargetAtOne?.x,
      y: worldStartOffset?.y,
    };
    const finalOffset = this._clampOffset(this._centerOffsetForPoint(targetPoint, targetZoom), targetZoom);

    if (!worldStartOffset || !worldTravelOffset || !finalOffset) return false;

    this._busy = true;
    const overlay = this._ensureOverlay();
    overlay.hidden = false;

    const stages = {
      appear: 420,
      zoomOut: 1100,
      glide: 1500,
      landing: 1400,
      fade: 500,
    };
    const total = stages.appear + stages.zoomOut + stages.glide + stages.landing + stages.fade;
    const startedAt = performance.now();

    await new Promise((resolve) => {
      const tick = (now) => {
        const elapsed = now - startedAt;
        const clamped = Math.max(0, Math.min(total, elapsed));

        const tAppear = Math.max(0, Math.min(1, clamped / stages.appear));
        const tZoomOut = Math.max(0, Math.min(1, (clamped - stages.appear) / stages.zoomOut));
        const tGlide = Math.max(0, Math.min(1, (clamped - stages.appear - stages.zoomOut) / stages.glide));
        const tLanding = Math.max(0, Math.min(1, (clamped - stages.appear - stages.zoomOut - stages.glide) / stages.landing));
        const tFade = Math.max(0, Math.min(1, (clamped - total + stages.fade) / stages.fade));

        let zoom = safeStartZoom;
        let offsetX = startState.offsetX;
        let offsetY = startState.offsetY;

        if (clamped <= stages.appear) {
          const eased = this._easeOutCubic(tAppear);
          this._applyOverlayState({
            opacity: eased,
            scale: this._lerp(0.42, 0.86, eased),
            rotate: 540 * eased,
            captionOpacity: this._lerp(0, 1, eased),
            vignette: this._lerp(0, 0.7, eased),
          });
        } else if (clamped <= stages.appear + stages.zoomOut) {
          const eased = this._easeInOutSine(tZoomOut);
          zoom = this._lerp(safeStartZoom, worldZoom, eased);
          offsetX = this._lerp(startState.offsetX, worldStartOffset.x, eased);
          offsetY = this._lerp(startState.offsetY, worldStartOffset.y, eased);
          this._applyOverlayState({
            opacity: 1,
            scale: this._lerp(0.86, 1.02, eased),
            rotate: 540 + (eased * 1280),
            captionOpacity: this._lerp(1, 0.84, eased),
            vignette: 0.78,
          });
        } else if (clamped <= stages.appear + stages.zoomOut + stages.glide) {
          const eased = this._easeInOutSine(tGlide);
          const arcHeight = Math.max(40, window.innerHeight * 0.08);
          const bezierPoint = this._cubicBezierPoint(
            worldStartOffset,
            {
              x: this._lerp(worldStartOffset.x, worldTravelOffset.x, 0.28),
              y: worldStartOffset.y - arcHeight,
            },
            {
              x: this._lerp(worldStartOffset.x, worldTravelOffset.x, 0.72),
              y: worldTravelOffset.y - arcHeight,
            },
            worldTravelOffset,
            eased,
          );
          zoom = worldZoom;
          offsetX = bezierPoint.x;
          offsetY = bezierPoint.y;
          const clampedOffset = this._clampOffset({ x: offsetX, y: offsetY }, zoom);
          offsetX = clampedOffset.x;
          offsetY = clampedOffset.y;
          this._applyOverlayState({
            opacity: this._lerp(1, 0.94, eased),
            scale: this._lerp(1.02, 0.94, eased),
            rotate: 1820 + (eased * 900),
            captionOpacity: this._lerp(0.84, 0.32, eased),
            vignette: this._lerp(0.78, 0.44, eased),
          });
        } else {
          const eased = this._easeInOutSine(tLanding);
          zoom = this._lerp(worldZoom, targetZoom, eased);
          offsetX = this._lerp(worldTravelOffset.x, finalOffset.x, eased);
          offsetY = this._lerp(worldTravelOffset.y, finalOffset.y, eased);
          const clampedOffset = this._clampOffset({ x: offsetX, y: offsetY }, zoom);
          offsetX = clampedOffset.x;
          offsetY = clampedOffset.y;

          const fadeFactor = clamped > total - stages.fade ? this._easeOutCubic(tFade) : 0;
          this._applyOverlayState({
            opacity: this._lerp(0.94, 0, fadeFactor),
            scale: this._lerp(0.94, 0.24, fadeFactor),
            rotate: this._lerp(2720, 3040, eased),
            captionOpacity: this._lerp(0.32, 0, fadeFactor),
            vignette: this._lerp(0.44, 0, fadeFactor),
          });
        }

        window.MapView?.setView?.({
          zoom,
          offsetX,
          offsetY,
          syncZoomIndex: clamped >= total,
        });

        if (clamped >= total) {
          overlay.hidden = true;
          this._applyOverlayState({});
          this._raf = 0;
          resolve();
          return;
        }

        this._raf = requestAnimationFrame(tick);
      };

      this._raf = requestAnimationFrame(tick);
    });

    this._busy = false;
    return true;
  },
};

window.PlaceJumpUI = {
  _selectedIndex: -1,
  _elements: {},

  _t(key, fallback = '') {
    const text = window.I18N?.t?.(key);
    return text && text !== 'I18N_INIT_FAILED' ? text : fallback;
  },

  _isJapaneseMode() {
    return String(window.I18N?.current || '') === 'L2';
  },

  _sortRows(rows) {
    const list = Array.isArray(rows) ? rows.slice() : [];
    const isJapanese = this._isJapaneseMode();

    list.sort((a, b) => {
      if (isJapanese) {
        const aKey = window.PlaceCoordinateTool?.getRowReading?.(a) || window.PlaceCoordinateTool?.getRowDisplayName?.(a) || '';
        const bKey = window.PlaceCoordinateTool?.getRowReading?.(b) || window.PlaceCoordinateTool?.getRowDisplayName?.(b) || '';
        return aKey.localeCompare(bKey, 'ja');
      }

      const aKey = String(a?.L1 || window.PlaceCoordinateTool?.getRowDisplayName?.(a) || '');
      const bKey = String(b?.L1 || window.PlaceCoordinateTool?.getRowDisplayName?.(b) || '');
      return aKey.localeCompare(bKey, 'en', { sensitivity: 'base' });
    });

    return list;
  },

  init() {
    this._render();
    this._bind();
    this._renderList();
  },

  _render() {
    if (document.getElementById('placeJumpCard')) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'placeJumpBackdrop';
    backdrop.className = 'gg-place-card-backdrop';
    backdrop.hidden = true;

    const card = document.createElement('aside');
    card.id = 'placeJumpCard';
    card.className = 'gg-place-card is-jump';
    card.hidden = true;
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.innerHTML = `
      <div class="gg-place-card-header">
        <div id="placeJumpTitle" class="gg-place-card-title"></div>
        <button id="placeJumpClose" class="gg-place-card-close" type="button">X</button>
      </div>
      <label id="placeJumpSearchLabel" class="gg-place-card-label" for="placeJumpSearch"></label>
      <input id="placeJumpSearch" class="gg-place-card-input" type="text" inputmode="search" autocomplete="off" spellcheck="false" />
      <div id="placeJumpSelected" class="gg-place-card-selected"></div>
      <div id="placeJumpList" class="gg-place-card-list" role="listbox"></div>
      <div class="gg-place-card-actions">
        <button id="placeJumpCancel" class="gg-place-card-button is-danger" type="button"></button>
        <button id="placeJumpGo" class="gg-place-card-button" type="button"></button>
      </div>
      <div id="placeJumpStatus" class="gg-place-card-status"></div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(card);

    this._elements = {
      backdrop,
      card,
      search: card.querySelector('#placeJumpSearch'),
      selected: card.querySelector('#placeJumpSelected'),
      list: card.querySelector('#placeJumpList'),
      status: card.querySelector('#placeJumpStatus'),
      go: card.querySelector('#placeJumpGo'),
      close: card.querySelector('#placeJumpClose'),
      cancel: card.querySelector('#placeJumpCancel'),
    };
  },

  _bind() {
    const { backdrop, search, go, close, cancel } = this._elements;

    backdrop?.addEventListener('click', () => this.close());
    close?.addEventListener('click', () => this.close());
    cancel?.addEventListener('click', () => this.close());
    go?.addEventListener('click', () => {
      this._startTravel();
    });

    search?.addEventListener('input', () => {
      this._selectedIndex = -1;
      this._renderSelection();
      this._renderList();
    });

    search?.addEventListener('keydown', (event) => {
      if (event.isComposing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
        return;
      }
      if (event.key !== 'Enter') return;

      const rows = this._getRows();
      if (!rows.length) return;
      event.preventDefault();

      if (this._selectedIndex < 0) {
        this._selectedIndex = 0;
        this._renderSelection();
        this._renderList();
        return;
      }

      this._startTravel();
    });
  },

  open() {
    this._render();
    this._selectedIndex = -1;
    if (this._elements.search) this._elements.search.value = '';
    this._applyTexts();
    this._setStatus('');
    this._renderSelection();
    this._renderList();
    this._elements.backdrop.hidden = false;
    this._elements.card.hidden = false;
    this._elements.search?.focus();
  },

  close() {
    if (this._elements.backdrop) this._elements.backdrop.hidden = true;
    if (this._elements.card) this._elements.card.hidden = true;
  },

  _getRows() {
    const rows = window.PlaceCoordinateTool?.searchRows?.(this._elements.search?.value || '', {
      requireCoords: true,
      limit: 120,
    }) || [];

    return this._sortRows(rows);
  },

  _renderList() {
    const list = this._elements.list;
    if (!list) return;
    list.innerHTML = '';

    const rows = this._getRows();
    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'gg-place-card-empty';
      empty.textContent = this._t('PLACE_JUMP_EMPTY');
      list.appendChild(empty);
      return;
    }

    rows.forEach((row, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'gg-place-card-item is-from-csv';
      if (index === this._selectedIndex) item.classList.add('is-selected');

      const name = document.createElement('span');
      name.className = 'gg-place-card-item-name';
      name.textContent = window.PlaceCoordinateTool?.getRowDisplayName?.(row) || '';

      const read = document.createElement('span');
      read.className = 'gg-place-card-item-read';
      const reading = window.PlaceCoordinateTool?.getRowReading?.(row) || '';
      read.textContent = reading;

      const meta = document.createElement('span');
      meta.className = 'gg-place-card-item-meta is-csv';
      const coords = window.PlaceCoordinateTool?.getRowCoords?.(row);
      meta.textContent = coords
        ? `${this._t('COORD_X', 'X')} ${Math.round(coords.x)}, ${this._t('COORD_Y', 'Y')} ${Math.round(coords.y)}`
        : '';

      item.appendChild(name);
      if (reading) item.appendChild(read);
      item.appendChild(meta);

      item.addEventListener('click', () => {
        this._selectedIndex = index;
        this._renderSelection();
        this._renderList();
      });

      item.addEventListener('dblclick', () => {
        this._selectedIndex = index;
        this._renderSelection();
        this._startTravel();
      });

      list.appendChild(item);
    });
  },

  _renderSelection() {
    if (!this._elements.selected) return;
    const row = this._getRows()[this._selectedIndex];
    if (!row) {
      this._elements.selected.hidden = false;
      this._elements.selected.textContent = `${this._t('PLACE_JUMP_DESTINATION_PREFIX')}: ${this._t('PLACE_JUMP_NOTHING_SELECTED')}`;
      return;
    }
    const prefix = this._t('PLACE_JUMP_DESTINATION_PREFIX');
    const reading = window.PlaceCoordinateTool?.getRowReading?.(row);
    const name = window.PlaceCoordinateTool?.getRowDisplayName?.(row);
    this._elements.selected.hidden = false;
    this._elements.selected.textContent = reading ? `${prefix}: ${reading} / ${name}` : `${prefix}: ${name}`;
  },

  _applyTexts() {
    const closeLabel = this._t('CLOSE');
    const title = document.getElementById('placeJumpTitle');
    const searchLabel = document.getElementById('placeJumpSearchLabel');
    const list = document.getElementById('placeJumpList');
    const go = document.getElementById('placeJumpGo');
    const close = document.getElementById('placeJumpClose');
    const cancel = document.getElementById('placeJumpCancel');
    const search = document.getElementById('placeJumpSearch');

    if (title) title.textContent = this._t('PLACE_JUMP_TITLE');
    if (searchLabel) searchLabel.textContent = this._t('PLACE_JUMP_SEARCH_LABEL');
    if (list) list.setAttribute('aria-label', this._t('PLACE_JUMP_LIST_ARIA_LABEL'));
    if (go) go.textContent = this._t('PLACE_JUMP_GO');
    if (cancel) cancel.textContent = closeLabel;
    if (close) {
      close.setAttribute('aria-label', closeLabel);
      close.title = closeLabel;
    }
    if (search) search.placeholder = this._t('PLACE_JUMP_SEARCH_PLACEHOLDER');
  },

  _setStatus(text) {
    if (this._elements.status) this._elements.status.textContent = String(text || '');
  },

  async _startTravel() {
    const row = this._getRows()[this._selectedIndex];
    if (!row) {
      this._setStatus(this._t('PLACE_JUMP_STATUS_SELECT_FIRST'));
      return;
    }
    if (!window.MapCanvas?.hasImages?.()) {
      this._setStatus(this._t('PLACE_JUMP_STATUS_LOAD_MAP_FIRST'));
      return;
    }
    if (window.MapCanvas?.isDemoMap?.()) {
      this._setStatus(this._t('PLACE_JUMP_STATUS_UNAVAILABLE_HERE'));
      return;
    }

    this.close();
    const ok = await window.MapTravelNavigator?.travelTo?.(row);
    if (!ok) {
      this.open();
      this._setStatus(this._t('PLACE_JUMP_STATUS_FAILED'));
    }
  },
};

window.addEventListener('GGIS_LANG_CHANGED', () => {
  if (window.PlaceJumpUI) {
    window.PlaceJumpUI._applyTexts?.();
    window.PlaceJumpUI._renderSelection?.();
    window.PlaceJumpUI._renderList?.();
  }
  if (window.MapTravelNavigator?._caption) {
    const text = window.I18N?.t?.('TRAVEL_NOW');
    window.MapTravelNavigator._caption.textContent = text && text !== 'I18N_INIT_FAILED' ? text : '';
  }
});

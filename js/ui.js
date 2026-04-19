window.UI = {
  PREF_KEY: 'GGIS_LAYER_PREF_IMAGE_V1',
  ORDER_SCHEMA_VERSION: 4,
  _dragLayerId: '',
  _imageLoadHintHideTimer: 0,
  _imageLoadHintMoveBound: null,

  _t(key) {
    const text = window.I18N?.t?.(key);
    return text && text !== 'I18N_INIT_FAILED' ? text : '';
  },

  renderRoot() {
    const app = document.getElementById('app');
    if (!app) throw new Error('APP_NOT_FOUND');

    app.innerHTML = `
      <div class="gg-root">
        <header class="gg-topbar">
          <div class="gg-topbar-brand">
            <a id="topbarHomeLink" class="gg-topbar-home-link" href="#start">
              <img id="topbarHomeIcon" class="gg-topbar-home-icon" src="./images/icon-64.png" alt="" draggable="false" />
              <span id="appTitle"></span>
            </a>
          </div>
        </header>

        <aside class="gg-left">
          <div class="gg-panel gg-settings-panel">
            <div class="gg-settings-table">
              <div class="gg-settings-item gg-settings-item-button">
                <div class="gg-settings-control gg-settings-control-full">
                  <button id="imageLoadButton" class="gg-action-btn gg-image-load-btn" type="button"></button>
                  <div id="imageLoadHint" class="gg-inline-hint" hidden></div>
                </div>
              </div>
            </div>
          </div>

          <div class="gg-left-layer-slot">
            <div class="gg-panel gg-layer-panel">
              <div id="layerList" class="gg-layer-list"></div>
              <div class="gg-layer-actions">
                <button id="circleToolButton" class="gg-action-btn gg-rune-tool-btn" type="button" aria-haspopup="dialog">
                  <span class="gg-rune-tool-btn-glyph" aria-hidden="true">.</span>
                </button>
                <button id="polylineToolButton" class="gg-action-btn gg-rune-tool-btn" type="button">
                  <span class="gg-rune-tool-btn-glyph" aria-hidden="true">,</span>
                </button>
                <button id="moveRuneButton" class="gg-action-btn gg-rune-jump-btn" type="button" aria-haspopup="dialog">
                  <span class="gg-rune-jump-btn-glyph" aria-hidden="true">s</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main class="gg-center">
          <div id="mapArea"></div>
          <div id="hudArea"></div>
        </main>
      </div>

      <div class="gg-entry-footer">
        <div id="osNotice" class="hidden"></div>
        <div id="resolutionNotice" class="hidden"></div>
      </div>

      <aside id="mapHintCard" class="gg-hint-card">
        <button id="mapHintClose" class="gg-hint-card-close" type="button">X</button>
        <div id="mapHintTitle" class="gg-hint-card-title"></div>
        <div id="mapHintBody" class="gg-hint-card-body"></div>
        <div id="mapHintControls" class="gg-map-tool-panel-controls"></div>
      </aside>

      <a id="homeLink" class="gg-home-link" href="https://www.rq-inn.com/" target="_blank" rel="noopener noreferrer">
        <img id="homeLogo" class="gg-home-logo" src="./images/rq-inn-logo.png" alt="" draggable="false" />
      </a>
    `;

    document.getElementById('imageLoadButton')?.addEventListener('click', (event) => {
      if (window.MapCanvas?.isDemoMap?.()) {
        this.showImageLoadUnavailableHint(event.currentTarget);
        return;
      }
      this.hideImageLoadUnavailableHint();
      window.MapCanvas?.openFilePicker?.();
    });
    document.getElementById('moveRuneButton')?.addEventListener('click', () => {
      window.PlaceJumpUI?.open?.();
    });
    document.getElementById('circleToolButton')?.addEventListener('click', () => {
      window.MapTools?.openCircleDialog?.();
    });
    document.getElementById('polylineToolButton')?.addEventListener('click', () => {
      window.MapTools?.startPolylineMeasure?.();
    });
    document.getElementById('homeLogo')?.addEventListener('dragstart', (event) => {
      event.preventDefault();
    });
    document.getElementById('topbarHomeIcon')?.addEventListener('dragstart', (event) => {
      event.preventDefault();
    });
    document.getElementById('topbarHomeLink')?.addEventListener('click', (event) => {
      event.preventDefault();
      window.IntroFlow?.init?.();
    });
    this.syncImageLoadState();
    this.renderTexts();
    window.dispatchEvent(new CustomEvent('GGIS_UI_ROOT_RENDERED'));
  },

  renderTexts() {
    const setText = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = this._t(key);
    };

    setText('appTitle', 'APP_TITLE');
    setText('imageLoadButton', 'IMAGE_LOAD_BUTTON');

    const moveRuneButton = document.getElementById('moveRuneButton');
    if (moveRuneButton) {
      const label = this._t('PLACE_JUMP_BUTTON');
      moveRuneButton.setAttribute('aria-label', label);
      moveRuneButton.title = label;
    }

    const setButtonLabel = (id, label) => {
      const button = document.getElementById(id);
      if (!button) return;
      button.setAttribute('aria-label', label);
      button.title = label;
    };

    setButtonLabel('circleToolButton', this._t('CIRCLE_TOOL_BUTTON') || 'Concentric circles');
    setButtonLabel('polylineToolButton', this._t('POLYLINE_TOOL_BUTTON') || 'Polyline measure');

    const hintCard = document.getElementById('mapHintCard');
    const hintClose = document.getElementById('mapHintClose');
    if (hintCard) {
      hintCard.setAttribute('aria-label', this._t('MAP_HINT_ARIA_LABEL'));
    }
    if (hintClose) {
      const closeLabel = this._t('HINT_CLOSE_ARIA_LABEL');
      hintClose.setAttribute('aria-label', closeLabel);
      hintClose.title = closeLabel;
    }

    const title = this._t('APP_TITLE');
    if (title) document.title = title;

    const homeLink = document.getElementById('homeLink');
    const topbarHomeLink = document.getElementById('topbarHomeLink');
    const homeLogo = document.getElementById('homeLogo');
    const topbarHomeIcon = document.getElementById('topbarHomeIcon');
    const homeLabel = this._t('HOME_LINK_LABEL');
    if (homeLink) {
      homeLink.setAttribute('aria-label', homeLabel);
      homeLink.title = homeLabel;
    }
    if (topbarHomeLink) {
      const startLabel = this._t('RETURN_TOP') || this._t('APP_TITLE');
      topbarHomeLink.setAttribute('aria-label', startLabel);
      topbarHomeLink.title = startLabel;
    }
    if (homeLogo) {
      homeLogo.alt = homeLabel;
    }
    if (topbarHomeIcon) {
      topbarHomeIcon.alt = '';
    }

    this.renderLayerList();
    this.syncImageLoadState();
  },

  syncImageLoadState() {
    const button = document.getElementById('imageLoadButton');
    if (!button) return;
    button.classList.toggle('is-primary', !window.MapCanvas?.hasImages?.());
    button.classList.toggle('is-demo-disabled', !!window.MapCanvas?.isDemoMap?.());
    button.setAttribute('aria-disabled', window.MapCanvas?.isDemoMap?.() ? 'true' : 'false');
    if (!window.MapCanvas?.isDemoMap?.()) {
      this.hideImageLoadUnavailableHint();
    }
  },

  showImageLoadUnavailableHint(anchorEl) {
    const hint = document.getElementById('imageLoadHint');
    if (!(hint instanceof HTMLElement) || !(anchorEl instanceof HTMLElement)) return;

    hint.textContent = this._t('PLACE_JUMP_STATUS_UNAVAILABLE_HERE') || 'This cannot be used here.';
    hint.hidden = false;

    const anchorRect = anchorEl.getBoundingClientRect();
    const parentRect = anchorEl.parentElement?.getBoundingClientRect?.() || anchorRect;
    hint.style.left = `${Math.max(8, (anchorRect.left - parentRect.left) + (anchorRect.width / 2))}px`;
    hint.style.top = `${Math.max(8, anchorRect.bottom - parentRect.top + 8)}px`;

    if (this._imageLoadHintHideTimer) {
      clearTimeout(this._imageLoadHintHideTimer);
      this._imageLoadHintHideTimer = 0;
    }
    if (this._imageLoadHintMoveBound) {
      window.removeEventListener('pointermove', this._imageLoadHintMoveBound);
    }

    this._imageLoadHintMoveBound = () => {
      if (this._imageLoadHintMoveBound) {
        window.removeEventListener('pointermove', this._imageLoadHintMoveBound);
      }
      this._imageLoadHintMoveBound = null;
      this._imageLoadHintHideTimer = window.setTimeout(() => {
        this.hideImageLoadUnavailableHint();
      }, 1000);
    };

    window.addEventListener('pointermove', this._imageLoadHintMoveBound, { passive: true });
  },

  hideImageLoadUnavailableHint() {
    const hint = document.getElementById('imageLoadHint');
    if (hint instanceof HTMLElement) {
      hint.hidden = true;
    }
    if (this._imageLoadHintHideTimer) {
      clearTimeout(this._imageLoadHintHideTimer);
      this._imageLoadHintHideTimer = 0;
    }
    if (this._imageLoadHintMoveBound) {
      window.removeEventListener('pointermove', this._imageLoadHintMoveBound);
      this._imageLoadHintMoveBound = null;
    }
  },

  _prefLoad_() {
    try {
      const prefs = JSON.parse(localStorage.getItem(this.PREF_KEY) || '{}');
      return prefs && typeof prefs === 'object' ? prefs : {};
    } catch {
      return {};
    }
  },

  _prefSave_(prefs) {
    localStorage.setItem(this.PREF_KEY, JSON.stringify(prefs));
  },

  _savePrefs_() {
    if (!window.MapCanvas?.getCurrentMapsetName || !window.MapCanvas?.getLayerList) return;

    const mapset = window.MapCanvas.getCurrentMapsetName();
    if (!mapset) return;

    const prefs = this._prefLoad_();
    const layers = this._getDrawOrderedLayers_();

    prefs[mapset] = {
      orderVersion: this.ORDER_SCHEMA_VERSION,
      order: layers.map((l) => l.id),
      visible: Object.fromEntries(layers.map((l) => [l.id, l.visible])),
      opacity: Object.fromEntries(layers.map((l) => [l.id, l.opacity])),
    };

    this._prefSave_(prefs);
  },

  _formatLayerName_(file) {
    const raw = String(file || '').trim().replace(/\\/g, '/');
    if (!raw) return '';
    if (raw === 'Runes') return this._t('LAYER_RUNES') || 'Runes';
    const base = raw.split('/').pop() || raw;
    return base.replace(/\.[^.]+$/, '');
  },

  _isSavedOrderValid_(savedOrder, currentOrderIds) {
    if (!Array.isArray(savedOrder) || !Array.isArray(currentOrderIds)) return false;
    if (savedOrder.length !== currentOrderIds.length) return false;

    const currentSet = new Set(currentOrderIds);
    if (currentSet.size !== currentOrderIds.length) return false;

    const savedSet = new Set(savedOrder);
    if (savedSet.size !== savedOrder.length) return false;

    for (const id of savedOrder) {
      if (!currentSet.has(id)) return false;
    }

    return true;
  },

  _normalizeLayerPrefs_(prefs, mapset, layerIds) {
    const p = prefs?.[mapset];
    if (!p || !Array.isArray(layerIds) || !layerIds.length) return false;

    let changed = false;
    const savedOrderValid = this._isSavedOrderValid_(p.order, layerIds);

    if (!savedOrderValid) {
      p.order = layerIds.slice();
      changed = true;
    }

    if (Number(p.orderVersion || 0) !== this.ORDER_SCHEMA_VERSION) {
      p.orderVersion = this.ORDER_SCHEMA_VERSION;
      changed = true;
    }

    if (p.visible && typeof p.visible === 'object') {
      const nextVisible = {};
      for (const id of layerIds) {
        if (id in p.visible) nextVisible[id] = p.visible[id];
      }
      if (Object.keys(nextVisible).length !== Object.keys(p.visible).length) {
        p.visible = nextVisible;
        changed = true;
      }
    }

    if (p.opacity && typeof p.opacity === 'object') {
      const nextOpacity = {};
      for (const id of layerIds) {
        if (id in p.opacity) nextOpacity[id] = p.opacity[id];
      }
      if (Object.keys(nextOpacity).length !== Object.keys(p.opacity).length) {
        p.opacity = nextOpacity;
        changed = true;
      }
    }

    if (changed) {
      prefs[mapset] = p;
      this._prefSave_(prefs);
    }

    return changed;
  },

  _panelOrderFromDrawOrder_(drawOrderIds) {
    return Array.isArray(drawOrderIds) ? drawOrderIds.slice().reverse() : [];
  },

  _drawOrderFromPanelOrder_(panelOrderIds) {
    return Array.isArray(panelOrderIds) ? panelOrderIds.slice().reverse() : [];
  },

  _getDrawOrderedLayers_() {
    if (!window.MapCanvas?.getLayerList) return [];
    return window.MapCanvas.getLayerList().slice().sort((a, b) => a.zIndex - b.zIndex);
  },

  _saveOrderPrefs_(drawOrderIds, layers = null) {
    if (!window.MapCanvas?.getCurrentMapsetName) return;

    const mapset = window.MapCanvas.getCurrentMapsetName();
    if (!mapset) return;

    const normalizedOrder = Array.isArray(drawOrderIds) ? drawOrderIds.slice() : [];
    const currentLayers = Array.isArray(layers) && layers.length ? layers.slice() : this._getDrawOrderedLayers_();
    const layerMap = new Map(currentLayers.map((l) => [l.id, l]));
    const orderedLayers = normalizedOrder.map((id) => layerMap.get(id)).filter(Boolean);
    if (!orderedLayers.length) return;

    const prefs = this._prefLoad_();
    prefs[mapset] = {
      orderVersion: this.ORDER_SCHEMA_VERSION,
      order: orderedLayers.map((l) => l.id),
      visible: Object.fromEntries(orderedLayers.map((l) => [l.id, l.visible])),
      opacity: Object.fromEntries(orderedLayers.map((l) => [l.id, l.opacity])),
    };
    this._prefSave_(prefs);
  },

  _applyPanelOrder_(panelOrderIds) {
    if (!window.MapCanvas?.reorderLayers) return false;

    const drawOrderIds = this._drawOrderFromPanelOrder_(panelOrderIds);
    const layers = this._getDrawOrderedLayers_();
    this._saveOrderPrefs_(drawOrderIds, layers);

    const reordered = window.MapCanvas.reorderLayers(drawOrderIds);
    if (!reordered) {
      this._savePrefs_();
      return false;
    }

    return true;
  },

  _isLayerDragHandle_(target) {
    if (!(target instanceof Element)) return false;
    return !target.closest('button, input, select, textarea, label, a');
  },

  _clearLayerDropMarkers_(listEl) {
    listEl?.querySelectorAll?.('.gg-layer-row.is-drop-before, .gg-layer-row.is-drop-after')
      ?.forEach((row) => {
        row.classList.remove('is-drop-before', 'is-drop-after');
      });
  },

  _getLayerDropIndex_(listEl, clientY) {
    const rows = Array.from(listEl?.querySelectorAll?.('.gg-layer-row') || []);
    if (!rows.length) return -1;

    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }

    return rows.length;
  },

  _markLayerDropIndex_(listEl, dropIndex) {
    const rows = Array.from(listEl?.querySelectorAll?.('.gg-layer-row') || []);
    this._clearLayerDropMarkers_(listEl);
    if (!rows.length || dropIndex < 0) return;

    if (dropIndex >= rows.length) {
      rows[rows.length - 1].classList.add('is-drop-after');
      return;
    }

    rows[dropIndex].classList.add('is-drop-before');
  },

  renderLayerList() {
    const listEl = document.getElementById('layerList');
    const hasGetLayerList = !!window.MapCanvas?.getLayerList;
    const hasGetCurrentMapsetName = !!window.MapCanvas?.getCurrentMapsetName;
    if (!listEl || !hasGetLayerList || !hasGetCurrentMapsetName) return;

    listEl.innerHTML = '';

    let layers = this._getDrawOrderedLayers_();
    if (!layers.length) {
      const placeholder = document.createElement('div');
      placeholder.className = 'gg-layer-placeholder';
      placeholder.textContent = this._t('LAYER_LIST_EMPTY');
      listEl.appendChild(placeholder);
      return;
    }

    let orderIds = layers.map((l) => l.id);
    const prefs = this._prefLoad_();
    const mapset = window.MapCanvas.getCurrentMapsetName();

    if (prefs[mapset]) {
      const p = prefs[mapset];
      const savedOrderValid = this._isSavedOrderValid_(p.order, orderIds);
      const canApplySavedOrder = savedOrderValid && window.MapCanvas?.reorderLayers;

      if (Array.isArray(p.order) && !savedOrderValid) {
        this._normalizeLayerPrefs_(prefs, mapset, orderIds);
      }

      if (canApplySavedOrder) {
        const sameOrder = p.order.length === orderIds.length && p.order.every((id, idx) => id === orderIds[idx]);
        if (!sameOrder) {
          const reorderResult = window.MapCanvas.reorderLayers(p.order);
          if (reorderResult) {
            this.renderLayerList();
            return;
          }
          this._normalizeLayerPrefs_(prefs, mapset, orderIds);
        } else {
          orderIds = p.order.slice();
        }
      }

      for (const l of layers) {
        if (p.visible && l.id in p.visible) window.MapCanvas.setLayerVisible?.(l.id, p.visible[l.id]);
        if (p.opacity && l.id in p.opacity) window.MapCanvas.setLayerOpacity?.(l.id, p.opacity[l.id]);
      }
    }

    const panelOrderIds = this._panelOrderFromDrawOrder_(orderIds);
    const layerById = new Map(layers.map((l) => [l.id, l]));
    const displayLayers = panelOrderIds.map((id) => layerById.get(id)).filter(Boolean);

    listEl.ondragover = (event) => {
      const draggedId = this._dragLayerId || event.dataTransfer?.getData('text/plain');
      if (!draggedId) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      this._markLayerDropIndex_(listEl, this._getLayerDropIndex_(listEl, event.clientY));
    };

    listEl.ondragleave = (event) => {
      if (listEl.contains(event.relatedTarget)) return;
      this._clearLayerDropMarkers_(listEl);
    };

    listEl.ondrop = (event) => {
      const draggedId = this._dragLayerId || event.dataTransfer?.getData('text/plain');
      if (!draggedId) return;
      event.preventDefault();

      const nextOrder = panelOrderIds.filter((id) => id !== draggedId);
      const originalIndex = panelOrderIds.indexOf(draggedId);
      let dropIndex = this._getLayerDropIndex_(listEl, event.clientY);
      if (dropIndex < 0) return;
      if (originalIndex >= 0 && originalIndex < dropIndex) dropIndex -= 1;
      nextOrder.splice(Math.min(dropIndex, nextOrder.length), 0, draggedId);
      this._dragLayerId = '';
      this._clearLayerDropMarkers_(listEl);
      if (this._applyPanelOrder_(nextOrder)) this.renderLayerList();
    };

    for (const l of displayLayers) {
      const row = document.createElement('div');
      row.className = 'gg-layer-row';
      row.dataset.layerId = l.id;
      row.draggable = true;

      row.addEventListener('mousedown', (event) => {
        row.draggable = this._isLayerDragHandle_(event.target);
      });

      row.addEventListener('dragstart', (event) => {
        if (!this._isLayerDragHandle_(event.target)) {
          event.preventDefault();
          return;
        }
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', l.id);
        }
        this._dragLayerId = l.id;
        row.classList.add('is-dragging');
      });

      row.addEventListener('dragend', () => {
        row.draggable = true;
        this._dragLayerId = '';
        row.classList.remove('is-dragging');
        this._clearLayerDropMarkers_(listEl);
      });

      row.addEventListener('dragover', (event) => {
        const draggedId = this._dragLayerId || event.dataTransfer?.getData('text/plain');
        if (!draggedId || draggedId === l.id) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        this._markLayerDropIndex_(listEl, this._getLayerDropIndex_(listEl, event.clientY));
      });

      row.addEventListener('dragleave', (event) => {
        if (row.contains(event.relatedTarget)) return;
        row.classList.remove('is-drop-before', 'is-drop-after');
      });

      row.addEventListener('drop', (event) => {
        const draggedId = this._dragLayerId || event.dataTransfer?.getData('text/plain');
        if (!draggedId) return;
        event.preventDefault();
        event.stopPropagation();

        const nextOrder = panelOrderIds.filter((id) => id !== draggedId);
        const originalIndex = panelOrderIds.indexOf(draggedId);
        let dropIndex = this._getLayerDropIndex_(listEl, event.clientY);
        if (dropIndex < 0) return;
        if (originalIndex >= 0 && originalIndex < dropIndex) dropIndex -= 1;
        nextOrder.splice(Math.min(dropIndex, nextOrder.length), 0, draggedId);
        this._dragLayerId = '';
        this._clearLayerDropMarkers_(listEl);
        if (this._applyPanelOrder_(nextOrder)) this.renderLayerList();
      });

      const topLine = document.createElement('div');
      topLine.className = 'gg-layer-row-top';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!l.visible;
      cb.addEventListener('change', () => {
        window.MapCanvas.setLayerVisible?.(l.id, cb.checked);
        this._savePrefs_();
      });

      const name = document.createElement('div');
      name.className = 'gg-layer-name';
      name.textContent = this._formatLayerName_(l.file);

      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.className = 'gg-layer-order-btn';
      upBtn.textContent = '\u2191';

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.className = 'gg-layer-order-btn';
      downBtn.textContent = '\u2193';

      const idx = panelOrderIds.indexOf(l.id);
      upBtn.disabled = idx <= 0;
      downBtn.disabled = idx === -1 || idx >= panelOrderIds.length - 1;

      upBtn.onclick = () => {
        const i = panelOrderIds.indexOf(l.id);
        if (i <= 0) return;
        [panelOrderIds[i - 1], panelOrderIds[i]] = [panelOrderIds[i], panelOrderIds[i - 1]];
        if (this._applyPanelOrder_(panelOrderIds)) this.renderLayerList();
      };

      downBtn.onclick = () => {
        const i = panelOrderIds.indexOf(l.id);
        if (i < 0 || i >= panelOrderIds.length - 1) return;
        [panelOrderIds[i + 1], panelOrderIds[i]] = [panelOrderIds[i], panelOrderIds[i + 1]];
        if (this._applyPanelOrder_(panelOrderIds)) this.renderLayerList();
      };

      topLine.appendChild(cb);
      topLine.appendChild(name);
      topLine.appendChild(upBtn);
      topLine.appendChild(downBtn);

      const opLine = document.createElement('div');
      opLine.className = 'gg-layer-opacity';

      const range = document.createElement('input');
      range.type = 'range';
      range.min = '0';
      range.max = '100';
      range.value = String(l.opacity);

      const val = document.createElement('div');
      val.className = 'gg-layer-opacity-value';
      val.textContent = String(l.opacity);

      const applyOpacity = () => {
        const v = Number(range.value);
        window.MapCanvas.setLayerOpacity?.(l.id, v);
        val.textContent = String(v);
        this._savePrefs_();
      };

      range.addEventListener('input', applyOpacity);
      range.addEventListener('change', applyOpacity);

      opLine.appendChild(range);
      opLine.appendChild(val);

      row.appendChild(topLine);
      row.appendChild(opLine);
      listEl.appendChild(row);
    }
  },
};

window.addEventListener('GGIS_LAYERLIST_CHANGED', () => {
  window.UI?.renderLayerList?.();
});

window.addEventListener('GGIS_LANG_CHANGED', () => {
  window.UI?.renderTexts?.();
});

window.addEventListener('GGIS_IMAGE_STATE_CHANGED', () => {
  window.UI?.syncImageLoadState?.();
  window.UI?.renderLayerList?.();
});

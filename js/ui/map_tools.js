window.MapTools = {
  mode: 'idle',
  circles: [],
  polylineMarkers: [],
  pin: null,
  circleDraft: { unitMode: 'radius', kmValue: 100 },
  animation: null,
  result: null,
  _svg: null,
  _layer: null,
  _distanceEl: null,
  _panelEl: null,
  _resultEl: null,
  _drag: null,
  _pinDrag: null,
  _initialPin: null,
  _bound: false,

  init() {
    this._distanceEl = document.getElementById('distanceReadout');
    this._ensurePanel();
    this._ensureResultOverlay();
    this._ensureOverlay();
    this._ensurePin();
    this._render();
    this._renderPanel();
    this._renderDistanceReadout();
    this._renderResultOverlay();

    if (!this._bound) {
      this._bound = true;
      this._bindGlobal();
    }
  },

  _t(key, fallback = '') {
    const text = window.I18N?.t?.(key);
    return text && text !== 'I18N_INIT_FAILED' ? text : fallback;
  },

  _escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  _rune(glyph) {
    return `<span class="gg-tool-inline-rune">${this._escapeHtml(glyph)}</span>`;
  },

  _toolHintLine(glyph, text) {
    return `<p>${this._rune(glyph)}${this._escapeHtml(text)}</p>`;
  },

  _toolPromptLine(glyph, text) {
    return `<p>${this._rune(glyph)} ${this._escapeHtml(text)}</p>`;
  },

  _bindGlobal() {
    window.addEventListener('GGIS_IMAGE_STATE_CHANGED', () => {
      this._ensureOverlay();
      this._ensurePin();
      this._render();
      this._renderDistanceReadout();
      this._renderResultOverlay();
    });

    window.addEventListener('GGIS_LANG_CHANGED', () => {
      this._renderPanel();
      this._renderDistanceReadout();
      this._renderResultOverlay();
    });

    window.addEventListener('resize', () => {
      this._ensureOverlay();
      this._positionPanelAtMapTopLeft();
      this._render();
      this._renderDistanceReadout();
      this._renderResultOverlay();
    });

    window.addEventListener('pointerdown', (event) => {
      if (!this.result?.persist) return;
      if (event.target instanceof Element && event.target.closest('#mapHintCard')) return;
      this._clearResult();
      this.resetMode(true);
    });
  },

  _getMetrics() {
    return window.GGISHexMetrics?.getFromHexLayer?.() || window.GGISHexMetrics?.get?.() || null;
  },

  _distanceKm(a, b) {
    const metrics = this._getMetrics();
    if (!metrics) return 0;
    return metrics.kmFromPixels(Math.hypot(b.x - a.x, b.y - a.y));
  },

  _toDisplayCoords(point) {
    const src = point || window.MapCanvas?.getCenterMapPoint?.() || { x: 0, y: 0 };
    const origin = this._ensurePin?.() || { x: 0, y: 0 };
    const metrics = this._getMetrics();
    const toDistance = (value) => {
      const num = Number(value) || 0;
      if (!metrics?.kmFromPixels) return num;
      const sign = num < 0 ? -1 : 1;
      return metrics.kmFromPixels(Math.abs(num)) * sign;
    };
    const relX = toDistance((Number(src.y) || 0) - (Number(origin.y) || 0));
    const relY = toDistance((Number(src.x) || 0) - (Number(origin.x) || 0));
    return {
      x: this._formatRelativeCoord(relX),
      y: this._formatRelativeCoord(relY),
    };
  },

  _formatRelativeCoord(value) {
    const num = Number(value) || 0;
    const rounded = Math.round(num * 10) / 10;
    return Object.is(rounded, -0) ? '0.0' : rounded.toFixed(1);
  },

  _formatKm(value) {
    const num = Number(value) || 0;
    return `${num.toFixed(num >= 100 ? 0 : 1)} km`;
  },

  _renderDistanceReadout() {
    if (!this._distanceEl) return;
    const isOpening = document.body.classList.contains('gg-opening-active');
    const hasViewport = !!document.getElementById('mapViewport');
    if (isOpening || !hasViewport) {
      this._distanceEl.hidden = true;
      this._distanceEl.innerHTML = '';
      return;
    }

    const display = this._toDisplayCoords();
    this._distanceEl.hidden = false;
    this._distanceEl.innerHTML = `<div class="gg-distance-readout-coords">${this._escapeHtml(this._t('COORD_X', 'X'))}: ${display.x}  ${this._escapeHtml(this._t('COORD_Y', 'Y'))}: ${display.y}</div>`;
  },

  _ensurePanel() {
    if (this._panelEl && document.body.contains(this._panelEl)) return this._panelEl;
    const panel = document.getElementById('mapHintCard');
    if (!(panel instanceof HTMLElement)) return null;

    panel.classList.add('gg-map-tool-panel');
    this._panelEl = panel;
    this._positionPanelAtMapTopLeft();

    panel.querySelector('#mapHintClose')?.addEventListener('click', () => {
      panel.hidden = true;
    });

    this._makePanelDraggable(panel);
    return panel;
  },

  _positionPanelAtMapTopLeft() {
    const panel = this._panelEl;
    const mapArea = document.getElementById('mapArea');
    if (!(panel instanceof HTMLElement) || !(mapArea instanceof HTMLElement)) return;
    if (panel.dataset.userMoved === 'true') return;
    const rect = mapArea.getBoundingClientRect();
    panel.style.setProperty('--gg-map-tool-panel-left', `${Math.max(12, rect.left)}px`);
    panel.style.setProperty('--gg-map-tool-panel-top', `${Math.max(12, rect.top)}px`);
  },

  _makePanelDraggable(panel) {
    let drag = null;

    const onMove = (event) => {
      if (!drag) return;
      panel.style.left = `${Math.max(12, drag.left + (event.clientX - drag.x))}px`;
      panel.style.top = `${Math.max(96, drag.top + (event.clientY - drag.y))}px`;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.transform = 'none';
      panel.dataset.userMoved = 'true';
    };

    const onUp = () => {
      if (!drag) return;
      drag = null;
      panel.classList.remove('is-dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    panel.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest('.gg-hint-card-close, .gg-map-tool-panel-controls')) return;
      const rect = panel.getBoundingClientRect();
      drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      panel.style.left = `${rect.left}px`;
      panel.style.top = `${rect.top}px`;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.transform = 'none';
      panel.dataset.userMoved = 'true';
      panel.classList.add('is-dragging');
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    });
  },

  _renderPanel() {
    if (!this._panelEl) return;
    const title = this._panelEl.querySelector('#mapHintTitle');
    const body = this._panelEl.querySelector('#mapHintBody');
    const controls = this._panelEl.querySelector('#mapHintControls');
    const close = this._panelEl.querySelector('#mapHintClose');
    if (!title || !body || !controls || !close) return;

    close.setAttribute('aria-label', this._t('CLOSE', 'Close'));
    this._panelEl.hidden = false;
    controls.innerHTML = '';

    if (this.mode === 'circle_config') {
      title.textContent = this._t('CIRCLE_TOOL_BUTTON', '同心円');
      body.innerHTML = `<p>${this._escapeHtml(this._t('CIRCLE_PANEL_HINT', '半径か直径を選び、km を入力して決定してください。'))}</p>`;
      controls.innerHTML = `
        <div class="gg-map-tool-dialog-row">
          <button type="button" class="gg-map-tool-toggle ${this.circleDraft.unitMode === 'radius' ? 'is-active' : ''}" data-circle-unit="radius">${this._escapeHtml(this._t('CIRCLE_RADIUS', '半径'))}</button>
          <button type="button" class="gg-map-tool-toggle ${this.circleDraft.unitMode === 'diameter' ? 'is-active' : ''}" data-circle-unit="diameter">${this._escapeHtml(this._t('CIRCLE_DIAMETER', '直径'))}</button>
        </div>
        <label class="gg-map-tool-dialog-label" for="circleToolKmInput">${this._escapeHtml(this._t('DISTANCE_LABEL', '距離'))}</label>
        <div class="gg-map-tool-dialog-input-row">
          <input id="circleToolKmInput" class="gg-map-tool-input" type="number" min="0.1" step="0.1" value="${this.circleDraft.kmValue}" />
          <span class="gg-map-tool-unit">km</span>
        </div>
        <div class="gg-map-tool-dialog-actions">
          <button id="mapToolPanelApply" class="gg-map-tool-button" type="button">${this._escapeHtml(this._t('APPLY_BUTTON', '決定'))}</button>
          <button id="mapToolPanelCancel" class="gg-map-tool-button is-secondary" type="button">${this._escapeHtml(this._t('CLOSE', '閉じる'))}</button>
        </div>
      `;
    } else if (this.mode === 'polyline') {
      title.textContent = this._t('POLYLINE_TOOL_BUTTON', '折れ線距離測定');
      body.innerHTML = this.polylineMarkers.length >= 2
        ? `<p>${this._escapeHtml(this._t('POLYLINE_READY', '経路を配置しました。計測してください。'))}</p>`
        : this._toolPromptLine(',', this._t('POLYLINE_POINT_PROMPT_SHORT', 'を置いてください。'));
      controls.innerHTML = `
        <div class="gg-map-tool-dialog-actions">
          ${this.polylineMarkers.length >= 2 ? `<button id="mapToolPanelApply" class="gg-map-tool-button" type="button">${this._escapeHtml(this._t('MEASURE_APPLY', '計測する'))}</button>` : ''}
          <button id="mapToolPanelCancel" class="gg-map-tool-button is-secondary" type="button">${this._escapeHtml(this._t('CLOSE', '閉じる'))}</button>
        </div>
      `;
    } else if (this.mode === 'await_circle_center') {
      title.textContent = this._t('CIRCLE_TOOL_BUTTON', '同心円');
      body.innerHTML = `<p>${this._escapeHtml(this._t('CENTER_PICK_PROMPT_SHORT', '中心を指定してください。'))}</p>`;
      controls.innerHTML = `
        <div class="gg-map-tool-dialog-actions">
          <button id="mapToolPanelCancel" class="gg-map-tool-button is-secondary" type="button">${this._escapeHtml(this._t('CLOSE', '閉じる'))}</button>
        </div>
      `;
    } else {
      title.textContent = this._t('TOOL_HINT_TITLE', 'ツール');
      body.innerHTML = `
        <p>${this._escapeHtml(this._t('HINT_ZOOM', 'マウスホイールで拡大縮小します。'))}</p>
        <p>${this._escapeHtml(this._t('HINT_GRAB', '左クリックでつかみます。'))}</p>
        <p>${this._escapeHtml(this._t('HINT_PAN', 'つかんだままドラッグで移動します。'))}</p>
        ${this._toolHintLine('.', this._t('TOOL_HINT_CIRCLE_DETAIL', 'ボタン: 同心円を作成します。'))}
        ${this._toolHintLine(',', this._t('TOOL_HINT_POLYLINE_DETAIL', 'ボタン: 複数点を置いて道のりを測定します。'))}
        ${this._toolHintLine('s', this._t('PLACE_JUMP_HINT', 'ボタン: 地名ジャンプを開きます。'))}
      `;
    }

    controls.querySelectorAll('[data-circle-unit]').forEach((button) => {
      button.addEventListener('click', () => {
        this.circleDraft.unitMode = button.getAttribute('data-circle-unit') === 'diameter' ? 'diameter' : 'radius';
        this._renderPanel();
      });
    });

    controls.querySelector('#mapToolPanelApply')?.addEventListener('click', () => {
      if (this.mode === 'circle_config') {
        const input = controls.querySelector('#circleToolKmInput');
        this.circleDraft.kmValue = Math.max(0.1, Number(input?.value) || 100);
        this.mode = 'await_circle_center';
        this._renderPanel();
        return;
      }
      this._handleApply();
    });

    controls.querySelector('#mapToolPanelCancel')?.addEventListener('click', () => {
      this._clearResult();
      this.resetMode();
    });
  },

  _ensureResultOverlay() {
    if (this._resultEl && document.body.contains(this._resultEl)) return this._resultEl;
    const overlay = document.createElement('div');
    overlay.id = 'mapMeasureOverlay';
    overlay.className = 'gg-map-measure-overlay';
    overlay.hidden = true;
    document.body.appendChild(overlay);
    this._resultEl = overlay;
    return overlay;
  },

  _renderResultOverlay() {
    if (!this._resultEl) return;
    if (!this.result) {
      this._resultEl.hidden = true;
      this._resultEl.innerHTML = '';
      return;
    }

    this._resultEl.hidden = false;
    this._resultEl.innerHTML = `<div class="gg-map-measure-overlay-value">${this._escapeHtml(this._formatKm(this.result.km))}</div>`;
  },

  _showResult(km, persist = false) {
    this.result = { km: Number(km) || 0, persist: !!persist };
    this._renderResultOverlay();
  },

  _clearResult() {
    this.result = null;
    this._renderResultOverlay();
  },

  openCircleDialog() {
    this._clearResult();
    this.mode = 'circle_config';
    this._renderPanel();
  },

  startPolylineMeasure() {
    this._clearResult();
    this.resetMode(false);
    this.mode = 'polyline';
    this._renderPanel();
    this._render();
  },

  resetMode(clearArtifacts = true) {
    this.mode = 'idle';
    this.animation = null;
    if (clearArtifacts) this.polylineMarkers = [];
    this._renderPanel();
    this._render();
    this._renderDistanceReadout();
  },

  _handleApply() {
    if (this.mode === 'polyline' && this.polylineMarkers.length >= 2) {
      this._runPolylineAnimation();
    }
  },

  _ensureOverlay() {
    const viewport = document.getElementById('mapViewport');
    if (!viewport) return null;

    let svg = document.getElementById('mapToolsOverlay');
    if (!(svg instanceof SVGSVGElement)) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'mapToolsOverlay';
      svg.classList.add('gg-map-tools-overlay');
      viewport.appendChild(svg);
      svg.addEventListener('click', (event) => this._handleOverlayClick(event));
      svg.addEventListener('dblclick', (event) => this._handleOverlayDoubleClick(event));
      svg.addEventListener('contextmenu', (event) => this._handleContextMenu(event));
      svg.addEventListener('pointerdown', (event) => this._handlePointerDown(event));
    }

    const width = viewport.clientWidth || 0;
    const height = viewport.clientHeight || 0;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;

    let layer = document.getElementById('mapToolsLayer');
    if (!(layer instanceof SVGGElement)) {
      layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      layer.id = 'mapToolsLayer';
      svg.appendChild(layer);
    }

    this._svg = svg;
    this._layer = layer;
    return svg;
  },

  _getMapPoint(event) {
    return window.MapCanvas?.getMapPointFromClient?.(event.clientX, event.clientY) || null;
  },

  _toScreenPoint(point) {
    const viewport = document.getElementById('mapViewport');
    const zoom = Number(window.MapView?.getZoom?.());
    const offsetX = Number(window.MapView?.offsetX);
    const offsetY = Number(window.MapView?.offsetY);
    if (!viewport || !point || !Number.isFinite(zoom) || zoom <= 0) return null;
    if (!Number.isFinite(offsetX) || !Number.isFinite(offsetY)) return null;
    return {
      x: (Number(point.x) * zoom) + offsetX,
      y: (Number(point.y) * zoom) + offsetY,
      zoom,
    };
  },

  _handleOverlayClick(event) {
    const point = this._getMapPoint(event);
    if (!point) return;

    if (this.mode === 'await_circle_center') {
      const radiusKm = this.circleDraft.unitMode === 'diameter' ? this.circleDraft.kmValue / 2 : this.circleDraft.kmValue;
      this.circles.push({
        id: `circle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        center: { x: point.x, y: point.y },
        radiusKm,
        phase: 'enter',
      });
      this.mode = 'idle';
      this._renderPanel();
      this._render();
      return;
    }

    if (this.mode === 'polyline') {
      this.polylineMarkers.push({ x: point.x, y: point.y });
      this._renderPanel();
      this._render();
    }
  },

  _handleContextMenu(event) {
    const circleTarget = event.target instanceof Element ? event.target.closest('[data-circle-id]') : null;
    if (circleTarget) {
      event.preventDefault();
      const id = circleTarget.getAttribute('data-circle-id');
      const circle = this.circles.find((item) => item.id === id);
      if (!circle) return;
      circle.phase = 'remove';
      this._render();
      window.setTimeout(() => {
        this.circles = this.circles.filter((item) => item.id !== id);
        this._render();
      }, 360);
      return;
    }

    if (this.mode === 'polyline' && this.polylineMarkers.length) {
      event.preventDefault();
      this.polylineMarkers.pop();
      this._renderPanel();
      this._render();
    }
  },

  _handleOverlayDoubleClick(event) {
    const circleTarget = event.target instanceof Element ? event.target.closest('[data-circle-id]') : null;
    if (!circleTarget) return;
    event.preventDefault();
    const id = circleTarget.getAttribute('data-circle-id');
    const circle = this.circles.find((item) => item.id === id);
    if (!circle) return;
    circle.phase = 'remove';
    this._render();
    window.setTimeout(() => {
      this.circles = this.circles.filter((item) => item.id !== id);
      this._render();
    }, 360);
  },

  _handlePointerDown(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || event.button !== 0) return;

    const pinTarget = target.closest('[data-pin-role]');
    if (pinTarget) {
      event.preventDefault();
      this._startPinDrag(event);
      return;
    }

    const circleTarget = target.closest('[data-circle-id]');
    if (!circleTarget) return;
    event.preventDefault();
    const point = this._getMapPoint(event);
    if (!point) return;

    const id = circleTarget.getAttribute('data-circle-id');
    const circle = this.circles.find((item) => item.id === id);
    if (!circle) return;

    this._drag = {
      id,
      start: point,
      center: { x: circle.center.x, y: circle.center.y },
    };

    const onMove = (moveEvent) => {
      if (!this._drag) return;
      const next = this._getMapPoint(moveEvent);
      if (!next) return;
      const current = this.circles.find((item) => item.id === id);
      if (!current) return;
      current.center.x = this._drag.center.x + (next.x - this._drag.start.x);
      current.center.y = this._drag.center.y + (next.y - this._drag.start.y);
      this._render();
    };

    const onUp = () => {
      this._drag = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  },

  _ensurePin() {
    if (this.pin) return this.pin;
    const size = window.MapCanvas?.getReferenceSize?.();
    const initialPin = this.getInitialPinPosition();
    this.pin = {
      x: Number.isFinite(initialPin?.x) ? initialPin.x : (Number(size?.width) ? Number(size.width) / 2 : 4028),
      y: Number.isFinite(initialPin?.y) ? initialPin.y : (Number(size?.height) ? Number(size.height) / 2 : 2829),
      floating: false,
      hover: false,
    };
    return this.pin;
  },

  setInitialPinPosition(position = null) {
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      this._initialPin = null;
      return false;
    }
    this._initialPin = {
      x: Number(position.x),
      y: Number(position.y),
    };
    return true;
  },

  getInitialPinPosition() {
    if (!this._initialPin) return null;
    return {
      x: this._initialPin.x,
      y: this._initialPin.y,
    };
  },

  setPinToMapCenter() {
    const size = window.MapCanvas?.getReferenceSize?.();
    const width = Number(size?.width) || 0;
    const height = Number(size?.height) || 0;
    if (!width || !height) return false;
    this._ensurePin();
    if (!this.pin) return false;
    this.pin.x = width / 2;
    this.pin.y = height / 2;
    this.pin.floating = false;
    this.pin.hover = false;
    return true;
  },

  setPinPosition({ x, y, floating = false, hover = false } = {}) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    this._ensurePin();
    if (!this.pin) return false;
    this.pin.x = x;
    this.pin.y = y;
    this.pin.floating = Boolean(floating);
    this.pin.hover = Boolean(hover);
    this._render();
    return true;
  },

  _startPinDrag(event) {
    this._ensurePin();
    if (!this.pin) return;
    this._stopPinDrag();

    this.pin.floating = true;
    this.pin.hover = true;
    this._updatePinFromClient(event.clientX, event.clientY);
    this._render();

    const onMove = (moveEvent) => {
      this.pin.hover = true;
      this._updatePinFromClient(moveEvent.clientX, moveEvent.clientY);
      this._render();
    };

    const onUp = (upEvent) => {
      this._updatePinFromClient(upEvent.clientX, upEvent.clientY);
      this.pin.floating = false;
      this.pin.hover = false;
      this._render();
      this._stopPinDrag();
    };

    this._pinDrag = { onMove, onUp };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  },

  _stopPinDrag() {
    if (!this._pinDrag) return;
    window.removeEventListener('pointermove', this._pinDrag.onMove);
    window.removeEventListener('pointerup', this._pinDrag.onUp);
    window.removeEventListener('pointercancel', this._pinDrag.onUp);
    this._pinDrag = null;
  },

  _updatePinFromClient(clientX, clientY) {
    const point = window.MapCanvas?.getMapPointFromClient?.(clientX, clientY);
    if (!point || !this.pin) return;
    this.pin.x = point.x;
    this.pin.y = point.y;
    this._renderDistanceReadout();
  },

  _runPolylineAnimation() {
    const points = this.polylineMarkers.map((point) => ({ x: point.x, y: point.y }));
    if (points.length < 2) return;

    const segments = [];
    for (let i = 1; i < points.length; i += 1) {
      const start = points[i - 1];
      const end = points[i];
      const pixels = Math.hypot(end.x - start.x, end.y - start.y);
      segments.push({ start, end, pixels, km: this._distanceKm(start, end) });
    }

    const totalPixels = Math.max(1, segments.reduce((sum, item) => sum + item.pixels, 0));
    const totalKm = segments.reduce((sum, item) => sum + item.km, 0);
    this.animation = {
      type: 'polyline_walk',
      startedAt: performance.now(),
      duration: Math.max(900, totalPixels * 0.7),
      points,
      segments,
      phase: 'walk',
      activePoint: { ...points[0] },
    };
    this._showResult(0, false);

    const tick = (now) => {
      if (!this.animation || this.animation.type !== 'polyline_walk') return;
      const t = Math.min(1, (now - this.animation.startedAt) / this.animation.duration);
      const eased = 1 - Math.pow(1 - t, 2.2);
      let remaining = totalPixels * eased;
      let distanceKm = 0;
      let activePoint = { ...points[0] };

      for (const segment of segments) {
        if (remaining >= segment.pixels) {
          remaining -= segment.pixels;
          distanceKm += segment.km;
          activePoint = { ...segment.end };
          continue;
        }

        const localT = segment.pixels > 0 ? remaining / segment.pixels : 0;
        activePoint = {
          x: segment.start.x + ((segment.end.x - segment.start.x) * localT),
          y: segment.start.y + ((segment.end.y - segment.start.y) * localT),
        };
        distanceKm += segment.km * localT;
        break;
      }

      this.animation.activePoint = activePoint;
      this._showResult(distanceKm, false);
      this._render();

      if (t < 1) {
        requestAnimationFrame(tick);
        return;
      }

      this.animation.phase = 'fade';
      this._showResult(totalKm, true);
      this._render();
      window.setTimeout(() => {
        this.animation = null;
        this.polylineMarkers = [];
        this.mode = 'result';
        this._render();
        this._renderPanel();
      }, 620);
    };

    requestAnimationFrame(tick);
  },

  _render() {
    this._ensureOverlay();
    if (!this._layer) return;
    this._layer.innerHTML = '';
    this._renderPin();
    this._renderCircles();
    this._renderPolyline();
  },

  _renderPin() {
    if (!this.pin || !this._layer) return;
    const screen = this._toScreenPoint(this.pin);
    if (!screen) return;

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('gg-tool-pin');
    if (this.pin.hover) group.classList.add('is-hover');
    group.setAttribute('transform', `translate(${screen.x} ${screen.y})`);

    const pole = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    pole.setAttribute('x1', '0');
    pole.setAttribute('y1', '0');
    pole.setAttribute('x2', '0');
    pole.setAttribute('y2', '-42');
    pole.setAttribute('class', 'gg-tool-pin-pole');
    group.appendChild(pole);

    const flag = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    flag.setAttribute('d', 'M 0 -40 C 10 -45 18 -37 28 -40 L 28 -20 C 18 -16 10 -24 0 -20 Z');
    flag.setAttribute('class', 'gg-tool-pin-flag');
    flag.setAttribute('data-pin-role', 'flag');
    group.appendChild(flag);

    this._layer.appendChild(group);
  },

  _renderCircles() {
    const metrics = this._getMetrics();
    if (!metrics || !this._layer) return;

    this.circles.forEach((circle) => {
      const screen = this._toScreenPoint(circle.center);
      if (!screen) return;
      const radiusPx = metrics.pixelsFromKm(circle.radiusKm) * screen.zoom;

      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.classList.add('gg-tool-circle-group');
      if (circle.phase === 'enter') group.classList.add('is-entering');
      if (circle.phase === 'remove') group.classList.add('is-removing');

      ['.'].forEach((glyph, index) => {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(screen.x));
        text.setAttribute('y', String(screen.y));
        text.setAttribute('class', 'gg-tool-circle-rune');
        text.style.animationDelay = `${index * 110}ms`;
        text.textContent = glyph;
        group.appendChild(text);
      });

      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', String(screen.x));
      ring.setAttribute('cy', String(screen.y));
      ring.setAttribute('r', String(radiusPx));
      ring.setAttribute('class', 'gg-tool-circle-ring');
      ring.setAttribute('data-circle-id', circle.id);
      group.appendChild(ring);

      const center = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      center.setAttribute('x', String(screen.x));
      center.setAttribute('y', String(screen.y));
      center.setAttribute('class', 'gg-tool-circle-center');
      center.setAttribute('data-circle-id', circle.id);
      center.textContent = '.';
      group.appendChild(center);

      this._layer.appendChild(group);
      if (circle.phase === 'enter') circle.phase = 'idle';
    });
  },

  _renderPolyline() {
    const activeAnimation = this.animation?.type === 'polyline_walk' ? this.animation : null;
    const points = activeAnimation ? activeAnimation.points : this.polylineMarkers;
    if (!this._layer || !points.length) return;

    const screenPoints = points.map((point) => this._toScreenPoint(point)).filter(Boolean);
    if (screenPoints.length >= 2) {
      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      polyline.setAttribute('class', 'gg-tool-polyline');
      if (activeAnimation?.phase === 'fade') polyline.classList.add('is-finishing');
      polyline.setAttribute('points', screenPoints.map((point) => `${point.x},${point.y}`).join(' '));
      this._layer.appendChild(polyline);
    }

    screenPoints.forEach((point, index) => {
      if (activeAnimation && index !== 0 && index !== screenPoints.length - 1) return;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(point.x));
      text.setAttribute('y', String(point.y));
      text.setAttribute('class', 'gg-tool-polyline-rune');
      if (activeAnimation?.phase === 'fade') text.classList.add('is-finishing');
      text.textContent = ',';
      this._layer.appendChild(text);
    });

    if (activeAnimation?.activePoint) {
      const activeScreen = this._toScreenPoint(activeAnimation.activePoint);
      if (!activeScreen) return;
      const walker = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      walker.setAttribute('x', String(activeScreen.x));
      walker.setAttribute('y', String(activeScreen.y));
      walker.setAttribute('class', 'gg-tool-walker-rune');
      if (activeAnimation.phase === 'fade') walker.classList.add('is-finishing');
      walker.textContent = 'n';
      this._layer.appendChild(walker);
    }
  },
};

window.addEventListener('GGIS_UI_ROOT_RENDERED', () => {
  window.MapTools?.init?.();
});

window.addEventListener('GGIS_LANG_CHANGED', () => {
  window.MapTools?._renderPanel?.();
  window.MapTools?._renderDistanceReadout?.();
  window.MapTools?._renderResultOverlay?.();
});

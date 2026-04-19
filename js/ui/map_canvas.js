const MAP_AMBIENT_CORE_RUNE_FONT = "'Glorantha Core Runes', serif";
const MAP_AMBIENT_LAYER_ID = 'ambient_runes_layer';
const MAP_AMBIENT_LAYER_NAME = 'Runes';
const MAP_AMBIENT_MOON_SEQUENCE = ['1', '2', '3', '4', '5', '6', '7'];

function clampAmbient(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomAmbient(min, max) {
  return min + Math.random() * (max - min);
}

window.MapCanvas = {
  STORAGE_KEY: '__local_images__',
  _stack: null,
  _layerMeta: [],
  _layerSeq: 0,
  _fileInput: null,
  _viewportEl: null,
  _wrapEl: null,
  _placeholderEl: null,
  _dropOverlayEl: null,
  _dragDepth: 0,
  _objectUrls: [],
  _hasFittedInitialView: false,
  _ambientCanvasEl: null,
  _ambientCtx: null,
  _ambientAnimationFrame: 0,
  _ambientState: null,
  _ambientLastFrameAt: 0,
  _initialFitMode: 'contain',
  _isDemoMap: false,

  async init() {
    const host = document.getElementById('mapArea');
    if (!host) throw new Error('MAPAREA_NOT_FOUND');
    host.innerHTML = '';

    const viewport = document.createElement('div');
    viewport.id = 'mapViewport';
    viewport.className = 'gg-map-viewport';

    const wrap = document.createElement('div');
    wrap.id = 'baseWrap';
    wrap.style.position = 'absolute';
    wrap.style.left = '0';
    wrap.style.top = '0';
    wrap.style.transform = 'translate(0px, 0px) scale(1)';
    wrap.style.transformOrigin = '0 0';
    wrap.style.willChange = 'transform';

    const dropOverlay = document.createElement('div');
    dropOverlay.id = 'mapDropOverlay';
    dropOverlay.className = 'gg-map-drop-overlay';
    dropOverlay.hidden = true;

    let centerMark = document.getElementById('centerMark');
    if (!centerMark) {
      centerMark = document.createElement('div');
      centerMark.id = 'centerMark';
    }
    centerMark.classList.add('gg-center-mark');
    centerMark.style.position = 'absolute';
    centerMark.style.left = '50%';
    centerMark.style.top = '50%';
    centerMark.style.transform = 'translate(-50%, -50%)';
    centerMark.style.pointerEvents = 'none';
    centerMark.style.zIndex = '20';

    viewport.appendChild(wrap);
    viewport.appendChild(dropOverlay);
    viewport.appendChild(centerMark);
    host.appendChild(viewport);

    if (!window.MapView?.init) throw new Error('MAPVIEW_INIT_NOT_FOUND');
    window.MapView.init({ viewportEl: viewport, wrapEl: wrap });

    this._viewportEl = viewport;
    this._wrapEl = wrap;
    this._placeholderEl = null;
    this._dropOverlayEl = dropOverlay;
    this._stack = window.LayerStack?.create ? window.LayerStack.create({ wrapEl: wrap }) : null;
    this._ensureAmbientCanvas_();

    this._installFileInput_();
    this._installDragAndDrop_(host, viewport);
    this._applyEmptyState_();

    window.addEventListener('beforeunload', () => {
      this._stopAmbientAnimation_();
      this._revokeObjectUrls_();
    });

    window.addEventListener('GGIS_LANG_CHANGED', () => {
      this._applyEmptyState_();
      this._updateDropOverlayText_();
    });
  },

  _installFileInput_() {
    if (this._fileInput) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.hidden = true;
    input.addEventListener('change', async () => {
      const files = Array.from(input.files || []);
      input.value = '';
      if (!files.length) return;
      await this.addImagesFromFiles(files);
    });

    document.body.appendChild(input);
    this._fileInput = input;
  },

  _installDragAndDrop_(host, viewport) {
    const showOverlay = () => {
      this._dragDepth += 1;
      this._updateDropOverlayText_();
      if (this._dropOverlayEl) this._dropOverlayEl.hidden = false;
      host.classList.add('is-dragover');
    };

    const hideOverlay = () => {
      this._dragDepth = 0;
      if (this._dropOverlayEl) this._dropOverlayEl.hidden = true;
      host.classList.remove('is-dragover');
    };

    const isExternalFileDrag = (event) => {
      const transfer = event.dataTransfer;
      const types = Array.from(transfer?.types || []);
      if (!types.includes('Files')) return false;
      if (types.includes('text/html') || types.includes('text/uri-list')) return false;
      const items = Array.from(transfer?.items || []);
      return !items.length || items.some((item) => item.kind === 'file');
    };

    viewport.addEventListener('dragenter', (event) => {
      if (!isExternalFileDrag(event)) return;
      event.preventDefault();
      showOverlay();
    });

    viewport.addEventListener('dragover', (event) => {
      if (!isExternalFileDrag(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      if (this._dropOverlayEl?.hidden) showOverlay();
    });

    viewport.addEventListener('dragleave', (event) => {
      if (!isExternalFileDrag(event)) return;
      event.preventDefault();
      this._dragDepth = Math.max(0, this._dragDepth - 1);
      if (this._dragDepth === 0) hideOverlay();
    });

    viewport.addEventListener('drop', async (event) => {
      if (!isExternalFileDrag(event)) return;
      event.preventDefault();
      hideOverlay();
      const files = Array.from(event.dataTransfer?.files || []).filter((file) => file instanceof File);
      if (!files.length) return;
      await this.addImagesFromFiles(files);
    });
  },

  _updateDropOverlayText_() {
    if (!this._dropOverlayEl) return;
    this._dropOverlayEl.textContent = this._t('DND_PROMPT', 'Drag image here');
  },

  openFilePicker() {
    this._fileInput?.click?.();
  },

  async addImagesFromFiles(files) {
    const list = Array.isArray(files) ? files.filter((file) => file instanceof File) : [];
    if (!list.length) return false;
    this.setDemoMapMode(false);

    const shouldFit = !this._hasFittedInitialView;
    let fitAssigned = false;

    for (const file of list) {
      const meta = this._appendImageLayer_(file);
      if (!meta) continue;
      const syncSize = () => {
        this._applyReferenceSizeToImage_(meta.el);
        this._ensurePngGuideLayers_();
        this._ensureAmbientScene_();
      };
      meta.el.addEventListener('load', syncSize, { once: true });
      if (meta.el.complete && meta.el.naturalWidth > 0 && meta.el.naturalHeight > 0) {
        syncSize();
      }
      if (shouldFit && !fitAssigned) {
        this._fitWhenReady_(meta.el);
        fitAssigned = true;
      }
    }
    this._applyEmptyState_();
    this._emitLayerListChanged_();
    this._emitImageStateChanged_();
    return true;
  },

  addCanvasLayer({ name = 'canvas', width, height, draw, fit = true, fitMode = 'contain' } = {}) {
    const canvasWidth = Math.max(1, Math.round(Number(width) || 0));
    const canvasHeight = Math.max(1, Math.round(Number(height) || 0));
    if (!canvasWidth || !canvasHeight) return null;

    const id = `canvas_layer_${++this._layerSeq}`;
    const zIndex = this._layerMeta.length + 1;
    const canvas = this._stack?.addCanvasLayer
      ? this._stack.addCanvasLayer({ id, zIndex })
      : document.createElement('canvas');

    if (!canvas.parentNode) this._wrapEl?.appendChild(canvas);

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.transform = 'none';
    canvas.style.userSelect = 'none';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = String(zIndex);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (typeof draw === 'function') {
      draw(ctx, canvasWidth, canvasHeight, canvas);
    }

    const meta = {
      id,
      file: String(name || id),
      src: '',
      zIndex,
      kind: 'canvas',
      visible: true,
      opacity: 100,
      draw,
      el: canvas,
    };

    this._layerMeta.push(meta);
    this._placeNewLayerRelativeToAmbient_(meta);

    if (fit && !this._hasFittedInitialView) {
      this._fitToSize_(canvasWidth, canvasHeight, fitMode);
      this._hasFittedInitialView = true;
    }

    this._applyEmptyState_();
    this._emitLayerListChanged_();
    this._emitImageStateChanged_();
    return meta;
  },

  redrawCanvasLayers() {
    for (const meta of this._layerMeta) {
      if (meta?.kind !== 'canvas') continue;
      const canvas = meta.el;
      if (!(canvas instanceof HTMLCanvasElement)) continue;
      const ctx = canvas.getContext('2d');
      if (!ctx || typeof meta.draw !== 'function') continue;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      meta.draw(ctx, canvas.width, canvas.height, canvas);
    }
  },

  _findLayerMetaByFile_(fileName) {
    const target = String(fileName || '').trim();
    if (!target) return null;
    return this._layerMeta.find((meta) => String(meta?.file || '').trim() === target) || null;
  },

  _ensurePngGuideLayers_() {
    const reference = this._getReferenceSize_();
    if (!reference?.width || !reference?.height) return;

    const drawers = window.GGISDrawers || {};
    const guideDefs = [
      { name: 'Squ_Grid', draw: drawers.drawDemoGrid },
      { name: 'Hex_Grid', draw: drawers.drawDemoHexGrid },
    ];

    guideDefs.forEach((def) => {
      if (typeof def.draw !== 'function') return;

      const existing = this._findLayerMetaByFile_(def.name);
      if (existing?.kind === 'canvas' && existing.el instanceof HTMLCanvasElement) {
        existing.el.width = reference.width;
        existing.el.height = reference.height;
        if (typeof existing.draw === 'function') {
          const ctx = existing.el.getContext('2d');
          if (ctx) existing.draw(ctx, reference.width, reference.height, existing.el);
        }
        this._ensureAmbientScene_();
        return;
      }

      const layer = this.addCanvasLayer({
        name: def.name,
        width: reference.width,
        height: reference.height,
        draw: def.draw,
        fit: false,
      });
      if (layer?.id) {
        this.setLayerVisible(layer.id, false);
      }
    });
    this._ensureAmbientScene_();
  },

  _appendImageLayer_(file) {
    const objectUrl = URL.createObjectURL(file);
    this._objectUrls.push(objectUrl);

    const id = `image_layer_${++this._layerSeq}`;
    const fileName = String(file.name || id);
    const zIndex = this._layerMeta.length + 1;
    const img = this._stack?.addImageLayer
      ? this._stack.addImageLayer({ id, src: objectUrl, alt: fileName, zIndex })
      : this._createStandaloneImage_(id, objectUrl, fileName, zIndex);

    img.addEventListener('error', () => {
      console.warn('[MapCanvas] layer image load failed:', fileName);
      this._hudMessage_('IMAGE_LOAD_FAILED', fileName);
      img.style.display = 'none';
    });

    const meta = {
      id,
      file: fileName,
      src: objectUrl,
      zIndex,
      kind: 'image',
      visible: true,
      opacity: 100,
      el: img,
    };

    this._layerMeta.push(meta);
    this._placeNewLayerRelativeToAmbient_(meta);
    return meta;
  },

  addImageLayerFromUrl({ src, name = 'image', fit = true, fitMode = 'contain', demo = false } = {}) {
    const url = String(src || '').trim();
    if (!url) return null;
    this.setDemoMapMode(!!demo);

    const id = `image_layer_${++this._layerSeq}`;
    const fileName = String(name || id);
    const zIndex = this._layerMeta.length + 1;
    const img = this._stack?.addImageLayer
      ? this._stack.addImageLayer({ id, src: url, alt: fileName, zIndex })
      : this._createStandaloneImage_(id, url, fileName, zIndex);

    img.addEventListener('error', () => {
      console.warn('[MapCanvas] layer image load failed:', fileName);
      this._hudMessage_('IMAGE_LOAD_FAILED', fileName);
      img.style.display = 'none';
    });

    const syncSize = () => {
      this._applyReferenceSizeToImage_(img);
      this._ensurePngGuideLayers_();
      this._ensureAmbientScene_();
      if (fit && !this._hasFittedInitialView) {
        this._fitToSize_(img.naturalWidth, img.naturalHeight, fitMode);
        this._hasFittedInitialView = true;
      }
    };

    img.addEventListener('load', syncSize, { once: true });
    if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      requestAnimationFrame(syncSize);
    }

    const meta = {
      id,
      file: fileName,
      src: url,
      zIndex,
      kind: 'image',
      visible: true,
      opacity: 100,
      el: img,
    };

    this._layerMeta.push(meta);
    this._placeNewLayerRelativeToAmbient_(meta);
    this._applyEmptyState_();
    this._emitLayerListChanged_();
    this._emitImageStateChanged_();
    return meta;
  },

  _createStandaloneImage_(id, src, alt, zIndex) {
    const img = document.createElement('img');
    img.id = id;
    img.src = src;
    img.alt = alt;
    img.draggable = false;
    img.style.position = 'absolute';
    img.style.left = '0';
    img.style.top = '0';
    img.style.transform = 'none';
    img.style.userSelect = 'none';
    img.style.pointerEvents = 'none';
    img.style.zIndex = String(zIndex);
    this._wrapEl?.appendChild(img);
    return img;
  },

  _fitWhenReady_(img) {
    const applyFit = () => {
      if (!img.naturalWidth || !img.naturalHeight) return;
      this._applyReferenceSizeToImage_(img);
      this._ensurePngGuideLayers_();
      this._ensureAmbientScene_();
      this._fitToSize_(img.naturalWidth, img.naturalHeight, 'contain');
      this._hasFittedInitialView = true;
    };

    img.addEventListener('load', applyFit, { once: true });
    if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      requestAnimationFrame(() => requestAnimationFrame(applyFit));
    }
  },

  _fitToSize_(width, height, fitMode = 'contain') {
    if (!width || !height) return;
    this._initialFitMode = fitMode;
    this.applyInitialFlagView?.(fitMode);
  },

  setInitialViewConfig(config = null) {
    if (!config || typeof config !== 'object') {
      this._initialViewConfig = null;
      return;
    }
    this._initialViewConfig = { ...config };
  },

  applyInitialFlagView(fitMode = 'contain') {
    const size = this._getReferenceSize_();
    const width = Number(size?.width) || 0;
    const height = Number(size?.height) || 0;
    if (!width || !height) return;
    const preferredOrigin = window.MapTools?.getInitialPinPosition?.();
    const origin = {
      x: Number.isFinite(preferredOrigin?.x) ? preferredOrigin.x : width / 2,
      y: Number.isFinite(preferredOrigin?.y) ? preferredOrigin.y : height / 2,
    };
    window.MapTools?.setPinPosition?.(origin);
    const configuredZoomMultiplier = Number(this._initialViewConfig?.zoomMultiplier);
    const zoomMultiplier = Number.isFinite(configuredZoomMultiplier) && configuredZoomMultiplier > 0
      ? configuredZoomMultiplier
      : 2;
    window.MapView?.setInitialZoomFit?.({
      viewportW: this._viewportEl?.clientWidth,
      viewportH: this._viewportEl?.clientHeight,
      imageW: width,
      imageH: height,
      anchor: 'top-left',
      fitMode,
      centerX: origin.x,
      centerY: origin.y,
      zoomMultiplier,
    });
    requestAnimationFrame(() => {
      const viewportW = this._viewportEl?.clientWidth || 0;
      const viewportH = this._viewportEl?.clientHeight || 0;
      if (!viewportW || !viewportH) return;
      const fitZoom = fitMode === 'width'
        ? viewportW / width
        : fitMode === 'cover'
          ? Math.max(viewportW / width, viewportH / height)
          : Math.min(viewportW / width, viewportH / height);
      window.MapView?.setCenterOnMapPoint?.({
        x: origin.x,
        y: origin.y,
        zoom: Math.max(0.1, fitZoom * zoomMultiplier),
        syncZoomIndex: false,
      });
    });
  },

  _getReferenceSize_() {
    for (const meta of this._layerMeta) {
      if (this._isAmbientLayerMeta_(meta)) continue;
      const el = meta?.el;
      if (el instanceof HTMLImageElement && el.naturalWidth > 0 && el.naturalHeight > 0) {
        return {
          width: el.naturalWidth,
          height: el.naturalHeight,
        };
      }
      if (el instanceof HTMLCanvasElement && el.width > 0 && el.height > 0) {
        return {
          width: el.width,
          height: el.height,
        };
      }
    }
    return null;
  },

  _getReferenceImageSize_() {
    return this._getReferenceSize_();
  },

  _applyReferenceSizeToImage_(img) {
    if (!(img instanceof HTMLImageElement)) return;
    const reference = this._getReferenceImageSize_();
    if (!reference?.width || !reference?.height) {
      img.style.width = 'auto';
      img.style.height = 'auto';
      return;
    }

    if (!img.naturalWidth || !img.naturalHeight) {
      img.style.width = 'auto';
      img.style.height = 'auto';
      return;
    }

    const referenceRatio = reference.width / reference.height;
    const imageRatio = img.naturalWidth / img.naturalHeight;
    const ratioDelta = Math.abs(referenceRatio - imageRatio);

    if (ratioDelta > 0.001) {
      img.style.width = 'auto';
      img.style.height = 'auto';
      return;
    }

    img.style.width = `${reference.width}px`;
    img.style.height = 'auto';
  },

  _applyEmptyState_() {
    const hasImages = this.hasImages();
    const host = document.getElementById('mapArea');

    host?.classList.remove('gg-map-placeholder');
    host?.classList.remove('is-dragover');
    this._viewportEl?.classList.remove('is-empty');
    if (this._dropOverlayEl) {
      this._dropOverlayEl.hidden = true;
      this._updateDropOverlayText_();
    }

    if (this._ambientCanvasEl) {
      const ambientMeta = this._findAmbientLayerMeta_();
      this._ambientCanvasEl.style.display = hasImages && ambientMeta?.visible !== false ? '' : 'none';
    }
    if (hasImages) {
      this._ensureAmbientScene_();
    } else {
      this._stopAmbientAnimation_();
    }

    if (!hasImages) this._hud_('');
  },

  _revokeObjectUrls_() {
    for (const url of this._objectUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch (_) {
      }
    }
    this._objectUrls = [];
  },

  _emitLayerListChanged_() {
    try {
      window.dispatchEvent(new CustomEvent('GGIS_LAYERLIST_CHANGED', {
        detail: {
          mapsetName: this.getCurrentMapsetName(),
          count: this.getLayerList().length,
        },
      }));
    } catch (_) {
    }
  },

  _emitImageStateChanged_() {
    try {
      window.dispatchEvent(new CustomEvent('GGIS_IMAGE_STATE_CHANGED', {
        detail: {
          count: this._getContentLayerCount_(),
          hasImages: this.hasImages(),
        },
      }));
    } catch (_) {
    }
  },

  _emitVisibilityChanged_(id, visible) {
    try {
      window.dispatchEvent(new CustomEvent('GGIS_LAYER_VISIBILITY_CHANGED', {
        detail: { id: String(id || ''), visible: !!visible },
      }));
    } catch (_) {
    }
  },

  _emitOpacityChanged_(id, opacity) {
    try {
      window.dispatchEvent(new CustomEvent('GGIS_LAYER_OPACITY_CHANGED', {
        detail: { id: String(id || ''), opacity: Number(opacity) },
      }));
    } catch (_) {
    }
  },

  _t(key, fallback = '') {
    const text = window.I18N?.t?.(key);
    return text && text !== 'I18N_INIT_FAILED' ? text : fallback;
  },

  _hudMessage_(key, detail = '') {
    const base = this._t(key, key);
    const extra = String(detail || '').trim();
    this._hud_(extra ? `${base}: ${extra}` : base);
  },

  _hud_(text) {
    const hud = document.getElementById('hudArea');
    if (hud) hud.textContent = String(text || '');
  },

  _findLayerEl_(m) {
    if (!m) return null;

    let el = m.el instanceof HTMLElement ? m.el : null;
    if (!el) el = document.getElementById(String(m.id || ''));

    if (!el) {
      const wrap = document.getElementById('baseWrap');
      if (wrap) {
        const imgs = wrap.getElementsByTagName('img');
        for (let i = 0; i < imgs.length; i++) {
          if (String(imgs[i].getAttribute('alt') || '') === String(m.file || '')) {
            el = imgs[i];
            break;
          }
        }
      }
    }

    return el;
  },

  setLayerVisible(id, visible) {
    const targetId = String(id || '');
    if (!targetId) return false;

    const m = this._layerMeta.find((x) => String(x.id || '') === targetId);
    if (!m) return false;

    m.visible = !!visible;
    const el = this._findLayerEl_(m);
    if (!el) return false;

    el.style.display = m.visible ? '' : 'none';
    this._emitVisibilityChanged_(targetId, m.visible);
    return true;
  },

  setLayerOpacity(id, opacity) {
    const targetId = String(id || '');
    if (!targetId) return false;

    let o = Number(opacity);
    if (!Number.isFinite(o)) o = 100;
    o = Math.max(0, Math.min(100, Math.round(o)));

    const m = this._layerMeta.find((x) => String(x.id || '') === targetId);
    if (!m) return false;

    m.opacity = o;
    const el = this._findLayerEl_(m);
    if (!el) return false;

    el.style.opacity = String(o / 100);
    this._emitOpacityChanged_(targetId, o);
    return true;
  },

  getCurrentMapsetName() {
    return this.hasImages() ? this.STORAGE_KEY : '';
  },

  hasImages() {
    return this._getContentLayerCount_() > 0;
  },

  setDemoMapMode(enabled) {
    this._isDemoMap = !!enabled;
  },

  isDemoMap() {
    return !!this._isDemoMap;
  },

  getReferenceSize() {
    const size = this._getReferenceSize_();
    if (!size) return null;
    return {
      width: size.width,
      height: size.height,
    };
  },

  getCenterMapPoint() {
    const size = this._getReferenceSize_();
    const zoom = window.MapView?.getZoom?.();
    const offsetX = Number(window.MapView?.offsetX);
    const offsetY = Number(window.MapView?.offsetY);
    if (!size || !Number.isFinite(zoom) || !zoom) return null;
    if (!Number.isFinite(offsetX) || !Number.isFinite(offsetY)) return null;
    const viewport = this._viewportEl;
    const centerMark = document.getElementById('centerMark');
    let localX = (viewport?.clientWidth || 0) / 2;
    let localY = (viewport?.clientHeight || 0) / 2;
    if (viewport && centerMark) {
      const viewportRect = viewport.getBoundingClientRect();
      const centerRect = centerMark.getBoundingClientRect();
      localX = (centerRect.left + (centerRect.width / 2)) - viewportRect.left;
      localY = (centerRect.top + (centerRect.height / 2)) - viewportRect.top;
    }

    return {
      x: Math.max(0, Math.min(size.width, (localX - offsetX) / zoom)),
      y: Math.max(0, Math.min(size.height, (localY - offsetY) / zoom)),
      width: size.width,
      height: size.height,
      zoom,
    };
  },

  getMapPointFromClient(clientX, clientY) {
    const viewport = this._viewportEl;
    const size = this._getReferenceSize_();
    const zoom = Number(window.MapView?.getZoom?.());
    const offsetX = Number(window.MapView?.offsetX);
    const offsetY = Number(window.MapView?.offsetY);
    if (!viewport || !size || !Number.isFinite(zoom) || zoom <= 0) return null;
    if (!Number.isFinite(offsetX) || !Number.isFinite(offsetY)) return null;

    const rect = viewport.getBoundingClientRect();
    const localX = Number(clientX) - rect.left;
    const localY = Number(clientY) - rect.top;
    if (!Number.isFinite(localX) || !Number.isFinite(localY)) return null;

    return {
      x: Math.max(0, Math.min(size.width, (localX - offsetX) / zoom)),
      y: Math.max(0, Math.min(size.height, (localY - offsetY) / zoom)),
      width: size.width,
      height: size.height,
      zoom,
    };
  },

  getLayerList() {
    const unique = [];
    const seen = new Set();
    for (const m of this._layerMeta) {
      const id = String(m?.id || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      unique.push(m);
    }

    return unique.map((m, idx) => ({
      index: idx,
      id: String(m.id || ''),
      file: String(m.file || ''),
      src: String(m.src || ''),
      zIndex: Number(m.zIndex || 0),
      kind: String(m.kind || 'image'),
      visible: !!m.visible,
      opacity: Math.max(0, Math.min(100, Number(m.opacity ?? 100))),
    }));
  },

  _getLayerContainer_() {
    if (this._stack?.el instanceof HTMLElement) return this._stack.el;
    const stackEl = document.getElementById('layerStack');
    if (stackEl) return stackEl;
    return document.getElementById('baseWrap');
  },

  _ensureAmbientCanvas_() {
    if (this._ambientCanvasEl instanceof HTMLCanvasElement) return this._ambientCanvasEl;
    if (!(this._wrapEl instanceof HTMLElement)) return null;

    const canvas = document.createElement('canvas');
    canvas.id = MAP_AMBIENT_LAYER_ID;
    canvas.width = 1;
    canvas.height = 1;
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '1px';
    canvas.style.height = '1px';
    canvas.style.pointerEvents = 'none';
    canvas.style.userSelect = 'none';
    canvas.style.zIndex = '999';
    canvas.style.display = 'none';
    this._wrapEl.appendChild(canvas);

    this._ambientCanvasEl = canvas;
    this._ambientCtx = canvas.getContext('2d');
    return canvas;
  },

  _isAmbientLayerMeta_(meta) {
    return String(meta?.kind || '') === 'ambient' || String(meta?.id || '') === MAP_AMBIENT_LAYER_ID;
  },

  _findAmbientLayerMeta_() {
    return this._layerMeta.find((meta) => this._isAmbientLayerMeta_(meta)) || null;
  },

  _getContentLayerCount_() {
    return this._layerMeta.filter((meta) => !this._isAmbientLayerMeta_(meta)).length;
  },

  _syncLayerZIndices_() {
    for (let i = 0; i < this._layerMeta.length; i++) {
      const meta = this._layerMeta[i];
      meta.zIndex = i + 1;
      const el = this._findLayerEl_(meta);
      if (el) el.style.zIndex = String(meta.zIndex);
    }
  },

  _placeNewLayerRelativeToAmbient_(meta) {
    if (!meta || this._isAmbientLayerMeta_(meta)) return;

    const newIndex = this._layerMeta.indexOf(meta);
    const ambientIndex = this._layerMeta.findIndex((candidate) => this._isAmbientLayerMeta_(candidate));
    if (newIndex < 0 || ambientIndex < 0) return;

    const ambientWasTop = ambientIndex === this._layerMeta.length - 2 && newIndex === this._layerMeta.length - 1;
    if (!ambientWasTop) {
      this._syncLayerZIndices_();
      return;
    }

    this._layerMeta.splice(newIndex, 1);
    this._layerMeta.splice(ambientIndex, 0, meta);
    this._syncLayerZIndices_();
  },

  _ensureAmbientLayerMeta_(canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) return null;

    let meta = this._findAmbientLayerMeta_();
    if (meta) {
      meta.id = MAP_AMBIENT_LAYER_ID;
      meta.file = MAP_AMBIENT_LAYER_NAME;
      meta.kind = 'ambient';
      meta.el = canvas;
      return meta;
    }

    meta = {
      id: MAP_AMBIENT_LAYER_ID,
      file: MAP_AMBIENT_LAYER_NAME,
      src: '',
      zIndex: this._layerMeta.length + 1,
      kind: 'ambient',
      visible: true,
      opacity: 100,
      el: canvas,
    };
    this._layerMeta.push(meta);
    canvas.style.zIndex = String(meta.zIndex);
    this._emitLayerListChanged_();
    return meta;
  },

  _ensureAmbientScene_() {
    const canvas = this._ensureAmbientCanvas_();
    const ctx = this._ambientCtx;
    const reference = this._getReferenceSize_();
    if (!(canvas instanceof HTMLCanvasElement) || !ctx || !reference?.width || !reference?.height) return;
    const ambientMeta = this._ensureAmbientLayerMeta_(canvas);

    if (canvas.width !== reference.width || canvas.height !== reference.height) {
      canvas.width = reference.width;
      canvas.height = reference.height;
      canvas.style.width = `${reference.width}px`;
      canvas.style.height = `${reference.height}px`;
      this._ambientState = this._buildAmbientSceneState_(reference.width, reference.height);
    } else if (!this._ambientState) {
      this._ambientState = this._buildAmbientSceneState_(reference.width, reference.height);
    }

    const container = this._getLayerContainer_();
    if (container instanceof HTMLElement && canvas.parentElement !== container) {
      container.appendChild(canvas);
    }
    canvas.style.display = ambientMeta?.visible === false ? 'none' : '';
    canvas.style.opacity = String(Math.max(0, Math.min(100, Number(ambientMeta?.opacity ?? 100))) / 100);
    if (Number.isFinite(ambientMeta?.zIndex)) canvas.style.zIndex = String(ambientMeta.zIndex);
    this._startAmbientAnimation_();
  },

  _buildAmbientSceneState_(width, height) {
    const minSide = Math.min(width, height);
    return {
      width,
      height,
      moonSun: {
        progress: randomAmbient(0, 1),
        speed: randomAmbient(0.006, 0.0095),
        baseY: height * randomAmbient(0.12, 0.2),
        arcDepth: height * randomAmbient(0.035, 0.065),
        size: minSide * randomAmbient(0.08, 0.11),
        kind: Math.random() < 0.5 ? 'moon' : 'sun',
      },
      wind: {
        progress: randomAmbient(0, 1),
        speed: randomAmbient(0.012, 0.018),
        size: minSide * randomAmbient(0.07, 0.095),
        swayX: width * randomAmbient(0.08, 0.14),
        swayPhase: randomAmbient(0, Math.PI * 2),
        rotation: randomAmbient(0, Math.PI * 2),
      },
      clouds: Array.from({ length: 3 }, () => this._spawnAmbientCloud_(width, height)),
      horse: {
        progress: randomAmbient(0, 1),
        speed: randomAmbient(0.018, 0.026),
        baseY: height * randomAmbient(0.58, 0.76),
        bobPhase: randomAmbient(0, Math.PI * 2),
        bobAmount: height * randomAmbient(0.006, 0.012),
        size: minSide * randomAmbient(0.058, 0.075),
      },
      coreRunesE: Array.from(
        { length: Math.floor(randomAmbient(2, 4)) },
        () => this._spawnAmbientCoreRuneE_(width, height),
      ),
      people: Array.from({ length: 2 }, (_, index) => this._spawnAmbientPerson_(width, height, index)),
    };
  },

  _spawnAmbientCoreRuneE_(width, height) {
    const minSide = Math.min(width, height);
    return {
      progress: randomAmbient(-0.2, 1.05),
      speed: randomAmbient(0.006, 0.011),
      y: height * randomAmbient(0.24, 0.74),
      size: minSide * randomAmbient(0.032, 0.044),
    };
  },

  _spawnAmbientCloud_(width, height) {
    const minSide = Math.min(width, height);
    return {
      progress: randomAmbient(0, 1),
      speed: randomAmbient(0.006, 0.011),
      y: height * randomAmbient(0.08, 0.34),
      size: minSide * randomAmbient(0.04, 0.055),
      opacity: randomAmbient(0.18, 0.28),
    };
  },

  _spawnAmbientPerson_(width, height, index = 0) {
    const minSide = Math.min(width, height);
    const motionTypes = ['s', 'figure8', 'circle'];
    return {
      progress: randomAmbient(0, 1),
      speed: randomAmbient(0.01, 0.018),
      baseX: width * randomAmbient(0.24, 0.78),
      baseY: height * randomAmbient(0.36, 0.78),
      spanX: width * randomAmbient(0.03, 0.08),
      spanY: height * randomAmbient(0.04, 0.1),
      phase: randomAmbient(0, Math.PI * 2),
      driftX: randomAmbient(-0.012, 0.012),
      driftY: randomAmbient(-0.01, 0.01),
      motion: motionTypes[(index + Math.floor(randomAmbient(0, motionTypes.length))) % motionTypes.length],
      size: minSide * randomAmbient(0.05, 0.065),
    };
  },

  _startAmbientAnimation_() {
    if (!(this._ambientCanvasEl instanceof HTMLCanvasElement) || !this._ambientCtx || !this._ambientState) return;
    if (this._ambientAnimationFrame) return;
    this._ambientLastFrameAt = performance.now();

    const tick = (now) => {
      if (!this._ambientState || !this.hasImages()) {
        this._ambientAnimationFrame = 0;
        return;
      }
      const dt = Math.min(0.05, Math.max(0.001, (now - this._ambientLastFrameAt) / 1000));
      this._ambientLastFrameAt = now;
      this._renderAmbientFrame_(now, dt);
      this._ambientAnimationFrame = requestAnimationFrame(tick);
    };

    this._ambientAnimationFrame = requestAnimationFrame(tick);
  },

  _stopAmbientAnimation_() {
    if (this._ambientAnimationFrame) {
      cancelAnimationFrame(this._ambientAnimationFrame);
      this._ambientAnimationFrame = 0;
    }
  },

  _renderAmbientFrame_(now, dt) {
    const canvas = this._ambientCanvasEl;
    const ctx = this._ambientCtx;
    const scene = this._ambientState;
    if (!(canvas instanceof HTMLCanvasElement) || !ctx || !scene) return;

    const { width, height } = scene;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    this._drawAmbientMoonSun_(ctx, scene, dt);
    this._drawAmbientWind_(ctx, scene, dt);
    this._drawAmbientClouds_(ctx, scene, dt);
    this._drawAmbientHorse_(ctx, scene, now, dt);
    this._drawAmbientCoreRuneE_(ctx, scene, dt);
    this._drawAmbientPeople_(ctx, scene, now, dt);

    ctx.restore();
  },

  _drawAmbientMoonSun_(ctx, scene, dt) {
    const entity = scene.moonSun;
    entity.progress += entity.speed * dt;
    if (entity.progress > 1.12) {
      entity.progress = -0.12;
      entity.kind = entity.kind === 'moon' ? 'sun' : 'moon';
      entity.baseY = scene.height * randomAmbient(0.12, 0.2);
      entity.arcDepth = scene.height * randomAmbient(0.035, 0.065);
    }

    const x = scene.width * 1.12 - entity.progress * scene.width * 1.28;
    const orbit = Math.sin(entity.progress * Math.PI) * entity.arcDepth;
    const y = entity.baseY - orbit;
    const moonProgress = Math.max(0, Math.min(0.999, entity.progress));
    const moonIndex = Math.floor(moonProgress * MAP_AMBIENT_MOON_SEQUENCE.length);
    const glyph = entity.kind === 'sun'
      ? '.'
      : MAP_AMBIENT_MOON_SEQUENCE[moonIndex];

    ctx.save();
    ctx.font = `400 ${entity.size}px ${MAP_AMBIENT_CORE_RUNE_FONT}`;
    ctx.fillStyle = entity.kind === 'sun' ? 'rgba(255, 246, 190, 0.94)' : 'rgba(232, 236, 242, 0.92)';
    ctx.shadowColor = entity.kind === 'sun' ? 'rgba(255, 222, 128, 0.35)' : 'rgba(255, 255, 255, 0.18)';
    ctx.shadowBlur = entity.size * 0.18;
    ctx.fillText(glyph, x, y);
    ctx.restore();
  },

  _drawAmbientWind_(ctx, scene, dt) {
    const wind = scene.wind;
    wind.progress = (wind.progress + wind.speed * dt) % 1;
    wind.rotation -= dt * 1.45;

    const baseX = scene.width * (-0.08 + wind.progress * 1.18);
    const baseY = scene.height * (0.86 - wind.progress * 0.68);
    const sway = Math.sin(wind.progress * Math.PI * 2 + wind.swayPhase) * wind.swayX;
    const x = baseX + sway;
    const y = baseY + Math.sin(wind.progress * Math.PI * 4 + wind.swayPhase * 0.6) * scene.height * 0.045;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(wind.rotation);
    ctx.font = `400 ${wind.size}px ${MAP_AMBIENT_CORE_RUNE_FONT}`;
    ctx.fillStyle = 'rgba(208, 214, 226, 0.44)';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.12)';
    ctx.shadowBlur = wind.size * 0.12;
    ctx.fillText('g', 0, 0);
    ctx.restore();
  },

  _drawAmbientClouds_(ctx, scene, dt) {
    scene.clouds.forEach((cloud) => {
      cloud.progress += cloud.speed * dt;
      if (cloud.progress > 1.18) {
        Object.assign(cloud, this._spawnAmbientCloud_(scene.width, scene.height), { progress: -0.12 });
      }

      const x = scene.width * (-0.08 + cloud.progress * 1.18);
      ctx.save();
      ctx.font = `400 ${cloud.size}px ${MAP_AMBIENT_CORE_RUNE_FONT}`;
      ctx.fillStyle = `rgba(198, 204, 214, ${cloud.opacity})`;
      ctx.fillText('E', x, cloud.y);
      ctx.restore();
    });
  },

  _drawAmbientHorse_(ctx, scene, now, dt) {
    const horse = scene.horse;
    horse.progress = (horse.progress + horse.speed * dt) % 1;
    const x = scene.width * 1.08 - horse.progress * scene.width * 1.22;
    const bob = Math.sin((now / 1000) * 8.2 + horse.bobPhase) * horse.bobAmount;
    const y = horse.baseY + bob;

    ctx.save();
    ctx.font = `400 ${horse.size}px ${MAP_AMBIENT_CORE_RUNE_FONT}`;
    ctx.fillStyle = 'rgba(248, 248, 248, 0.52)';
    ctx.fillText('n', x, y);
    ctx.restore();
  },

  _drawAmbientCoreRuneE_(ctx, scene, dt) {
    const runes = Array.isArray(scene.coreRunesE) ? scene.coreRunesE : [];
    runes.forEach((rune, index) => {
      rune.progress += rune.speed * dt;
      if (rune.progress > 1.1) {
        runes[index] = this._spawnAmbientCoreRuneE_(scene.width, scene.height);
        runes[index].progress = randomAmbient(-0.22, -0.08);
        return;
      }

      const x = scene.width * (-0.08 + rune.progress * 1.16);

      ctx.save();
      ctx.font = `400 ${rune.size}px ${MAP_AMBIENT_CORE_RUNE_FONT}`;
      ctx.fillStyle = 'rgba(246, 246, 246, 0.46)';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.12)';
      ctx.shadowBlur = rune.size * 0.1;
      ctx.fillText('E', x, rune.y);
      ctx.restore();
    });
  },

  _drawAmbientPeople_(ctx, scene, now, dt) {
    scene.people.forEach((person) => {
      person.progress = (person.progress + person.speed * dt) % 1;
      person.baseX += person.driftX * scene.width * dt;
      person.baseY += person.driftY * scene.height * dt;
      person.baseX = clampAmbient(person.baseX, scene.width * 0.16, scene.width * 0.84);
      person.baseY = clampAmbient(person.baseY, scene.height * 0.22, scene.height * 0.86);

      const angle = person.progress * Math.PI * 2 + person.phase;
      let offsetX = 0;
      let offsetY = 0;
      if (person.motion === 's') {
        offsetX = Math.sin(angle) * person.spanX;
        offsetY = Math.sin(angle * 2) * person.spanY;
      } else if (person.motion === 'figure8') {
        offsetX = Math.sin(angle) * person.spanX;
        offsetY = Math.sin(angle) * Math.cos(angle) * person.spanY * 1.55;
      } else {
        offsetX = Math.cos(angle) * person.spanX;
        offsetY = Math.sin(angle) * person.spanY;
      }

      ctx.save();
      ctx.font = `400 ${person.size}px ${MAP_AMBIENT_CORE_RUNE_FONT}`;
      ctx.fillStyle = 'rgba(246, 246, 246, 0.52)';
      ctx.fillText(',', person.baseX + offsetX, person.baseY + offsetY);
      ctx.restore();
    });
  },

  reorderLayers(orderIds) {
    const container = this._getLayerContainer_();
    if (!container) return false;

    const ids = Array.isArray(orderIds) ? orderIds.slice() : [];
    if (new Set(ids).size !== this._layerMeta.length || ids.length !== this._layerMeta.length) return false;

    const metaById = new Map(this._layerMeta.map((m) => [m.id, m]));
    const newMeta = ids.map((id) => metaById.get(id)).filter(Boolean);
    if (newMeta.length !== this._layerMeta.length) return false;

    this._layerMeta = newMeta;
    for (let i = 0; i < this._layerMeta.length; i++) {
      const m = this._layerMeta[i];
      m.zIndex = i + 1;
      const el = this._findLayerEl_(m);
      if (!el) continue;
      m.el = el;
      el.style.zIndex = String(m.zIndex);
      container.appendChild(el);
    }

    this._emitLayerListChanged_();
    return true;
  },
};

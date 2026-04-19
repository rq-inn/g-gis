// js/logic/map_view.js
// ===== MapView (zoom/pan state + events) =====
// 役割：ズーム段階・パンoffset・入力イベント・transform適用
// 追加：初期ズーム fit-to-screen → 段階スナップ
// 重要：中心固定（-50%,-50%）は img 側、ここは px移動+scale のみ
//
// Hotfix:
// - translate3d を使いGPU合成を安定させる
// - 起動時にだけ「0.3 → 元に戻す」を自動で行い、キャッシュ状態を“鮮明側”に寄せる
//   ※戻し先は fit で選ばれた値（0.1も許可）

window.MapView = {
  // ★ 段階ズーム拡張（大地図→ズームアップの検索性を優先）
  zoomSteps: [0.1, 0.2, 0.3, 0.5, 0.75, 1, 1.5, 2, 3, 4],

  zoomIndex: 5,
  currentZoom: 1,
  offsetX: 0,
  offsetY: 0,

  _dragging: false,
  _dragStartX: 0,
  _dragStartY: 0,
  _startOffsetX: 0,
  _startOffsetY: 0,

  _viewportEl: null,
  _wrapEl: null,

  onChange: null,

  init({ viewportEl, wrapEl }) {
    this._viewportEl = viewportEl;
    this._wrapEl = wrapEl;

    this._bindWheelGlobal();
    this._bindDrag();

    this._apply();
  },

  getZoom() {
    if (Number.isFinite(this.currentZoom) && this.currentZoom > 0) return this.currentZoom;
    return this.zoomSteps[this.zoomIndex] ?? 1;
  },

  _closestZoomIndex(zoom) {
    const target = Number(zoom);
    if (!Number.isFinite(target) || target <= 0) return this.zoomIndex;

    let bestIndex = 0;
    let bestDist = Infinity;
    for (let i = 0; i < this.zoomSteps.length; i++) {
      const dist = Math.abs(this.zoomSteps[i] - target);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    }
    return bestIndex;
  },

  getState() {
    return {
      zoomIndex: this.zoomIndex,
      zoom: this.getZoom(),
      offsetX: this.offsetX,
      offsetY: this.offsetY,
    };
  },

  getViewportSize() {
    return {
      width: this._viewportEl?.clientWidth || 0,
      height: this._viewportEl?.clientHeight || 0,
    };
  },

  _getContentSize() {
    const size = window.MapCanvas?.getReferenceSize?.();
    return {
      width: Number(size?.width) || 0,
      height: Number(size?.height) || 0,
    };
  },

  _getPanAnchor() {
    const viewport = this.getViewportSize();
    const centerMark = document.getElementById("centerMark");
    if (this._viewportEl && centerMark) {
      const viewportRect = this._viewportEl.getBoundingClientRect();
      const markRect = centerMark.getBoundingClientRect();
      return {
        x: (markRect.left + (markRect.width / 2)) - viewportRect.left,
        y: (markRect.top + (markRect.height / 2)) - viewportRect.top,
      };
    }
    return {
      x: viewport.width / 2,
      y: viewport.height / 2,
    };
  },

  _normalizeOffsets(offsetX, offsetY, zoom = this.getZoom()) {
    const content = this._getContentSize();
    if (!content.width || !content.height || !Number.isFinite(zoom) || zoom <= 0) {
      return {
        offsetX: Number.isFinite(offsetX) ? offsetX : 0,
        offsetY: Number.isFinite(offsetY) ? offsetY : 0,
      };
    }

    const anchor = this._getPanAnchor();
    const scaledWidth = content.width * zoom;
    const scaledHeight = content.height * zoom;

    let nextX = Number.isFinite(offsetX) ? offsetX : 0;
    let nextY = Number.isFinite(offsetY) ? offsetY : 0;

    nextX = Math.min(anchor.x, Math.max(anchor.x - scaledWidth, nextX));
    nextY = Math.min(anchor.y, Math.max(anchor.y - scaledHeight, nextY));

    return {
      offsetX: nextX,
      offsetY: nextY,
    };
  },

  setView({ zoom, offsetX, offsetY, syncZoomIndex = true } = {}) {
    let nextZoom = this.getZoom();
    if (Number.isFinite(zoom) && zoom > 0) {
      nextZoom = zoom;
      this.currentZoom = zoom;
      if (syncZoomIndex) this.zoomIndex = this._closestZoomIndex(zoom);
    }
    const normalized = this._normalizeOffsets(
      Number.isFinite(offsetX) ? offsetX : this.offsetX,
      Number.isFinite(offsetY) ? offsetY : this.offsetY,
      nextZoom,
    );
    this.offsetX = normalized.offsetX;
    this.offsetY = normalized.offsetY;
    this._apply();
  },

  setCenterOnMapPoint({ x, y, zoom, syncZoomIndex = true } = {}) {
    const viewport = this.getViewportSize();
    const nextZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : this.getZoom();
    if (!viewport.width || !viewport.height || !Number.isFinite(x) || !Number.isFinite(y) || !nextZoom) return;

    this.setView({
      zoom: nextZoom,
      offsetX: (viewport.width / 2) - (x * nextZoom),
      offsetY: (viewport.height / 2) - (y * nextZoom),
      syncZoomIndex,
    });
  },

  setInitialZoomFit({ viewportW, viewportH, imageW, imageH, fitMode = 'contain', centerX = null, centerY = null, zoomMultiplier = 1 }) {
    if (!viewportW || !viewportH || !imageW || !imageH) return;

    const fitZoom = fitMode === 'width'
      ? viewportW / imageW
      : fitMode === 'cover'
        ? Math.max(viewportW / imageW, viewportH / imageH)
      : Math.min(viewportW / imageW, viewportH / imageH);

    const multiplier = Number.isFinite(zoomMultiplier) && zoomMultiplier > 0 ? zoomMultiplier : 1;
    this.currentZoom = Math.max(0.1, fitZoom * multiplier);
    this.zoomIndex = this._closestZoomIndex(this.currentZoom);
    const targetX = Number.isFinite(centerX) ? centerX : imageW / 2;
    const targetY = Number.isFinite(centerY) ? centerY : imageH / 2;
    const normalized = this._normalizeOffsets(
      (viewportW / 2) - (targetX * this.currentZoom),
      (viewportH / 2) - (targetY * this.currentZoom),
      this.currentZoom,
    );
    this.offsetX = normalized.offsetX;
    this.offsetY = normalized.offsetY;

    // ① まず即時適用
    this._apply();

    // ② 起動時だけ “0.3→元に戻す” を自動実行（ユーザーの手動操作を再現）
    return;
    const originalIndex = this.zoomIndex;
    const idx03 = this.zoomSteps.indexOf(0.3);

    requestAnimationFrame(() => {
      // レイアウト確定後にもう一度適用
      this._apply();

      // 0.3が存在し、かつ今0.3ではないなら一瞬だけ0.3へ
      if (idx03 !== -1 && originalIndex !== idx03) {
        this.zoomIndex = idx03;
        this.currentZoom = this.zoomSteps[this.zoomIndex] ?? this.currentZoom;
        this._apply();
      }

      // 次フレームで元へ戻す（0.1も許可）
      requestAnimationFrame(() => {
        this.zoomIndex = originalIndex;
        this.currentZoom = this.zoomSteps[this.zoomIndex] ?? this.currentZoom;
        this._apply();
      });
    });
  },

  // ★ centerMark（＋）基準ズーム：実測位置をアンカーにして誤差累積を防ぐ
  _zoomToIndex(nextIndex, focusPoint = null) {
    const prevZ = this.getZoom();

    // 変更後ズーム
    this.zoomIndex = nextIndex;
    this.currentZoom = this.zoomSteps[this.zoomIndex] ?? this.currentZoom;
    const nextZ = this.getZoom();

    if (!prevZ || !nextZ || prevZ === nextZ) {
      this._apply();
      return;
    }

    const k = nextZ / prevZ;

    // 基準点 p を「centerMark の実測位置」で取る（viewport中心からの差分px）
    let pX = 0;
    let pY = 0;

    if (focusPoint && Number.isFinite(focusPoint.x) && Number.isFinite(focusPoint.y)) {
      pX = focusPoint.x;
      pY = focusPoint.y;
    } else if (this._viewportEl) {
      pX = this._viewportEl.clientWidth / 2;
      pY = this._viewportEl.clientHeight / 2;
    }

    // offset' = (1-k)*p + k*offset
    this.offsetX = (1 - k) * pX + k * this.offsetX;
    this.offsetY = (1 - k) * pY + k * this.offsetY;

    this._apply();
  },

  zoomIn(focusPoint = null) {
    if (this.zoomIndex < this.zoomSteps.length - 1) {
      this._zoomToIndex(this.zoomIndex + 1, focusPoint);
    }
  },

  zoomOut(focusPoint = null) {
    if (this.zoomIndex > 0) {
      this._zoomToIndex(this.zoomIndex - 1, focusPoint);
    }
  },

  // wheel: global capture, but only when cursor is over the viewport
  _bindWheelGlobal() {
    window.addEventListener(
      "wheel",
      (e) => {
        if (!this._viewportEl) return;
        if (!this._viewportEl.contains(e.target)) return;

        e.preventDefault();

        const rect = this._viewportEl.getBoundingClientRect();
        const focusPoint = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };

        if (e.deltaY < 0) this.zoomIn(focusPoint);
        else this.zoomOut(focusPoint);
      },
      { passive: false }
    );
  },

  _bindDrag() {
    if (!this._viewportEl) return;

    const el = this._viewportEl;
    el.style.touchAction = "none";

    const canStartPan = (event) => {
      if (event.defaultPrevented) return false;
      if (event.button !== 0) return false;
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return true;
      if (target.closest('button, input, select, textarea, a, [role="dialog"], .gg-place-card')) return false;
      if (target.closest('[data-pin-role], [data-circle-id]')) return false;
      const toolMode = String(window.MapTools?.mode || 'idle');
      return toolMode === 'idle' || toolMode === 'result' || toolMode === 'circle_config';
    };

    const endDrag = (event) => {
      if (!this._dragging) return;
      this._dragging = false;
      try {
        el.releasePointerCapture?.(event.pointerId);
      } catch (_) {
      }
      el.classList.remove("grabbing");
      document.getElementById("mapArea")?.classList.remove("gg-grabbing");
    };

    el.addEventListener("pointerdown", (e) => {
      if (!canStartPan(e)) return;
      e.preventDefault();
      this._dragging = true;
      this._dragStartX = e.clientX;
      this._dragStartY = e.clientY;
      this._startOffsetX = this.offsetX;
      this._startOffsetY = this.offsetY;
      el.setPointerCapture?.(e.pointerId);
      el.classList.add("grabbing");
      document.getElementById("mapArea")?.classList.add("gg-grabbing");
    });

    el.addEventListener("pointermove", (e) => {
      if (!this._dragging) return;
      e.preventDefault();
      const dx = e.clientX - this._dragStartX;
      const dy = e.clientY - this._dragStartY;
      const normalized = this._normalizeOffsets(this._startOffsetX + dx, this._startOffsetY + dy);
      this.offsetX = normalized.offsetX;
      this.offsetY = normalized.offsetY;
      this._apply();
    });

    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    window.addEventListener("blur", () => {
      if (!this._dragging) return;
      this._dragging = false;
      el.classList.remove("grabbing");
      document.getElementById("mapArea")?.classList.remove("gg-grabbing");
    });
  },

  _apply() {
    const z = this.getZoom();

    if (this._wrapEl) {
      this._wrapEl.style.transform = `translate3d(${this.offsetX}px, ${this.offsetY}px, 0) scale(${z})`;
    }

    if (typeof this.onChange === "function") {
      this.onChange({
        zoomIndex: this.zoomIndex,
        zoom: z,
        offsetX: this.offsetX,
        offsetY: this.offsetY,
      });
    }
  },
};

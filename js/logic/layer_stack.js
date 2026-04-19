// js/logic/layer_stack.js
// ===== LayerStack (I-05R) =====
// 目的：wrapEl 内にレイヤーコンテナを作り、画像/コンテナ/キャンバス層を追加できるAPIを提供する
// 注意：LayerSpec は layer_spec.js 側（ここでは定義しない）

window.LayerStack = {
  create({ wrapEl }) {
    if (!wrapEl) throw new Error("LAYERSTACK_WRAP_NOT_FOUND");

    let stack = wrapEl.querySelector("#layerStack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "layerStack";
      stack.style.position = "absolute";
      stack.style.left = "0";
      stack.style.top = "0";
      stack.style.width = "0";
      stack.style.height = "0";
      wrapEl.appendChild(stack);
    }

    const api = {
      el: stack,
      layers: {},

      addImageLayer(opt) {
        const id = opt?.id;
        const src = opt?.src;
        if (!id) throw new Error("LAYER_ID_REQUIRED");
        if (!src) throw new Error("LAYER_SRC_REQUIRED");

        if (this.layers[id]) {
          this.layers[id].remove();
          delete this.layers[id];
        }

        const img = document.createElement("img");
        img.id = id;
        img.alt = opt?.alt || id;
        img.src = src;
        img.draggable = false;

        img.style.position = "absolute";
        img.style.left = "0";
        img.style.top = "0";
        img.style.transform = "none";
        img.style.userSelect = "none";
        img.style.pointerEvents = "none";
        img.style.opacity = "1";

        if (Number.isFinite(opt?.zIndex)) {
          img.style.zIndex = String(opt.zIndex);
        }

        stack.appendChild(img);
        this.layers[id] = img;
        return img;
      },

      // ★ L4: canvas layer
      addCanvasLayer(opt) {
        const id = opt?.id;
        if (!id) throw new Error("LAYER_ID_REQUIRED");

        if (this.layers[id]) {
          this.layers[id].remove();
          delete this.layers[id];
        }

        const c = document.createElement("canvas");
        c.id = id;

        // 中央固定（画像と同じ座標系）
        c.style.position = "absolute";
        c.style.left = "0";
        c.style.top = "0";
        c.style.transform = "none";
        c.style.userSelect = "none";
        c.style.pointerEvents = "none";

        if (Number.isFinite(opt?.zIndex)) {
          c.style.zIndex = String(opt.zIndex);
        }

        stack.appendChild(c);
        this.layers[id] = c;
        return c;
      },

      addContainerLayer(opt) {
        const id = opt?.id;
        if (!id) throw new Error("LAYER_ID_REQUIRED");

        if (this.layers[id]) {
          this.layers[id].remove();
          delete this.layers[id];
        }

        const div = document.createElement("div");
        div.id = id;

        div.style.position = "absolute";
        div.style.left = "0";
        div.style.top = "0";
        div.style.transform = "none";

        if (Number.isFinite(opt?.zIndex)) {
          div.style.zIndex = String(opt.zIndex);
        }

        stack.appendChild(div);
        this.layers[id] = div;
        return div;
      },

      get(id) {
        return this.layers[id] || null;
      },

      remove(id) {
        const el = this.layers[id];
        if (!el) return;
        el.remove();
        delete this.layers[id];
      },
    };

    return api;
  },
};

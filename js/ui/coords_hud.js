// /js/ui/coords_hud.js
// Phase 1-0: Coords HUD (bottom-right)
// 責務：右下の座標HUD表示だけ

window.CoordsHUD = {
  _el: null,

  _t(key, fallback = "") {
    const text = window.I18N?.t?.(key);
    return text && text !== "I18N_INIT_FAILED" ? text : fallback;
  },

  ensure() {
    const host = document.getElementById("hudArea");
    if (!host) throw new Error("HUD_AREA_NOT_FOUND");

    let box = document.getElementById("coordsHud");
    if (!box) {
      box = document.createElement("div");
      box.id = "coordsHud";
      box.className = "gg-coords-hud";
      host.appendChild(box);
    }
    this._el = box;
    return box;
  },

  update(x, y, zoom) {
    if (!this._el) this.ensure();

    const xi = Number.isFinite(x) ? Math.trunc(x) : 0;
    const yi = Number.isFinite(y) ? Math.trunc(y) : 0;

    // zoom は小数もあり得るので軽く整形
    const z = Number.isFinite(zoom) ? (Math.round(zoom * 100) / 100) : 1;

    this._el.textContent = `${this._t("COORD_X", "X")}: ${xi}  ${this._t("COORD_Y", "Y")}: ${yi}  ${this._t("COORD_Z", "Z")}: ${z}`;
  }
};

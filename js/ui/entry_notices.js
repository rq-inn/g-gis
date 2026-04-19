// /js/ui/entry_notices.js
// Entry footer notices controller
// 責務：表示/非表示（文言は I18N.t / message.csv から取得）
// 例外を作らない

window.EntryNotices = {
  _el(id) {
    return document.getElementById(id);
  },

  _t(k) {
    return window.I18N?.t ? window.I18N.t(k) : k;
  },

  _show(id, message) {
    const el = this._el(id);
    if (!el) return;
    el.textContent = message;
    el.classList.remove("hidden");
  },

  _hide(id) {
    const el = this._el(id);
    if (!el) return;
    el.textContent = "";
    el.classList.add("hidden");
  },

  showOSNotSupported() {
    this._hide("resolutionNotice");
    this._show("osNotice", this._t("NOT_SUPPORTED"));
  },

  showResolutionRecommend(messageKeyOrText) {
    const os = this._el("osNotice");
    if (os && !os.classList.contains("hidden")) return;

    // 基本はキー渡し（RESOLUTION_RECOMMEND）。テキスト直渡しも可能だが、
    // 運用ではキーを渡す前提。
    const msg = messageKeyOrText ? this._t(messageKeyOrText) : "";
    this._show("resolutionNotice", msg);
  },

  hideResolutionRecommend() {
    this._hide("resolutionNotice");
  }
};
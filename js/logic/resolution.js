// /js/logic/resolution.js
// Phase 0-4: Recommended resolution check
// 責務：解像度判定だけ（表示はUI側に渡す）

window.Resolution = {
  MIN_W: 1366,
  MIN_H: 768,

  /**
   * 推奨解像度以上か
   */
  isRecommended() {
    const w = window.innerWidth || 0;
    const h = window.innerHeight || 0;
    return (w >= this.MIN_W) && (h >= this.MIN_H);
  },

  /**
   * 画面サイズ情報（必要ならUI側で表示用に使える）
   */
  getInfo() {
    return {
      w: window.innerWidth || 0,
      h: window.innerHeight || 0,
      minW: this.MIN_W,
      minH: this.MIN_H
    };
  }
};
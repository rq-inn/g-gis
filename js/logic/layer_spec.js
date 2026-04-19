// js/logic/layer_spec.js
// ===== LayerSpec (definition only / unused in L1) =====
// 目的：地図レイヤー分離のための「仕様（定義）」を1箇所に集約する。
// 注意：L1では未使用。既存挙動に影響を与えないため、参照・実行はしない。
// 禁止事項：I18N/Access/UI箱/起動順には触れない（このファイル単体で完結）。

(function () {
  // 既に定義済みなら上書きしない（事故防止）
  if (window.LayerSpec) return;

  /**
   * LayerSpec: レイヤーの「定義」だけを持つ
   * - 実体生成は LayerStack 側（L2以降）
   * - Access/I18N は上位側で解決（L1では扱わない）
   */
  window.LayerSpec = {
    // 仕様バージョン（互換性管理用）
    version: "I-05R-L1",

    /**
     * Layer IDs (固定キー)
     * L1では「定義のみ」。利用はL2以降で開始。
     */
    ids: Object.freeze({
      base: "baseMap",
      label: "labelLayer",
      glowline: "glowlineLayer",
      hex: "hexLayer",
      icons: "iconsLayer",
      labelText: "labelTextLayer",
    }),

    /**
     * 最小のレイヤー定義セット（将来拡張前提）
     * - src は「例」。L1では未使用なので参照されない。
     * - zIndex は相対順序の意図を示す。
     */
    defs: Object.freeze({
      base: Object.freeze({
        id: "baseMap",
        type: "image",
        zIndex: 1,
        defaultSrc: "./mapsets/_dev/base.png",
      }),

      label_jp: Object.freeze({
        id: "labelLayer",
        type: "image",
        zIndex: 2,
        defaultSrc: "./mapsets/_standard/Japanese.png",
      }),

      label_en: Object.freeze({
        id: "labelLayer",
        type: "image",
        zIndex: 2,
        defaultSrc: "./mapsets/_english/English.png",
      }),

      glowline: Object.freeze({
        id: "glowlineLayer",
        type: "image",
        zIndex: 3,
        // src はL3で確定
        defaultSrc: null,
      }),

      hex: Object.freeze({
        id: "hexLayer",
        type: "canvas",
        zIndex: 10,
      }),

      icons: Object.freeze({
        id: "iconsLayer",
        type: "canvas",
        zIndex: 11,
      }),

      labelText: Object.freeze({
        id: "labelTextLayer",
        type: "canvas",
        zIndex: 12,
      }),
    }),

    /**
     * 定義の軽い検証（L1では呼ばれない想定）
     */
    validate(def) {
      if (!def || typeof def !== "object") return false;
      if (!def.id || typeof def.id !== "string") return false;
      if (!def.type || typeof def.type !== "string") return false;
      if (def.zIndex != null && !Number.isFinite(def.zIndex)) return false;
      return true;
    },
  };
})();
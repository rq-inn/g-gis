window.I18N = {
  STORAGE_KEY: "GGIS_LANG",
  current: "L1",
  currentNumber: "L1",
  languages: [],
  messages: {},
  failed: false,

  async init() {
    this.failed = false;
    this.languages = [];
    this.messages = {};

    try {
      const langs = await window.CSV.load("./data/language.csv");
      const msgs = await window.CSV.load("./data/message.csv");

      this.languages = this._normalizeLanguageRows(langs);
      this._assertLanguageHeaderRows(this.languages);
      this._assertMessageHeaderRows(msgs);
      this._buildMessageMap(msgs);

      const initialNumber = this._detectInitialLanguageNumber();
      const initialRow = this._findLanguageRowByNumber(initialNumber) || this.languages[0] || null;
      this.current = initialRow?.internal || "L1";
      this.currentNumber = initialRow?.Number || initialNumber;
      this._applyDocumentLanguage();
    } catch (e) {
      console.error("[I18N] init failed:", e);
      this.failed = true;
    }
  },

  _normalizeLanguageRows(rows) {
    if (!Array.isArray(rows)) return [];
    let internalIndex = 0;
    return rows.map((row) => {
      const number = String(row?.Number ?? row?.number ?? "").trim();
      if (!number) return null;
      internalIndex += 1;
      return {
        Number: number,
        language: String(row?.language ?? row?.Language ?? "").trim(),
        internal: `L${internalIndex}`,
      };
    }).filter(Boolean);
  },

  _assertLanguageHeaderRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("I18N_LANGUAGE_CSV_EMPTY");
    }
    if (!rows[0].Number || !rows[0].language) {
      throw new Error("I18N_LANGUAGE_HEADER_REQUIRED");
    }
  },

  _assertMessageHeaderRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("I18N_MESSAGE_CSV_EMPTY");
    }
    const r0 = rows[0] || {};
    const has = (k) => Object.prototype.hasOwnProperty.call(r0, k);
    if (!has("key") || !has("name_L1") || !has("name_L2") || !has("name_L3")) {
      throw new Error("I18N_MESSAGE_HEADER_REQUIRED");
    }
  },

  _isValidLang(code) {
    const c = String(code || "");
    return this.languages.some((lang) => lang.internal === c);
  },

  _findLanguageRowByNumber(number) {
    const target = String(number || "").trim();
    if (!target) return null;
    return this.languages.find((lang) => lang.Number === target) || null;
  },

  _findLanguageRowByInternal(internal) {
    const target = String(internal || "").trim();
    if (!target) return null;
    return this.languages.find((lang) => lang.internal === target) || null;
  },

  _readSavedLanguageNumber() {
    try {
      return String(localStorage.getItem(this.STORAGE_KEY) || "").trim();
    } catch {
      return "";
    }
  },

  _saveLanguageNumber(number) {
    try {
      localStorage.setItem(this.STORAGE_KEY, String(number || "").trim());
    } catch {}
  },

  _languageNumberToHtmlLang(number) {
    if (number === "L2") return "ja";
    if (number === "L3") return "zh-Hant";
    return "en";
  },

  _applyDocumentLanguage() {
    if (!document?.documentElement) return;
    document.documentElement.lang = this._languageNumberToHtmlLang(this.currentNumber);
  },

  _detectBrowserLanguageNumber() {
    const browserLanguages = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language, navigator.userLanguage].filter(Boolean);

    for (const lang of browserLanguages) {
      const normalized = String(lang || "").trim().toLowerCase().replace(/_/g, "-");
      if (!normalized) continue;

      if (normalized === "ja" || normalized.startsWith("ja-")) {
        return "L2";
      }

      if (
        normalized === "zh" ||
        normalized.startsWith("zh-tw") ||
        normalized.startsWith("zh-hk") ||
        normalized.startsWith("zh-cn") ||
        normalized.startsWith("zh-sg") ||
        normalized.startsWith("zh-")
      ) {
        return "L3";
      }
    }

    return "L1";
  },

  _detectInitialLanguageNumber() {
    const bootLang = String(window.__GGIS_BOOT_LANG__ || "").trim();
    const saved = this._readSavedLanguageNumber();
    const detected = saved || bootLang || this._detectBrowserLanguageNumber();
    return this._findLanguageRowByNumber(detected)?.Number || this.languages[0]?.Number || "L1";
  },

  setLanguage(number) {
    if (this.failed) return;
    const row = this._findLanguageRowByNumber(number);
    if (!row) return;
    this.current = row.internal;
    this.currentNumber = row.Number;
    this._saveLanguageNumber(row.Number);
    this._applyDocumentLanguage();
    window.dispatchEvent(new CustomEvent("GGIS_LANG_CHANGED", {
      detail: {
        lang: row.internal,
        number: row.Number,
      },
    }));
  },

  _buildMessageMap(rows) {
    this.messages = {};
    for (const r of rows) {
      const key = String(r?.key || "").trim();
      if (!key) continue;
      this.messages[key] = {
        L1: String(r?.name_L1 ?? ""),
        L2: String(r?.name_L2 ?? ""),
        L3: String(r?.name_L3 ?? ""),
      };
    }
  },

  t(key) {
    if (this.failed) return "I18N_INIT_FAILED";
    const entry = this.messages[String(key || "")];
    if (!entry) return "I18N_INIT_FAILED";
    const value = entry[this.current || "L1"];
    if (!String(value || "").trim()) return "I18N_INIT_FAILED";
    return String(value);
  },
};

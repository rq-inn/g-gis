(() => {
  const LS_KEY = "GGIS_ACCESS_V1";

  const LOCKED_STATE = {
    accessClass: "",
    availableMapsets: [],
    mapsetsStandard: false,
    mapsetsEnglish: false,
    mapsetsJapanese: false,
    verified: false,
    unlocked: false,
    updatedAt: 0,
  };

  const AccessAuth = {
    _state: { ...LOCKED_STATE },
    _ready: false,

    async init() {
      if (this._ready) return this.getState();

      try {
        await window.AccessTable?.load?.();
      } catch (_) {
      }

      this._state = {
        ...LOCKED_STATE,
        updatedAt: Date.now(),
      };
      this._saveToStorage();
      this._ready = true;
      this._emitChanged();
      return this.getState();
    },

    getState() {
      return {
        ...this._state,
        availableMapsets: Array.isArray(this._state.availableMapsets)
          ? this._state.availableMapsets.slice()
          : [],
      };
    },

    isUnlocked() {
      return !!(this._state.unlocked && this._state.verified);
    },

    async applyAccessClass(accessClass) {
      const next = await this._buildStateFromAccessClass(accessClass);
      if (!next) {
        return { ok: false, reason: "NOT_FOUND" };
      }

      this._state = {
        ...LOCKED_STATE,
        ...next,
        verified: true,
        unlocked: true,
        updatedAt: Date.now(),
      };
      this._saveToStorage();
      this._emitChanged();
      return { ok: true, state: this.getState() };
    },

    async authenticate(accessClassLikeInput) {
      return await this.applyAccessClass(accessClassLikeInput);
    },

    resetToDefault() {
      this._state = {
        ...LOCKED_STATE,
        updatedAt: Date.now(),
      };
      this._saveToStorage();
      this._emitChanged();
      return this.getState();
    },

    isEnglishUnlocked() {
      return this.canUseLabelMode("english");
    },

    isMapsetAllowed(mapsetName) {
      if (!this.isUnlocked()) return false;
      const key = String(mapsetName || "").trim();
      return (this._state.availableMapsets || []).includes(key);
    },

    canUseLabelMode(mode) {
      if (!this.isUnlocked()) return false;

      const normalizedMode = String(mode || "").trim().toLowerCase();
      if (normalizedMode === "english") {
        return this.isMapsetAllowed("mapset_standard") && this.isMapsetAllowed("mapset_english");
      }
      if (normalizedMode === "japanese") {
        return this.isMapsetAllowed("mapset_standard") && this.isMapsetAllowed("mapset_japanese");
      }
      return false;
    },

    getAvailableLabelModes() {
      if (!this.isUnlocked()) return [];

      const out = [];
      if (this.canUseLabelMode("japanese")) out.push("japanese");
      if (this.canUseLabelMode("english")) out.push("english");
      return out;
    },

    getPreferredLabelMode() {
      const modes = this.getAvailableLabelModes();
      if (modes.includes("japanese")) return "japanese";
      if (modes.includes("english")) return "english";
      return "japanese";
    },

    async _buildStateFromAccessClass(accessClass) {
      const row = await window.AccessTable?.findByAccessClass?.(accessClass);
      if (!row) return null;

      const availableMapsets = [];
      if (row.mapset_standard) availableMapsets.push("mapset_standard");
      if (row.mapset_english) availableMapsets.push("mapset_english");
      if (row.mapset_japanese) availableMapsets.push("mapset_japanese");

      return {
        accessClass: row.Access_Class,
        availableMapsets,
        mapsetsStandard: !!row.mapset_standard,
        mapsetsEnglish: !!row.mapset_english,
        mapsetsJapanese: !!row.mapset_japanese,
      };
    },

    _saveToStorage() {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(this._state));
      } catch (_) {
      }
    },

    _emitChanged() {
      try {
        window.dispatchEvent(new CustomEvent("GGIS_ACCESS_CHANGED", { detail: this.getState() }));
      } catch (_) {
      }
    },
  };

  window.AccessAuth = AccessAuth;
})();

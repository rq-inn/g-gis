(() => {
  const PASSWORD_TO_CLASS = {
    "1111": "Japanese",
    "2222": "English",
    "1625ST": "Golden",
  };

  const ACCESS_CLASS_KEY_BY_VALUE = {
    Japanese: "ACCESS_CLASS_JAPANESE",
    English: "ACCESS_CLASS_ENGLISH",
    Golden: "ACCESS_CLASS_GOLDEN",
  };

  const UNLOCK_SUCCESS_KEY_BY_VALUE = {
    Japanese: "UNLOCK_SUCCESS_JAPANESE",
    English: "UNLOCK_SUCCESS_ENGLISH",
    Golden: "UNLOCK_SUCCESS_GOLDEN",
  };

  const UnlockUI = {
    mounted: false,
    _msgTimer: null,

    _t(key, fallback = "") {
      const text = window.I18N?.t?.(key);
      return text && text !== "I18N_INIT_FAILED" ? text : fallback;
    },

    _accessClassLabel(accessClass) {
      const value = String(accessClass || "").trim();
      const key = ACCESS_CLASS_KEY_BY_VALUE[value];
      return key ? this._t(key, value) : value;
    },

    async mount() {
      const area = document.getElementById("unlockArea");
      if (!area) return;

      if (!this.mounted) {
        this._install(area);
        this.mounted = true;
      }

      this._applyI18NTexts();
      this._applyState(window.AccessAuth?.getState?.());
    },

    _install(area) {
      area.innerHTML = `
        <div class="gg-unlock-grid">
          <div class="gg-unlock-row">
            <input id="ggisUnlockInput" class="gg-unlock-input" type="password" autocomplete="off" inputmode="text" />
            <button id="ggisUnlockBtn" class="gg-unlock-btn" type="button"></button>
          </div>
          <div id="ggisUnlockMsg" class="gg-unlock-msg"></div>
        </div>
      `;

      const input = document.getElementById("ggisUnlockInput");
      const btn = document.getElementById("ggisUnlockBtn");
      this._applyI18NTexts();

      const runUnlock = async () => {
        if (!input || !btn) return;

        const password = String(input.value || "");
        const accessClass = PASSWORD_TO_CLASS[password] || "";
        input.value = "";

        if (!accessClass) {
          this._setMsg(this._t("UNLOCK_INVALID_PASSWORD"));
          return;
        }

        btn.disabled = true;
        try {
          const result = await window.AccessAuth?.applyAccessClass?.(accessClass);
          if (!result?.ok) {
            this._setMsg(this._t("UNLOCK_FAILED"));
            return;
          }

          const state = result.state || window.AccessAuth?.getState?.();
          const currentMode = window.MapCanvas?.getLabelMode?.() || "japanese";
          const nextMode = window.AccessAuth?.canUseLabelMode?.(currentMode)
            ? currentMode
            : window.AccessAuth?.getPreferredLabelMode?.() || "japanese";

          window.AccessUI?.applyAccessToDom?.(state);
          window.UI?.applyAccessState?.(state);
          window.LanguageSelect?.applyAccessState?.(state);

          const hasLayers = (window.MapCanvas?.getLayerList?.() || []).length > 0;
          if (!hasLayers) {
            window.MapCanvas?.handleAccessChange?.(state, { preferredLabelMode: nextMode });
          } else if (window.MapCanvas?.getLabelMode?.() !== nextMode) {
            window.MapCanvas?.setLabelMode?.(nextMode);
          }

          window.UI?.renderLayerList?.();

          this._applyState(state);
          this._setMsg(this._t(UNLOCK_SUCCESS_KEY_BY_VALUE[accessClass], this._accessClassLabel(accessClass)));
        } catch (e) {
          console.error("[UnlockUI] unlock failed:", e);
          this._setMsg(this._t("UNLOCK_FAILED"));
        } finally {
          btn.disabled = false;
        }
      };

      btn?.addEventListener("click", runUnlock);
      input?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          runUnlock();
        }
      });

      window.addEventListener("GGIS_ACCESS_CHANGED", (event) => {
        this._applyState(event?.detail || window.AccessAuth?.getState?.());
      });

      window.addEventListener("GGIS_LANG_CHANGED", () => {
        this._applyI18NTexts();
        this._applyState(window.AccessAuth?.getState?.());
      });
    },

    _applyI18NTexts() {
      const input = document.getElementById("ggisUnlockInput");
      const btn = document.getElementById("ggisUnlockBtn");
      if (input) input.placeholder = this._t("UNLOCK_PASSWORD_LABEL");
      if (btn) btn.textContent = this._t("UNLOCK_BUTTON");
    },

    _applyState() {
      const input = document.getElementById("ggisUnlockInput");
      if (!input) return;
      input.placeholder = this._t("UNLOCK_PASSWORD_LABEL");
    },

    _setMsg(text) {
      const msg = document.getElementById("ggisUnlockMsg");
      if (!msg) return;

      msg.textContent = text;
      clearTimeout(this._msgTimer);
      this._msgTimer = setTimeout(() => {
        msg.textContent = "";
      }, 2500);
    },
  };

  window.UnlockUI = UnlockUI;
})();

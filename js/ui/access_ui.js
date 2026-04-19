(() => {
  const ACCESS_CLASS_KEY_BY_VALUE = {
    Japanese: "ACCESS_CLASS_JAPANESE",
    English: "ACCESS_CLASS_ENGLISH",
    Golden: "ACCESS_CLASS_GOLDEN",
  };

  const UI = {
    mounted: false,
    _msgTimer: null,
    _accessClasses: [],

    async mount() {
      const area = document.getElementById("ggisAccessArea") || document.getElementById("accessArea");
      if (!area) {
        console.warn("[AccessUI] accessArea not found");
        return;
      }

      await window.AccessAuth?.init?.();
      this._accessClasses = await window.AccessTable?.listAccessClasses?.() || [];

      if (!this.mounted) {
        this._installIntoAccessArea(area);
        this.mounted = true;

        window.addEventListener("GGIS_ACCESS_CHANGED", (e) => {
          const st = e.detail || window.AccessAuth?.getState?.() || this._fallbackState();
          this.applyAccessToDom(st);
        });

        window.addEventListener("GGIS_LANG_CHANGED", () => {
          this._applyI18NTexts();
          this.applyAccessToDom(window.AccessAuth?.getState?.() || this._fallbackState());
        });
      }

      this.applyAccessToDom(window.AccessAuth?.getState?.() || this._fallbackState());
    },

    _t(key, fallback = "") {
      const text = window.I18N?.t?.(key);
      return text && text !== "I18N_INIT_FAILED" ? text : fallback;
    },

    _accessClassLabel(accessClass) {
      const value = String(accessClass || "").trim();
      const key = ACCESS_CLASS_KEY_BY_VALUE[value];
      return key ? this._t(key, value) : value;
    },

    _fallbackState() {
      return {
        accessClass: "",
        availableMapsets: [],
        mapsetsStandard: false,
        mapsetsEnglish: false,
        mapsetsJapanese: false,
        unlocked: false,
        verified: false,
      };
    },

    _installIntoAccessArea(area) {
      area.innerHTML = `
        <div id="ggisAccessBox" class="gg-access-box">
          <div class="gg-access-row">
            <label id="ggisAccessClassLabel" class="gg-access-label" for="ggisAccessClassSelect"></label>
            <select id="ggisAccessClassSelect" class="gg-access-select"></select>
          </div>
          <div id="ggisAccessMsg" class="gg-access-msg"></div>
        </div>
      `;

      this._applyI18NTexts();

      const classSelect = document.getElementById("ggisAccessClassSelect");
      classSelect?.addEventListener("change", () => {
        const state = window.AccessAuth?.getState?.() || this._fallbackState();
        classSelect.value = String(state.accessClass || "");
      });
    },

    _applyI18NTexts() {
      const classLabel = document.getElementById("ggisAccessClassLabel");
      if (classLabel) classLabel.textContent = this._t("ACCESS_CLASS");
    },

    _renderAccessClassOptions(state) {
      const select = document.getElementById("ggisAccessClassSelect");
      if (!select) return;

      const current = String(state?.accessClass || "").trim();
      const unlocked = !!state?.unlocked;
      select.innerHTML = "";

      for (const accessClass of this._accessClasses) {
        const opt = document.createElement("option");
        opt.value = accessClass;
        opt.textContent = this._accessClassLabel(accessClass);
        opt.selected = accessClass === current;
        opt.disabled = unlocked && accessClass !== current;
        select.appendChild(opt);
      }

      if (!unlocked) {
        select.selectedIndex = -1;
      }
    },

    applyAccessToDom(state) {
      const nextState = state || this._fallbackState();
      const unlocked = !!nextState.unlocked;
      const box = document.getElementById("ggisAccessBox");
      const select = document.getElementById("ggisAccessClassSelect");

      this._renderAccessClassOptions(nextState);

      if (select) {
        select.disabled = !unlocked;
        select.setAttribute("aria-disabled", unlocked ? "false" : "true");
      }

      if (box) {
        box.classList.toggle("is-disabled", !unlocked);
      }
    },
  };

  window.AccessUI = UI;
})();

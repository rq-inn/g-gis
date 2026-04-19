window.LanguageSelect = {
  _bound: false,

  render() {
    const host = document.getElementById('globalLanguageArea') || document.getElementById('languageArea');
    if (!host) return;

    host.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'gg-language-select-wrap';

    const label = document.createElement('span');
    label.className = 'gg-language-select-label';
    label.textContent = window.I18N?.t?.('LANGUAGE_FIXED_LABEL') || 'Language';

    const select = document.createElement('select');
    select.id = 'languageSelect';
    select.className = 'gg-language-select';
    const ariaLabel = window.I18N?.t?.('LANGUAGE');
    select.setAttribute('aria-label', ariaLabel && ariaLabel !== 'I18N_INIT_FAILED' ? ariaLabel : '');

    const list = Array.isArray(window.I18N?.languages) ? window.I18N.languages : [];
    const current = window.I18N?.currentNumber || 'L1';

    for (const row of list) {
      const num = String(row?.Number ?? '').trim();
      if (!num) continue;

      const opt = document.createElement('option');
      opt.value = num;
      opt.textContent = String(row?.language || num);
      opt.selected = num === current;
      select.appendChild(opt);
    }

    select.addEventListener('change', () => {
      window.I18N?.setLanguage?.(select.value);
    });

    wrap.appendChild(label);
    wrap.appendChild(select);
    host.appendChild(wrap);

    if (!this._bound) {
      this._bound = true;
      window.addEventListener('GGIS_LANG_CHANGED', () => {
        this.render();
      });
    }
  },
};

(() => {
  const ACCESS_CSV_PATH = "./data/acces_permission.csv";

  function parseCSV(text) {
    const lines = String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (!lines.length) return [];

    const rows = [];
    const header = splitCSVLine(lines[0]);

    for (let i = 1; i < lines.length; i++) {
      const cols = splitCSVLine(lines[i]);
      const obj = {};
      header.forEach((k, idx) => {
        obj[k] = cols[idx] ?? "";
      });
      rows.push(obj);
    }

    return rows;
  }

  function splitCSVLine(line) {
    const out = [];
    let cur = "";
    let inQ = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
        continue;
      }

      if (ch === "," && !inQ) {
        out.push(cur.trim());
        cur = "";
        continue;
      }

      cur += ch;
    }

    out.push(cur.trim());
    return out;
  }

  function toBool(v) {
    const s = String(v ?? "").trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes";
  }

  function normalizeRow(r) {
    return {
      Access_Class: String(r.Access_Class || "").trim(),
      mapset_standard: toBool(r.Mapset_standard ?? r.Mapsets_standard),
      mapset_english: toBool(r.Mapset_english ?? r.Mapsets_english),
      mapset_japanese: toBool(r.Mapset_japanese ?? r.Mapsets_japanese),
    };
  }

  const AccessTable = {
    _loaded: false,
    _loadingPromise: null,
    _rows: [],

    async load() {
      if (this._loaded) return this._rows;
      if (this._loadingPromise) return this._loadingPromise;

      this._loadingPromise = (async () => {
        try {
          if (window.CSV?.load) {
            const rows = await window.CSV.load(ACCESS_CSV_PATH);
            this._rows = (rows || []).map(normalizeRow).filter((r) => r.Access_Class);
            this._loaded = true;
            return this._rows;
          }
        } catch (_) {
        }

        const res = await fetch(ACCESS_CSV_PATH, { cache: "no-store" });
        if (!res.ok) throw new Error("ACCESS_PERMISSION_FETCH_FAILED");
        const text = await res.text();
        const raw = parseCSV(text);
        this._rows = raw.map(normalizeRow).filter((r) => r.Access_Class);
        this._loaded = true;
        return this._rows;
      })();

      return this._loadingPromise;
    },

    async getAll() {
      return await this.load();
    },

    async listAccessClasses() {
      const rows = await this.load();
      return rows.map((r) => r.Access_Class);
    },

    async findByAccessClass(accessClass) {
      const rows = await this.load();
      const key = String(accessClass || "").trim().toLowerCase();
      return rows.find((r) => String(r.Access_Class || "").trim().toLowerCase() === key) || null;
    },

    async getAllowedMapsets(accessClass) {
      const row = await this.findByAccessClass(accessClass);
      if (!row) return [];

      const out = [];
      if (row.mapset_standard) out.push("mapset_standard");
      if (row.mapset_english) out.push("mapset_english");
      if (row.mapset_japanese) out.push("mapset_japanese");
      return out;
    },

    async isMapsetAllowed(accessClass, mapsetName) {
      const list = await this.getAllowedMapsets(accessClass);
      return list.includes(String(mapsetName || "").trim());
    },
  };

  window.AccessTable = AccessTable;
})();

// js/logic/mapsets_loader.js
// ===== MapsetsLoader (CSV-driven mapset definitions) =====
// Source of truth: /data/mapsets.csv
// Header required:
// mapsets_name,layer_1,layer_2,layer_3,layer_4,layer_5,layer_6
//
// Rules:
// - Empty cells are ignored
// - layer_1 is base (fit 기준)
// - Column order = draw order (z-index auto)
// - "Icons.png" is treated as a CANVAS layer (keep), not an image

window.MapsetsLoader = {
  _loaded: false,
  _loadingPromise: null,
  _map: new Map(),

  async load() {
    if (this._loaded) return;
    if (this._loadingPromise) return this._loadingPromise;

    this._loadingPromise = (async () => {
      const url = "./data/mapsets.csv";
      let text = "";

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP_${res.status}`);
      text = await res.text();

      const rows = this._parseCsv_(text);
      if (!rows.length) {
        this._map = new Map();
        this._loaded = true;
        return;
      }

      // header (BOM対応)
      const header = rows[0].map((s) => String(s || "").trim());
      if (header.length) header[0] = header[0].replace(/^\uFEFF/, ""); // BOM strip

      const idxName = header.indexOf("mapsets_name");
      if (idxName < 0) throw new Error("MAPSETS_CSV_HEADER_INVALID");

      const layerIdxs = [];
      for (let i = 1; i <= 6; i++) {
        const k = `layer_${i}`;
        const idx = header.indexOf(k);
        if (idx >= 0) layerIdxs.push(idx);
      }
      if (!layerIdxs.length) throw new Error("MAPSETS_CSV_NO_LAYER_COLUMNS");

      const m = new Map();
      for (let r = 1; r < rows.length; r++) {
        const cols = rows[r];
        const name = String(cols[idxName] || "").trim();
        if (!name) continue;

        const layers = [];
        for (const li of layerIdxs) {
          const v = String(cols[li] || "").trim();
          if (!v) continue;
          layers.push(v);
        }
        m.set(name, layers);
      }

      this._map = m;
      this._loaded = true;
    })();

    return this._loadingPromise;
  },

  getLayers(mapsetName) {
    const n = String(mapsetName || "").trim();
    if (!n) return null;
    return this._map.get(n) || null;
  },

  // Small CSV parser (quotes supported)
  _parseCsv_(text) {
    const s = String(text || "");
    const out = [];

    let row = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < s.length; i++) {
      const ch = s[i];

      if (inQuotes) {
        if (ch === '"') {
          const next = s[i + 1];
          if (next === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
        continue;
      }

      if (ch === ",") {
        row.push(cur);
        cur = "";
        continue;
      }

      if (ch === "\n") {
        row.push(cur.replace(/\r$/, ""));
        cur = "";
        const nonEmpty = row.some((c) => String(c || "").trim() !== "");
        if (nonEmpty) out.push(row);
        row = [];
        continue;
      }

      cur += ch;
    }

    row.push(cur.replace(/\r$/, ""));
    const nonEmpty = row.some((c) => String(c || "").trim() !== "");
    if (nonEmpty) out.push(row);

    return out;
  },
};
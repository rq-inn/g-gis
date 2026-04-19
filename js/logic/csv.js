// js/logic/csv.js
// ===== Minimal CSV Loader/Parser (header required) =====
// - BOM除去
// - 空行/空セル耐性
// - ダブルクォートの基本対応（カンマ/改行を含むセル）

window.CSV = {
  async load(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`CSV_FETCH_FAILED: ${url} (${res.status})`);
    const text = await res.text();
    return this.parse(text);
  },

  parse(text) {
    if (typeof text !== "string") return [];

    // BOM除去
    const src = text.replace(/^\uFEFF/, "");

    // 行単位でパース（クォート対応の簡易実装）
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      const next = src[i + 1];

      if (ch === '"') {
        if (inQuotes && next === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (!inQuotes && ch === ",") {
        row.push(cell);
        cell = "";
        continue;
      }

      if (!inQuotes && (ch === "\n" || ch === "\r")) {
        // CRLF対応
        if (ch === "\r" && next === "\n") i++;

        row.push(cell);
        cell = "";

        // 空行スキップ（セル全部空なら捨てる）
        const allEmpty = row.every(v => String(v ?? "").trim() === "");
        if (!allEmpty) rows.push(row);

        row = [];
        continue;
      }

      cell += ch;
    }

    // last cell
    row.push(cell);
    const allEmpty = row.every(v => String(v ?? "").trim() === "");
    if (!allEmpty) rows.push(row);

    if (!rows.length) return [];

    // ヘッダー必須
    const header = rows[0].map(h => String(h ?? "").trim());
    const dataRows = rows.slice(1);

    const out = [];
    for (const r of dataRows) {
      const obj = {};
      for (let c = 0; c < header.length; c++) {
        const key = header[c];
        if (!key) continue;
        obj[key] = (r[c] ?? "").toString();
      }
      out.push(obj);
    }
    return out;
  }
};
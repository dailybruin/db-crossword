// Read the crossword catalog from a Google Sheet published as CSV, and resolve
// Google Drive share links to direct-download URLs. No API key / no auth: the
// sheet is Published-to-web and the Drive files are shared "anyone with link".
import fetch from "node-fetch";

// Minimal RFC-4180 CSV parser: handles quoted fields, embedded commas/quotes
// ("" escape), and CRLF or LF line endings. Returns an array of string arrays.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } // escaped quote
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field); field = "";
    } else if (ch === "\n") {
      row.push(field); field = ""; rows.push(row); row = [];
    } else if (ch === "\r") {
      // ignore; \n handles the line break
    } else {
      field += ch;
    }
  }
  // flush trailing field/row (no final newline)
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// Fetch the published CSV and turn it into row objects keyed by header name.
export async function fetchRows(csvUrl) {
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  const grid = parseCsv(await res.text());
  if (grid.length === 0) return [];
  const headers = grid[0].map((h) => h.trim().toLowerCase());
  return grid.slice(1).map((cols) => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (cols[idx] ?? "").trim(); });
    return obj;
  });
}

// Active, playable rows of a type (must have a date and a file), newest date
// first. Dates are YYYY-MM-DD so a lexicographic compare sorts them correctly;
// the sort is stable, so equal dates keep sheet order and the higher row wins
// ties. Defensive: skip rows missing the fields we need.
export function activePuzzles(rows, type) {
  const candidates = rows.filter(
    (r) =>
      r.type?.toLowerCase() === type.toLowerCase() &&
      r.active?.toLowerCase() === "true" &&
      r.date &&
      r.puz_url
  );
  candidates.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return candidates;
}

// The single newest active puzzle of a type (what the /latest endpoint serves).
export function pickLatest(rows, type) {
  return activePuzzles(rows, type)[0] || null;
}

// The active row for a specific date. If a date somehow has two active rows,
// the newest-wins tie rule above decides — same row listPuzzles shows.
export function pickByDate(rows, type, date) {
  return activePuzzles(rows, type).find((r) => r.date === date) || null;
}

// Lightweight catalog for the archive + calendar: date / title / author only,
// one entry per date, newest first. No .puz downloads happen here, so this
// stays cheap even with hundreds of puzzles.
export function listPuzzles(rows, type) {
  const seen = new Set();
  const out = [];
  for (const r of activePuzzles(rows, type)) {
    if (seen.has(r.date)) continue; // one entry per date (see pickByDate)
    seen.add(r.date);
    out.push({ date: r.date, title: r.title || "", author: r.author || "" });
  }
  return out;
}

// Turn any Google Drive share link (or bare id / uc URL) into a direct-download
// URL the server can GET without auth.
export function driveDirectUrl(link) {
  if (!link) return link;
  if (link.includes("uc?export=download")) return link;
  // matches /d/<id>/ , id=<id>, or a bare id token
  const m =
    link.match(/\/d\/([-\w]{20,})/) ||
    link.match(/[?&]id=([-\w]{20,})/) ||
    link.match(/^([-\w]{20,})$/);
  const id = m ? m[1] : null;
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : link;
}

// Download the .puz bytes for a row's puz_url.
export async function fetchPuz(puzUrl) {
  const res = await fetch(driveDirectUrl(puzUrl));
  if (!res.ok) throw new Error(`Puz fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

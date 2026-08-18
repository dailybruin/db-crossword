import express from 'express';
import cors from "cors";
import fetch from 'node-fetch';
import { fetchRows, pickLatest, fetchPuz } from './sheet.js';
import { toCrossword } from './puz.js';

const app = express();
app.use(cors())

const port = 3000;

// When set, puzzles are read from a Google Sheet (published as CSV) + Drive.
// When unset, we fall back to the legacy WordPress source so nothing breaks
// before cutover.
const SHEET_URL = process.env.CROSSWORD_SHEET_URL;

// Per-type cache so we only download + convert a .puz when the latest row's
// puz_url changes. Single backend replica, so an in-process cache is enough.
// We cache only the expensive part (download + convert) keyed on puz_url, and
// re-apply the Sheet's author/title/date on every request so metadata edits
// show up without a puz file change or a restart.
const cache = {};    // { [type]: { puzUrl, crossword } }  -- cached conversion
const lastGood = {}; // { [type]: payload }                -- for defensive fallback

async function latestFromSheet(type) {
  const rows = await fetchRows(SHEET_URL);
  const row = pickLatest(rows, type);

  // No published puzzle of this type yet -> explicit empty state (not an error).
  if (!row) return { date: null, crossword: null, empty: true };

  // Reuse the cached conversion only if the underlying file is the same.
  let base = cache[type];
  if (!base || base.puzUrl !== row.puz_url) {
    base = { puzUrl: row.puz_url, crossword: toCrossword(await fetchPuz(row.puz_url)) };
    cache[type] = base;
  }

  // Apply the current Sheet metadata fresh each request (editor-controlled and
  // authoritative), without mutating the cached conversion.
  const crossword = { ...base.crossword, meta: { ...base.crossword.meta } };
  if (row.author) crossword.meta.author = row.author;
  // The Sheet is authoritative for the displayed title: if the cell is blank,
  // show no title rather than leaking the .puz's internal name (often a filename).
  crossword.meta.title = row.title || "";

  const payload = { date: row.date, crossword };
  lastGood[type] = payload;
  return payload;
}

// Legacy WordPress source (used only when CROSSWORD_SHEET_URL is unset).
async function latestFromWordpress(type) {
  const listFile = type === 'mini' ? "mini-crossword-list.txt" : "crossword-list.txt";
  const meta = await fetch(`https://wp.dailybruin.com/wp-content/crosswords/${listFile}`);
  const all_files = (await meta.text()).split("\n");
  const latest_file = all_files.length > 0 ? all_files[0].trim() : "";
  const crosswordRes = await fetch(`https://wp.dailybruin.com/wp-content/crosswords/${latest_file}`);
  const crossword = await crosswordRes.json();
  const date = latest_file.split('/').at(-1).substring(0, 10);
  return { date, crossword };
}

app.get("/api/crossword/latest", async (req, res) => {
  const type = req.query.type === 'mini' ? 'mini' : 'standard';
  try {
    const payload = SHEET_URL
      ? await latestFromSheet(type)
      : await latestFromWordpress(type);
    res.json(payload);
  } catch (err) {
    console.error(err);
    // Defensive: if a bad Sheet edit breaks the latest row, keep serving the
    // last good puzzle instead of taking the site down.
    if (SHEET_URL && lastGood[type]) return res.json(lastGood[type]);
    res.status(500).send("Server error fetching crossword");
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

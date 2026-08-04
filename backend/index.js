import express from 'express';
import cors from "cors";
import fetch from 'node-fetch';
import { fetchRows, pickLatest, fetchPuz } from './sheet.js';
import { puzToCrossword } from './puz.js';

const app = express();
app.use(cors())

const port = 3000;

// When set, puzzles are read from a Google Sheet (published as CSV) + Drive.
// When unset, we fall back to the legacy WordPress source so nothing breaks
// before cutover.
const SHEET_URL = process.env.CROSSWORD_SHEET_URL;

// Per-type cache so we only download + convert a .puz when the latest row's
// puz_url changes. Single backend replica, so an in-process cache is enough.
// Shape: { [type]: { puzUrl, payload } }
const cache = {};

async function latestFromSheet(type) {
  const rows = await fetchRows(SHEET_URL);
  const row = pickLatest(rows, type);

  // No published puzzle of this type yet -> explicit empty state (not an error).
  if (!row) return { date: null, crossword: null, empty: true };

  // Serve cached conversion if the latest puzzle hasn't changed.
  const cached = cache[type];
  if (cached && cached.puzUrl === row.puz_url) return cached.payload;

  const crossword = puzToCrossword(await fetchPuz(row.puz_url));
  // The Sheet's author/title are editor-controlled and authoritative.
  if (row.author) crossword.meta.author = row.author;
  if (row.title) crossword.meta.title = row.title;

  const payload = { date: row.date, crossword };
  cache[type] = { puzUrl: row.puz_url, payload };
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
    if (SHEET_URL && cache[type]) return res.json(cache[type].payload);
    res.status(500).send("Server error fetching crossword");
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

import express from 'express';
import cors from "cors";
import fetch from 'node-fetch';
import { fetchRows, pickLatest, pickByDate, listPuzzles, fetchPuz } from './sheet.js';
import { toCrossword } from './puz.js';

const app = express();
app.use(cors())

const port = 3000;

// When set, puzzles are read from a Google Sheet (published as CSV) + Drive.
// When unset, we fall back to the legacy WordPress source so nothing breaks
// before cutover. The archive (list / by-date) is a Sheets-era feature and is
// inert without a Sheet URL.
const SHEET_URL = process.env.CROSSWORD_SHEET_URL;

// Converted puzzles cached by their Drive file URL, so browsing several past
// puzzles doesn't re-download + re-convert the same file. Bounded: when it
// grows past MAX_CACHE, the oldest inserted entry is dropped. Single backend
// replica, so an in-process cache is enough.
const MAX_CACHE = 60;
const convCache = new Map(); // puz_url -> converted crossword
const lastGood = {};         // type -> latest payload, for defensive fallback

async function convert(puzUrl) {
  const hit = convCache.get(puzUrl);
  if (hit) return hit;
  const crossword = toCrossword(await fetchPuz(puzUrl));
  convCache.set(puzUrl, crossword);
  if (convCache.size > MAX_CACHE) convCache.delete(convCache.keys().next().value);
  return crossword;
}

// Build the response for a single Sheet row: the cached conversion plus the
// Sheet's own author/title applied fresh each request (editor-controlled and
// authoritative), without mutating the cached conversion. The Sheet is the
// source of truth for the displayed title: a blank cell shows no title rather
// than leaking the .puz's internal name (often a filename).
async function payloadForRow(row) {
  const base = await convert(row.puz_url);
  const crossword = { ...base, meta: { ...base.meta } };
  if (row.author) crossword.meta.author = row.author;
  crossword.meta.title = row.title || "";
  return { date: row.date, crossword };
}

async function latestFromSheet(type) {
  const row = pickLatest(await fetchRows(SHEET_URL), type);
  // No published puzzle of this type yet -> explicit empty state (not an error).
  if (!row) return { date: null, crossword: null, empty: true };
  const payload = await payloadForRow(row);
  lastGood[type] = payload;
  return payload;
}

async function byDateFromSheet(type, date) {
  const row = pickByDate(await fetchRows(SHEET_URL), type, date);
  // No active puzzle at that date -> empty state (front end shows "not found").
  if (!row) return { date: null, crossword: null, empty: true };
  return payloadForRow(row);
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

// The archive catalog: every past puzzle of a type, newest first (metadata
// only). Feeds both the calendar and the Previous Puzzles page.
app.get("/api/crossword/list", async (req, res) => {
  const type = req.query.type === 'mini' ? 'mini' : 'standard';
  if (!SHEET_URL) return res.json({ type, puzzles: [] });
  try {
    const puzzles = listPuzzles(await fetchRows(SHEET_URL), type);
    res.json({ type, puzzles });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error listing crosswords");
  }
});

// A specific past puzzle, played by date. Same response shape as /latest.
app.get("/api/crossword/by-date", async (req, res) => {
  const type = req.query.type === 'mini' ? 'mini' : 'standard';
  const date = String(req.query.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).send("Bad or missing date");
  if (!SHEET_URL) return res.status(404).send("Archive requires the Sheet source");
  try {
    res.json(await byDateFromSheet(type, date));
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error fetching crossword");
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// Convert a .puz file (binary Buffer) into the JSON shape consumed by
// @jaredreisinger/react-crossword: { meta, across, down }, where each clue is
// { answer, row, col, clue }.
//
// Ported from backend/puz_to_json.py. @confuzzle/readpuz gives us the raw
// solution grid + a FLAT clue list, but not the clue numbering, so we replicate
// puzpy's DefaultClueNumbering algorithm here.
import pkg from "@confuzzle/readpuz";
const { readpuz } = pkg;

const BLOCK = ".";

// Accept either a binary .puz file or an already-converted crossword .json file
// (the standard puzzles historically exist only as scraped JSON, not .puz).
// Returns the { meta, across, down } shape the frontend expects.
export function toCrossword(buffer) {
  // .puz files start with binary checksum bytes; a JSON file starts with "{".
  const head = buffer.slice(0, 64).toString("utf8").trimStart();
  if (head.startsWith("{")) {
    const obj = JSON.parse(buffer.toString("utf8"));
    if (!obj.across || !obj.down) {
      throw new Error("JSON puzzle file is missing 'across'/'down'");
    }
    return { meta: obj.meta || {}, across: obj.across, down: obj.down };
  }
  return puzToCrossword(buffer);
}

// .puz v2.0 stores its text (clues, title, author) as UTF-8, but readpuz decodes
// every version as Latin-1 — so a 2.0 file's smart quotes, dashes and accents
// arrive mojibaked (e.g. a curly quote becomes "â\u0080\u009c"). The version
// string sits at offset 0x18 ("1.3\0", "2.0\0", ...). For 2.x we re-encode each
// string back to the raw bytes and decode them as the UTF-8 they really were;
// if that produces invalid UTF-8 we keep the original rather than risk garbage.
// Re-read a string that readpuz decoded as Latin-1 as the UTF-8 it really was.
// Plain ASCII is unchanged; if the bytes aren't valid UTF-8 we keep the original.
export function reDecodeUtf8(s) {
  if (typeof s !== "string") return s;
  const out = Buffer.from(s, "latin1").toString("utf8");
  return out.includes("�") ? s : out;
}

function makeTextFixer(buffer) {
  const isUtf8 = buffer.slice(0x18, 0x1c).toString("latin1").startsWith("2");
  return isUtf8 ? reDecodeUtf8 : (s) => s;
}

export function puzToCrossword(buffer) {
  const p = readpuz(buffer);
  const { width, height, solution } = p;
  const fixText = makeTextFixer(buffer);

  const cell = (r, c) => solution[r * width + c];
  const isBlock = (r, c) => cell(r, c) === BLOCK;

  // Walk right/down collecting answer letters until a block or edge.
  const acrossAnswer = (r, c) => {
    let letters = "";
    for (let cc = c; cc < width && !isBlock(r, cc); cc++) letters += cell(r, cc);
    return letters;
  };
  const downAnswer = (r, c) => {
    let letters = "";
    for (let rr = r; rr < height && !isBlock(rr, c); rr++) letters += cell(rr, c);
    return letters;
  };

  // Clue numbering: iterate cells in row-major order. A cell starts an across
  // word if it has a block/edge to its left and a non-block to its right; a down
  // word if it has a block/edge above and a non-block below. Clues are consumed
  // from the flat list in order, across before down for a given numbered cell.
  const across = {};
  const down = {};
  let di = 0;
  let num = 1;

  for (let i = 0; i < width * height; i++) {
    const r = Math.floor(i / width);
    const c = i % width;
    if (isBlock(r, c)) continue;

    const startsAcross =
      (c === 0 || isBlock(r, c - 1)) && c !== width - 1 && !isBlock(r, c + 1);
    const startsDown =
      (r === 0 || isBlock(r - 1, c)) && r !== height - 1 && !isBlock(r + 1, c);

    if (startsAcross) {
      across[String(num)] = { answer: acrossAnswer(r, c), row: r, col: c, clue: fixText(p.clues[di++]) };
    }
    if (startsDown) {
      down[String(num)] = { answer: downAnswer(r, c), row: r, col: c, clue: fixText(p.clues[di++]) };
    }
    if (startsAcross || startsDown) num++;
  }

  const meta = {
    title: fixText(p.title),
    author: fixText(p.author),
    copyright: fixText(p.copyright),
    width,
    height,
    num_clues: p.clues.length,
  };

  return { meta, across, down };
}

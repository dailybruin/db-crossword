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

export function puzToCrossword(buffer) {
  const p = readpuz(buffer);
  const { width, height, solution } = p;

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
      across[String(num)] = { answer: acrossAnswer(r, c), row: r, col: c, clue: p.clues[di++] };
    }
    if (startsDown) {
      down[String(num)] = { answer: downAnswer(r, c), row: r, col: c, clue: p.clues[di++] };
    }
    if (startsAcross || startsDown) num++;
  }

  const meta = {
    title: p.title,
    author: p.author,
    copyright: p.copyright,
    width,
    height,
    num_clues: p.clues.length,
  };

  return { meta, across, down };
}

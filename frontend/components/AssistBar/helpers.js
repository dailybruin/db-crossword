export function getHighlightedWordCells(cellSize = 10) {
  // Select all currently highlighted cells
  const highlightedRects = document.querySelectorAll(`
    .clue-cell rect[fill="rgb(255,255,204)"],
    .clue-cell rect[fill="rgb(255,255,0)"]
    `);

  if (!highlightedRects.length) return null;

  // Convert rect elements → grid coords
  const cells = Array.from(highlightedRects).map((rect) => {
    const x = parseFloat(rect.getAttribute("x"));
    const y = parseFloat(rect.getAttribute("y"));
    const col = Math.round((x - 0.125) / cellSize);
    const row = Math.round((y - 0.125) / cellSize);
    return { row, col, rect };
  });

  // Determine direction by checking if row or col is constant
  const allRowsSame = cells.every((c) => c.row === cells[0].row);
  const allColsSame = cells.every((c) => c.col === cells[0].col);

  let direction = null;
  if (allRowsSame) direction = "across";
  else if (allColsSame) direction = "down";
  else return null; // Something unexpected (should never happen)

  // Sort cells in natural reading order
  if (direction === "across") {
    cells.sort((a, b) => a.col - b.col);
  } else {
    cells.sort((a, b) => a.row - b.row);
  }

  return { direction, cells };
}

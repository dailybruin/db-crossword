/**
 * The puzzle's colors live here because react-crossword draws the grid as SVG
 * and takes its colors from a `theme` prop, not from CSS. Anything that needs
 * to match the grid (the clue list, the current-clue bar) reads the mirrored
 * custom properties in crossword.css — keep the two in sync.
 */
const INK = "#12161B";
const CELL = "#FFFFFF";
/** UCLA gold. Only ever one cell at a time — the one you're typing into. */
const BRUIN_GOLD = "#FFD100";
/** Pale UCLA blue, washed across the rest of the answer you're working on. */
const SKY = "#D8EAF7";

export const crosswordTheme = {
  gridBackground: INK,
  cellBackground: CELL,
  cellBorder: INK,
  textColor: INK,
  // The library default (0.25 alpha) is close to invisible on a phone.
  numberColor: "rgba(18, 22, 27, 0.5)",
  focusBackground: BRUIN_GOLD,
  highlightBackground: SKY,
};

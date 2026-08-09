/**
 * This app uses portions of the react-crossword project by Jared Reisinger.
 * https://github.com/JaredReisinger/react-crossword
 *
 * Copyright (c) 2019-2022, Jared Reisinger
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so, subject
 * to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 */

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  CrosswordProvider,
  CrosswordGrid,
  CrosswordContext,
} from "@jaredreisinger/react-crossword";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AssistBar from "../AssistBar";
import { crosswordTheme } from "./theme";
import { formatTime } from "./format";
import "./crossword.css";

/** react-crossword draws every cell as 10 units square in the SVG's viewBox. */
const CELL = 10;

export default function Crossword({ data }) {
  const crosswordRef = useRef(null);
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [wrongCells, setWrongCells] = useState(() => new Set());
  const [solved, setSolved] = useState(false);
  const [cardDismissed, setCardDismissed] = useState(false);
  // "Reveal all" fills the grid, which the library reports as a correct
  // crossword. Filling it in isn't solving it, so don't celebrate.
  const revealedAll = useRef(false);

  useEffect(() => {
    if (!isRunning) return undefined;
    const id = setInterval(() => setTime((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  // A letter the solver has retyped is no longer one we've marked wrong.
  const handleCellChange = useCallback((row, col) => {
    setWrongCells((prev) => {
      const key = `${row},${col}`;
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const handleCrosswordCorrect = useCallback((isCorrect) => {
    if (!isCorrect || revealedAll.current) return;
    setIsRunning(false);
    setSolved(true);
  }, []);

  const handleRevealAll = useCallback(() => {
    revealedAll.current = true;
    setIsRunning(false);
  }, []);

  const handleRestart = useCallback(() => {
    revealedAll.current = false;
    setTime(0);
    setIsRunning(true);
    setSolved(false);
    setCardDismissed(false);
  }, []);

  const answerCount = useMemo(
    () =>
      data
        ? Object.keys(data.across).length + Object.keys(data.down).length
        : 0,
    [data]
  );

  if (!data) return null;

  return (
    <CrosswordProvider
      ref={crosswordRef}
      data={data}
      theme={crosswordTheme}
      useStorage={false}
      onCellChange={handleCellChange}
      onCrosswordCorrect={handleCrosswordCorrect}
    >
      <Board
        data={data}
        crosswordRef={crosswordRef}
        time={time}
        isRunning={isRunning}
        onToggleTimer={() => setIsRunning((running) => !running)}
        wrongCells={wrongCells}
        setWrongCells={setWrongCells}
        onRevealAll={handleRevealAll}
        onRestart={handleRestart}
      />
      {solved && !cardDismissed && (
        <SolvedCard
          time={time}
          answers={answerCount}
          onClose={() => setCardDismissed(true)}
        />
      )}
    </CrosswordProvider>
  );
}

function Board({
  data,
  crosswordRef,
  time,
  isRunning,
  onToggleTimer,
  wrongCells,
  setWrongCells,
  onRevealAll,
  onRestart,
}) {
  const { rows, cols, gridData, selectedDirection, selectedNumber } =
    useContext(CrosswordContext);

  const checkAnswers = useCallback(() => {
    const wrong = new Set();
    gridData.forEach((rowData) =>
      rowData.forEach((cell) => {
        if (cell.used && cell.guess && cell.guess !== cell.answer) {
          wrong.add(`${cell.row},${cell.col}`);
        }
      })
    );
    setWrongCells(wrong);
    return wrong.size;
  }, [gridData, setWrongCells]);

  const revealWord = useCallback(() => {
    const entry = data?.[selectedDirection]?.[selectedNumber];
    if (!entry || !crosswordRef.current) return;
    const { row, col, answer } = entry;
    answer.split("").forEach((letter, i) => {
      const across = selectedDirection === "across";
      crosswordRef.current.setGuess(
        across ? row : row + i,
        across ? col + i : col,
        letter
      );
    });
  }, [crosswordRef, data, selectedDirection, selectedNumber]);

  const revealAll = useCallback(() => {
    onRevealAll();
    setWrongCells(new Set());
    crosswordRef.current?.fillAllAnswers();
  }, [crosswordRef, onRevealAll, setWrongCells]);

  const clearGrid = useCallback(() => {
    crosswordRef.current?.reset();
    setWrongCells(new Set());
    onRestart();
  }, [crosswordRef, onRestart, setWrongCells]);

  // The grid renders at its natural aspect ratio, so one measurement drives
  // both columns: the clue lists are exactly as tall as the puzzle.
  const sizing = useMemo(
    () => ({ "--aspect": rows ? cols / rows : 1 }),
    [cols, rows]
  );

  return (
    <div className="puzzle" data-size={cols <= 7 ? "small" : "full"} style={sizing}>
      <AssistBar
        time={time}
        isRunning={isRunning}
        onToggleTimer={onToggleTimer}
        onCheck={checkAnswers}
        onRevealWord={revealWord}
        onRevealAll={revealAll}
        onClear={clearGrid}
      />

      <div className="board">
        <div className="board__grid">
          <div className="puzzle-grid">
            <CrosswordGrid />
            <WrongMarks cells={wrongCells} rows={rows} cols={cols} />
          </div>
        </div>

        <CurrentClue />

        <div className="board__clues">
          <ClueList direction="across" label="Across" />
          <ClueList direction="down" label="Down" />
        </div>
      </div>
    </div>
  );
}

/**
 * Draws a slash through each letter "Check" found wrong, as an overlay sharing
 * the grid's viewBox. Marking the grid rather than rewriting its SVG means the
 * marks survive re-renders and clear themselves when a letter is retyped.
 */
function WrongMarks({ cells, rows, cols }) {
  if (!cells.size) return null;
  return (
    <svg
      className="wrong-marks"
      viewBox={`0 0 ${cols * CELL} ${rows * CELL}`}
      aria-hidden="true"
    >
      {Array.from(cells, (key) => {
        const [row, col] = key.split(",").map(Number);
        const x = col * CELL;
        const y = row * CELL;
        return (
          <line
            key={key}
            x1={x + 1.5}
            y1={y + CELL - 1.5}
            x2={x + CELL - 1.5}
            y2={y + 1.5}
          />
        );
      })}
    </svg>
  );
}

/**
 * The clue you're typing into, drawn as one magnified crossword cell: its
 * number sits in the corner exactly where a grid number does. Shown on narrow
 * screens, where the clue lists are too far down the page to read while
 * solving.
 */
function CurrentClue() {
  const { clues, selectedDirection, selectedNumber, handleClueSelected } =
    useContext(CrosswordContext);

  const list = clues?.[selectedDirection] ?? [];
  // Before the first tap the library's selection can point at a number that
  // has no clue in this direction; show where the arrows will start instead.
  const index = Math.max(
    0,
    list.findIndex((clue) => clue.number === selectedNumber)
  );
  const current = list[index];

  const step = (delta) => {
    const next = list[(index + delta + list.length) % list.length];
    if (next) handleClueSelected(selectedDirection, next.number);
  };

  if (!current) return null;

  return (
    <div className="current-clue-dock">
      <div className="current-clue">
        <span className="current-clue__number">
          {current.number}
          {selectedDirection === "across" ? "A" : "D"}
        </span>
        <p className="current-clue__text">{current.clue}</p>
        <div className="current-clue__nav">
          <button
            type="button"
            className="current-clue__step"
            onClick={() => step(-1)}
            aria-label="Previous clue"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="current-clue__step"
            onClick={() => step(1)}
            aria-label="Next clue"
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ClueList({ direction, label }) {
  const { clues, selectedDirection, selectedNumber, handleClueSelected } =
    useContext(CrosswordContext);
  const listRef = useRef(null);

  const list = clues?.[direction] ?? [];

  // Keep the selected clue visible, but only by scrolling this list — never the
  // page, which is what makes the mobile layout feel like it's fighting you.
  useEffect(() => {
    const box = listRef.current;
    if (!box || selectedDirection !== direction) return;
    if (box.scrollHeight <= box.clientHeight) return;
    const row = box.querySelector('[aria-current="true"]');
    if (!row) return;
    const boxBox = box.getBoundingClientRect();
    const rowBox = row.getBoundingClientRect();
    const slack = 10; // don't leave the selected clue flush against an edge
    if (rowBox.top < boxBox.top + slack) {
      box.scrollTop -= boxBox.top + slack - rowBox.top;
    } else if (rowBox.bottom > boxBox.bottom - slack) {
      box.scrollTop += rowBox.bottom - boxBox.bottom + slack;
    }
  }, [direction, selectedDirection, selectedNumber]);

  return (
    <section className="clue-list" aria-label={label}>
      <h2 className="clue-list__head">{label}</h2>
      <ol className="clue-list__items" ref={listRef}>
        {list.map(({ number, clue, complete }) => {
          const active =
            direction === selectedDirection && number === selectedNumber;
          return (
            <li key={number}>
              <button
                type="button"
                aria-current={active ? "true" : undefined}
                className={[
                  "clue-row",
                  active ? "clue-row--active" : "",
                  complete ? "clue-row--done" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => handleClueSelected(direction, number)}
              >
                <span className="clue-row__number">{number}</span>
                <span className="clue-row__text">{clue}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function SolvedCard({ time, answers, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="solved"
      role="dialog"
      aria-modal="true"
      aria-label="Puzzle solved"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="solved__card">
        <p className="solved__eyebrow">Solved</p>
        <p className="solved__time">{formatTime(time)}</p>
        <p className="solved__detail">{answers} answers, all correct.</p>
        <button
          type="button"
          className="solved__close"
          ref={closeRef}
          onClick={onClose}
        >
          Back to the puzzle
        </button>
      </div>
    </div>
  );
}

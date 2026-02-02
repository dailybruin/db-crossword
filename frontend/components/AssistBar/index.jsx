import { useEffect } from "react";
import { getHighlightedWordCells } from "./helpers";
import "./AssistBar.css";

export default function AssistBar({
  data,
  crosswordRef,
  time,
  setTime,
  isRunning,
  setIsRunning,
}) {
  useEffect(() => {
    let intervalId;
    if (isRunning) {
      intervalId = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [isRunning, setTime]);

  useEffect(() => {
    // Reset grid when new crossword data loads
    if (data && crosswordRef.current) {
      resetGrid();
    }
  }, [data, crosswordRef]);

  function revealGrid() {
    crosswordRef.current.fillAllAnswers();
  }

  function resetGrid() {
    crosswordRef.current.reset();
    setTime(0);
  }

  function buildSolutionGrid(data) {
    // Determine grid size
    let maxRow = 0;
    let maxCol = 0;

    // Helper to update size
    const updateSize = (isAcross, { row, col, answer }) => {
      if (isAcross) {
        maxCol = Math.max(maxCol, col + answer.length);
      } else {
        maxRow = Math.max(maxRow, row + answer.length);
      }
    };

    // Scan all across entries
    Object.values(data.across).forEach((entry) => {
      updateSize(true, entry);
    });

    // Scan all down entries
    Object.values(data.down).forEach((entry) => {
      updateSize(false, entry);
    });

    // Create blank grid
    const grid = Array.from({ length: maxRow }, () => Array(maxCol).fill(null));

    // Fill across answers
    Object.values(data.across).forEach(({ row, col, answer }) => {
      answer.split("").forEach((ch, i) => {
        grid[row][col + i] = ch.toUpperCase();
      });
    });

    // Fill down answers
    Object.values(data.down).forEach(({ row, col, answer }) => {
      answer.split("").forEach((ch, i) => {
        grid[row + i][col] = ch.toUpperCase();
      });
    });

    return grid;
  }

  function checkGrid() {
    if (!crosswordRef.current) return;
    if (!data) return;

    const solutionGrid = buildSolutionGrid(data);

    // Select the text nodes that contain letters in the crossword
    const cells = document.querySelectorAll(".clue-cell text:last-of-type");

    cells.forEach((cell) => {
      const guessed = cell.textContent.trim().toUpperCase();

      // Remove old marking
      cell.classList.remove("incorrect-letter");

      const rect = cell.closest(".clue-cell").querySelector("rect");
      if (!rect) return;

      // Convert pixel-based SVG position → grid coordinates
      // Assumes x=_.125, y=_.125
      const col = (parseFloat(rect.getAttribute("x")) - 0.125) / 10;
      const row = (parseFloat(rect.getAttribute("y")) - 0.125) / 10;

      const correct = solutionGrid[row][col];

      if (guessed && correct && guessed !== correct) {
        cell.classList.add("incorrect-letter");
      }
    });
  }

  function revealWord() {
    const solutionGrid = buildSolutionGrid(data);
    const result = getHighlightedWordCells(); // ← new helper

    if (!result) return;
    const { cells } = result;

    cells.forEach(({ row, col, rect }) => {
      const letter = solutionGrid[row][col];
      if (!letter) return;

      const cellGroup = rect.closest(".clue-cell");
      const textElem = cellGroup.querySelector("text:last-of-type");
      if (textElem) {
        textElem.textContent = letter;
        textElem.classList.remove("incorrect-letter");
      }
    });
  }

  function toggleTimer() {
    setIsRunning(!isRunning);
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bar-wrapper">
      <div className="timer">
        <span>{formatTime(time)}</span>
        <button onClick={toggleTimer}>{isRunning ? "Pause" : "Resume"}</button>
      </div>
      <div className="assist-buttons">
        <button onClick={revealGrid}>Reveal Grid</button>
        <button onClick={resetGrid}>Reset Grid</button>
        <button onClick={checkGrid}>Check Answers</button>
        <button onClick={revealWord}>Reveal Word</button>
      </div>
    </div>
  );
}

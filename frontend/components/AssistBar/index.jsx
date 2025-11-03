import { useEffect, useState } from "react";
import "./AssistBar.css";

export default function AssistBar({ data, crosswordRef, time, setTime, isRunning, setIsRunning }) {
  useEffect(() => {
    let intervalId;
    if (isRunning) {
      intervalId = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [isRunning, setTime]);

  function revealGrid() {
    crosswordRef.current.fillAllAnswers();
  }

  function resetGrid() {
    crosswordRef.current.reset();
    setTime(0);
  }

  function toggleTimer() {
    setIsRunning(!isRunning);
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bar-wrapper">
      <div className="timer">
        <span>{formatTime(time)}</span>
        <button onClick={toggleTimer}>
          {isRunning ? 'Pause' : 'Resume'}
        </button>
      </div>
      <div className="assist-buttons">
        <button onClick={revealGrid}>Reveal Grid</button>
        <button onClick={resetGrid}>Reset Grid</button>
      </div>
    </div>
  );
}

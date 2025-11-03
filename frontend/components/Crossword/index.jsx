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

import React, { useState, useRef } from "react";
import ReactCrossword from "@jaredreisinger/react-crossword";
import AssistBar from "../AssistBar";
import "./crossword.css";

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function Crossword({ data }) {
  const crosswordRef = useRef(null);
  const [complete, setComplete] = useState(false);
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [correctClues, setCorrectClues] = useState(0);
  const [showModal, setShowModal] = useState(true);

  const handleCrosswordCorrect = (isCorrect) => {
    if (isCorrect) {
      setIsRunning(false);
      setComplete(true);
    } else {
      setComplete(false);
    }
  };

  const handleCorrect = (direction, number, answer) => {
    setCorrectClues(prev => prev + 1);
  };

  if (!data) return <div>Loading crossword…</div>;

  return (
    <div>
      {complete && showModal && (
        <div className="completion-modal">
          <div className="completion-content">
            <button className="close-button" onClick={() => setShowModal(false)}>×</button>
            <h2>🎉 Congratulations! 🎉</h2>
            <p>You've completed the Daily Bruin Crossword!</p>
            <div className="completion-stats">
              <div className="stat">
                <span className="stat-label">Time:</span>
                <span className="stat-value">{formatTime(time)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Clues Solved:</span>
                <span className="stat-value">{correctClues}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Date:</span>
                <span className="stat-value">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <AssistBar
        data={data}
        crosswordRef={crosswordRef}
        time={time}
        setTime={setTime}
        isRunning={isRunning}
        setIsRunning={setIsRunning} />
      <div className="d-flex">
        <ReactCrossword
          ref={crosswordRef}
          data={data}
          onCorrect={handleCorrect}
          onCrosswordCorrect={handleCrosswordCorrect}
        />
      </div>
    </div>
  );
}

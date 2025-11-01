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

import React, { useState, useEffect } from "react";
import ReactCrossword from "@jaredreisinger/react-crossword";
import "./crossword.css";

export default function Crossword() {
  const [complete, setComplete] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3000/api/crossword/latest")
      .then(res => res.json())
      .then(json => setData(json.crossword))
      .catch(err => console.error("Failed to load crossword data:", err));
  }, []);

  const handleCrosswordCorrect = (isCorrect) => {
    if (isCorrect) {
      console.log("Crossword entirely correct!");
      setComplete(true);
    } else {
      console.log("Incorrect crossword!");
    }
  };

  const handleCorrect = (direction, number, answer) => {
    console.log(`Clue ${direction} ${number} correct: ${answer}`);
  };

  if (!data) return <div>Loading crossword…</div>;

  return (
    <div>
      {complete && <div className="congratulations">🎉 You solved it! 🎉</div>}
      <div className="d-flex">
        <ReactCrossword
          data={data}
          theme={{ columnBreakpoint: "512px" }}
          onCorrect={handleCorrect}
          onCrosswordCorrect={handleCrosswordCorrect}
        />
      </div>
    </div>
  );
}

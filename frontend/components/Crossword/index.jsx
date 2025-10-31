import React, { useRef, useState } from "react";
import Crossword from "@jaredreisinger/react-crossword";
import data from "./data";
import "./crossword.css";

export default function CrosswordTest() {
  const [complete, setComplete] = useState(false);

  const handleCrosswordCorrect = (isCorrect) => {
    if (isCorrect) {
      console.log("Crossword entirely correct!");
      setComplete(true);
    }
    else {
      console.log("Incorrect crossword!");
    }
  };

  const handleCorrect = (direction, number, answer) => {
    console.log(`Clue ${direction} ${number} correct: ${answer}`);
  };

  return (
    <div>
      {complete && <div className="congratulations">🎉 You solved it! 🎉</div>}
      <div className="d-flex">
        <Crossword
          data={data}
          theme={{ columnBreakpoint: "512px" }}
          onCorrect={handleCorrect}
          onCrosswordCorrect={handleCrosswordCorrect}
        />
      </div>
    </div>
  );
}

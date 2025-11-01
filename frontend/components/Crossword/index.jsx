import React, { useState, useEffect } from "react";
import Crossword from "@jaredreisinger/react-crossword";
import "./crossword.css";

export default function CrosswordTest() {
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

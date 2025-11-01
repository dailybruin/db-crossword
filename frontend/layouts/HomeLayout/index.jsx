import React from "react";
import Crossword from "../../components/Crossword";
import "./HomeLayout.css"

export default function HomeLayout() {
  return (
    <>
      <h1 id="title">Crossword</h1>

      <Crossword />

      <p>
        <i>
          <i>Based on react-crossword by Jared Reisinger (MIT License)</i>
          <br></br>
          <i>
            Some crossword content adapted from The Crossword Puzzle Book (1924),
            courtesy of Project Gutenberg.
          </i>
        </i>
      </p>
    </>
  );
}

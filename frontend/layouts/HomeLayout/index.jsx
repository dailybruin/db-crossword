import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Crossword from "../../components/Crossword";
import "./HomeLayout.css";

import test_data from "./mini4.json"

export default function HomeLayout() {
  const [data, setData] = useState(null);

  // 1. Get the current URL location
  const location = useLocation();

  // 2. Determine if we are asking for the Mini based on the path
  const isMini = location.pathname === "/mini";
  const type = isMini ? "mini" : "standard";

  const BACKEND_DOMAIN = import.meta.env.VITE_BACKEND_DOMAIN;

  useEffect(() => {
    // Clear data so the "Loading..." text appears briefly when switching
    setData(null);

    // 3. Pass the 'type' query parameter to the backend
    fetch(`${BACKEND_DOMAIN}/api/crossword/latest?type=${type}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error("Failed to load crossword data:", err));
  }, [BACKEND_DOMAIN, type]); // 4. Re-run this effect whenever the type (URL) changes

  return (
    <div className="home-wrapper">
      {data ? (
        <>
          <h1 id="title">
            {isMini ? "Mini " : ""}Crossword - {formatDate(data.date)}
          </h1>
          
          {/* We check if the meta author exists before trying to render it */}
          {data.crossword?.meta?.author && (
             <p id="byline" style={{ marginTop: "-10px", marginBottom: "20px", fontSize: "1.1rem" }}>
               By <b>{data.crossword.meta.author}</b>
             </p>
          )}
          {/* ------------------------------- */}

          <div className="home-content">
            {/* 5. The `key` prop is crucial here. 
              It forces React to destroy and recreate the Crossword component 
              when switching between Standard and Mini, ensuring the grid 
              resizes correctly.
            */}
            <Crossword key={type} data={test_data} />
          </div>

          <footer className="attribution">
            <p>
              <i>
                <i>Based on react-crossword by Jared Reisinger (MIT License)</i>
                <br />
                <i>
                  Some crossword content adapted from The Crossword Puzzle Book
                  (1924), courtesy of Project Gutenberg.
                </i>
              </i>
            </p>
          </footer>
        </>
      ) : (
        <h3>Loading {type} crossword...</h3>
      )}
    </div>
  );
}

function formatDate(dateString) {
  /* dateString in form mm-dd-yyyy */
  if (!dateString) return "";
  const [month, day, year] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  const monthName = date.toLocaleString("en-US", { month: "short" });
  const dayNum = date.getDate();

  return `${monthName} ${dayNum}, ${year}`;
}
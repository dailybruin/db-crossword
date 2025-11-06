import { useState, useEffect } from "react";
import Crossword from "../../components/Crossword";
import "./HomeLayout.css";

export default function HomeLayout() {
  const [data, setData] = useState(null);

  const BACKEND_DOMAIN = import.meta.env.VITE_BACKEND_DOMAIN;

  useEffect(() => {
    fetch(`${BACKEND_DOMAIN}/api/crossword/latest`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error("Failed to load crossword data:", err));
  }, []);

  return (
    <div className="home-wrapper">
      {data ? (
        <>
          <h1 id="title">Crossword - {formatDate(data.date)}</h1>

          <div className="home-content">
            <Crossword data={data.crossword} />
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
        <h3>Loading crossword...</h3>
      )}
    </div>
  );
}

function formatDate(dateString) {
  /* dateString in form mm-dd-yyyy */
  const [month, day, year] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  const monthName = date.toLocaleString("en-US", { month: "short" });
  const dayNum = date.getDate();

  return `${monthName} ${dayNum}, ${year}`;
}

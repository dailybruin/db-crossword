import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Crossword from "../../components/Crossword";
import "./HomeLayout.css";

export default function HomeLayout() {
  const location = useLocation();
  const isMini = location.pathname === "/mini";
  const type = isMini ? "mini" : "standard";

  const BACKEND_DOMAIN = import.meta.env.VITE_BACKEND_DOMAIN;

  const [state, setState] = useState({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    fetch(`${BACKEND_DOMAIN}/api/crossword/latest?type=${type}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setState(
          json?.crossword
            ? { status: "ready", puzzle: json }
            : { status: "empty" }
        );
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Failed to load crossword data:", err);
        setState({ status: "error" });
      });

    return () => controller.abort();
  }, [BACKEND_DOMAIN, type, attempt]);

  // Only the author is dependable. The Sheet's `title` falls back to whatever
  // the .puz file was named ("Crossword 2"), and `date` is the editor's
  // publish-order key rather than a date worth printing.
  const author = state.puzzle?.crossword?.meta?.author;

  return (
    <div className="page">
      <header className="masthead">
        <p className="masthead__eyebrow">Daily Bruin</p>
        <h1 className="masthead__title">
          {isMini ? "Mini crossword" : "Crossword"}
        </h1>
        {state.status === "ready" && author && (
          <p className="masthead__credits">by {author}</p>
        )}
      </header>

      {state.status === "ready" && (
        /* Remounting on type change lets the grid resize from scratch. */
        <Crossword key={type} data={state.puzzle.crossword} />
      )}

      {state.status === "loading" && (
        <p className="notice notice--quiet">Loading the puzzle…</p>
      )}

      {state.status === "empty" && (
        <div className="notice">
          <h2 className="notice__head">Nothing published yet</h2>
          <p>
            There's no {isMini ? "mini" : "full"} crossword up right now. Check
            back soon.
          </p>
        </div>
      )}

      {state.status === "error" && (
        <div className="notice">
          <h2 className="notice__head">The puzzle didn't load</h2>
          <p>The server didn't answer. Try again, or come back in a minute.</p>
          <button
            type="button"
            className="notice__retry"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Try again
          </button>
        </div>
      )}

      <footer className="colophon">
        <p>
          Built on react-crossword by Jared Reisinger (MIT License). Some puzzle
          content adapted from The Crossword Puzzle Book (1924), courtesy of
          Project Gutenberg.
        </p>
      </footer>
    </div>
  );
}


import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Crossword from "../../components/Crossword";
import "./HomeLayout.css";

const GENERIC_TITLES = new Set(["crossword", "mini crossword"]);

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

  const meta = state.puzzle?.crossword?.meta ?? {};
  const puzzleTitle =
    meta.title && !GENERIC_TITLES.has(meta.title.trim().toLowerCase())
      ? meta.title.trim()
      : null;

  const credits = [
    puzzleTitle,
    meta.author ? `by ${meta.author}` : null,
    formatDate(state.puzzle?.date),
  ].filter(Boolean);

  return (
    <div className="page">
      <header className="masthead">
        <p className="masthead__eyebrow">Daily Bruin</p>
        <h1 className="masthead__title">
          {isMini ? "Mini crossword" : "Crossword"}
        </h1>
        {state.status === "ready" && credits.length > 0 && (
          <p className="masthead__credits">{credits.join(" · ")}</p>
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

/** The API returns ISO dates (`2026-08-04`). */
function formatDate(iso) {
  if (!iso) return null;
  const [year, month, day] = String(iso).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

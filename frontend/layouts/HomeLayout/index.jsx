import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Crossword from "../../components/Crossword";
import ArchiveMenu from "../../components/ArchiveMenu";
import { formatLong } from "../../lib/date";
import "./HomeLayout.css";

export default function HomeLayout() {
  const location = useLocation();
  const isMini =
    location.pathname === "/mini" || location.pathname.startsWith("/mini/");
  const type = isMini ? "mini" : "standard";
  const archiveBase = isMini ? "/mini/archive" : "/archive";
  const home = isMini ? "/mini" : "/";

  // Present on the /…/archive/:date routes: we're viewing a past puzzle, not
  // today's. Absent on the plain / and /mini routes.
  const { date } = useParams();

  const BACKEND_DOMAIN = import.meta.env.VITE_BACKEND_DOMAIN;

  const [state, setState] = useState({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    const url = date
      ? `${BACKEND_DOMAIN}/api/crossword/by-date?type=${type}&date=${date}`
      : `${BACKEND_DOMAIN}/api/crossword/latest?type=${type}`;

    fetch(url, { signal: controller.signal })
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
  }, [BACKEND_DOMAIN, type, date, attempt]);

  // The Sheet's `title` and `author` columns drive the byline. The backend
  // clears the title when the Sheet cell is blank (so we never show the .puz
  // filename), and either part may be missing — render only what's present.
  const meta = state.puzzle?.crossword?.meta;
  const title = meta?.title;
  const author = meta?.author;

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead__row">
          <div className="masthead__id">
            <p className="masthead__eyebrow">Daily Bruin</p>
            <h1 className="masthead__title">
              {isMini ? "Mini crossword" : "Crossword"}
            </h1>
            {state.status === "ready" && (title || author) && (
              <p className="masthead__credits">
                {title}
                {title && author && " · "}
                {author && `by ${author}`}
              </p>
            )}
          </div>
          <ArchiveMenu type={type} archiveBase={archiveBase} />
        </div>

        {/* When viewing an old puzzle, say so and offer the way back. */}
        {date && (
          <p className="masthead__past">
            <span className="masthead__pasttag">Past puzzle</span>
            {state.status === "ready" ? formatLong(date) : date}
            <Link to={home} className="masthead__pastback">
              Back to today &#8594;
            </Link>
          </p>
        )}
      </header>

      {state.status === "ready" && (
        /* Remounting on the puzzle identity lets the grid resize from scratch. */
        <Crossword key={`${type}-${date || "latest"}`} data={state.puzzle.crossword} />
      )}

      {state.status === "loading" && (
        <p className="notice notice--quiet">Loading the puzzle…</p>
      )}

      {state.status === "empty" && (
        <div className="notice">
          {date ? (
            <>
              <h2 className="notice__head">Puzzle not found</h2>
              <p>
                There's no {isMini ? "mini" : "full"} crossword for that date.
                It may have been removed.
              </p>
              <Link to={archiveBase} className="notice__retry notice__link">
                See previous puzzles
              </Link>
            </>
          ) : (
            <>
              <h2 className="notice__head">Nothing published yet</h2>
              <p>
                There's no {isMini ? "mini" : "full"} crossword up right now.
                Check back soon.
              </p>
            </>
          )}
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

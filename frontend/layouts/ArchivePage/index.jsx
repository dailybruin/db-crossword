import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { dateParts } from "../../lib/date";
import "./ArchivePage.css";

const BACKEND_DOMAIN = import.meta.env.VITE_BACKEND_DOMAIN;
const PER_PAGE = 20;

// "Previous Puzzles": every past puzzle of a type, newest first, in pages you
// can click back through. Each row opens that puzzle at its own address.
export default function ArchivePage() {
  const location = useLocation();
  const isMini = location.pathname.startsWith("/mini");
  const type = isMini ? "mini" : "standard";
  const archiveBase = isMini ? "/mini/archive" : "/archive";
  const home = isMini ? "/mini" : "/";

  const [state, setState] = useState({ status: "loading" });
  const [page, setPage] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    setPage(0);

    fetch(`${BACKEND_DOMAIN}/api/crossword/list?type=${type}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const puzzles = data.puzzles || [];
        setState(puzzles.length ? { status: "ready", puzzles } : { status: "empty" });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Failed to load the archive:", err);
        setState({ status: "error" });
      });

    return () => controller.abort();
  }, [type]);

  const puzzles = state.puzzles || [];
  const pages = Math.max(1, Math.ceil(puzzles.length / PER_PAGE));
  const slice = puzzles.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <div className="archpage">
      <header className="archpage__top">
        <Link to={home} className="archpage__back">
          &#8592; Back to today's {isMini ? "mini" : "puzzle"}
        </Link>
        <div className="archpage__head">
          <h1 className="archpage__title">
            {isMini ? "Mini" : "Crossword"} <em>· previous puzzles</em>
          </h1>
          {state.status === "ready" && (
            <span className="archpage__count">
              {puzzles.length} {puzzles.length === 1 ? "puzzle" : "puzzles"}
            </span>
          )}
        </div>
      </header>

      {state.status === "loading" && (
        <p className="notice notice--quiet">Loading the archive…</p>
      )}

      {state.status === "empty" && (
        <div className="notice">
          <h2 className="notice__head">No past puzzles yet</h2>
          <p>Once puzzles are published, they'll collect here.</p>
        </div>
      )}

      {state.status === "error" && (
        <div className="notice">
          <h2 className="notice__head">The archive didn't load</h2>
          <p>The server didn't answer. Refresh, or come back in a minute.</p>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <ol className="issues">
            {slice.map((p) => {
              const { day, mo, year } = dateParts(p.date);
              return (
                <li key={p.date}>
                  <Link to={`${archiveBase}/${p.date}`} className="issue">
                    <span className="issue__date">
                      <b>{mo} {day}</b>
                      <small>{year}</small>
                    </span>
                    <span className="issue__body">
                      <span className="issue__title">
                        {p.title || `${isMini ? "Mini" : "Crossword"}`}
                      </span>
                      {p.author && <span className="issue__by">by {p.author}</span>}
                    </span>
                    <span className="issue__go">Solve &#8594;</span>
                  </Link>
                </li>
              );
            })}
          </ol>

          {pages > 1 && (
            <div className="pager">
              <button
                type="button"
                className="pager__btn"
                onClick={() => setPage((n) => Math.max(0, n - 1))}
                disabled={page === 0}
              >
                &#8592; Newer
              </button>
              <span className="pager__at">
                Page {page + 1} of {pages}
              </span>
              <button
                type="button"
                className="pager__btn"
                onClick={() => setPage((n) => Math.min(pages - 1, n + 1))}
                disabled={page === pages - 1}
              >
                Older &#8594;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MONTHS } from "../../lib/date";
import "./ArchiveMenu.css";

const BACKEND_DOMAIN = import.meta.env.VITE_BACKEND_DOMAIN;

// A calendar in the masthead: open it, and days with a published puzzle carry a
// gold dot. Pick one to open that puzzle. The puzzle list loads lazily the first
// time the calendar is opened, so it costs nothing until someone wants it.
export default function ArchiveMenu({ type, archiveBase }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [puzzles, setPuzzles] = useState(null); // null = not loaded yet
  const [view, setView] = useState(null); // { y, m } month on screen
  const rootRef = useRef(null);

  // Load the catalog the first time the calendar opens.
  useEffect(() => {
    if (!open || puzzles !== null) return;
    let live = true;
    fetch(`${BACKEND_DOMAIN}/api/crossword/list?type=${type}`)
      .then((res) => (res.ok ? res.json() : { puzzles: [] }))
      .then((data) => {
        if (!live) return;
        const list = data.puzzles || [];
        setPuzzles(list);
        // Open on the newest puzzle's month (the list is newest-first).
        const anchor = list[0]?.date;
        const now = new Date();
        if (anchor) {
          const [y, m] = anchor.split("-").map(Number);
          setView({ y, m: m - 1 });
        } else {
          setView({ y: now.getFullYear(), m: now.getMonth() });
        }
      })
      .catch(() => live && setPuzzles([]));
    return () => {
      live = false;
    };
  }, [open, puzzles, type]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const dates = useMemo(
    () => new Set((puzzles || []).map((p) => p.date)),
    [puzzles]
  );
  // The catalog is newest-first, so the last entry is the oldest month we can
  // page back to and the first entry is the newest.
  const bounds = useMemo(() => {
    if (!puzzles || puzzles.length === 0) return null;
    const toMo = (d) => {
      const [y, m] = d.split("-").map(Number);
      return { y, m: m - 1 };
    };
    return { max: toMo(puzzles[0].date), min: toMo(puzzles[puzzles.length - 1].date) };
  }, [puzzles]);

  const atMin = bounds && view && view.y === bounds.min.y && view.m === bounds.min.m;
  const atMax = bounds && view && view.y === bounds.max.y && view.m === bounds.max.m;

  const step = (dir) => {
    setView((v) => {
      let m = v.m + dir;
      let y = v.y;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      return { y, m };
    });
  };

  const openDate = (dateStr) => {
    setOpen(false);
    navigate(`${archiveBase}/${dateStr}`);
  };

  // Build the day cells for the month on screen (leading blanks for alignment).
  const cells = [];
  if (view) {
    const firstDow = new Date(view.y, view.m, 1).getDay();
    const days = new Date(view.y, view.m + 1, 0).getDate();
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let day = 1; day <= days; day++) {
      const ds = `${view.y}-${String(view.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ day, ds, has: dates.has(ds) });
    }
  }

  return (
    <div className="archmenu" ref={rootRef}>
      <button
        type="button"
        className="archmenu__btn"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <rect x="1" y="1" width="13" height="13" />
          <line x1="1" y1="5.3" x2="14" y2="5.3" />
          <line x1="5.3" y1="1" x2="5.3" y2="14" />
          <line x1="9.6" y1="1" x2="9.6" y2="14" />
          <line x1="1" y1="9.6" x2="14" y2="9.6" />
        </svg>
        Archive
      </button>

      {open && (
        <div className="archmenu__pop" role="dialog" aria-label="Pick a past puzzle">
          {puzzles === null ? (
            <p className="archmenu__loading">Loading…</p>
          ) : puzzles.length === 0 ? (
            <p className="archmenu__loading">No past puzzles yet.</p>
          ) : (
            <>
              <div className="archmenu__head">
                <button
                  type="button"
                  className="archmenu__nav"
                  onClick={() => step(-1)}
                  disabled={atMin}
                  aria-label="Previous month"
                >
                  &#8249;
                </button>
                <span className="archmenu__mo">
                  {MONTHS[view.m]} {view.y}
                </span>
                <button
                  type="button"
                  className="archmenu__nav"
                  onClick={() => step(1)}
                  disabled={atMax}
                  aria-label="Next month"
                >
                  &#8250;
                </button>
              </div>

              <div className="archmenu__dow">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>

              <div className="archmenu__grid">
                {cells.map((c, i) =>
                  c === null ? (
                    <span key={i} className="archmenu__cell archmenu__cell--pad" />
                  ) : c.has ? (
                    <button
                      key={i}
                      type="button"
                      className="archmenu__cell archmenu__cell--has"
                      onClick={() => openDate(c.ds)}
                    >
                      {c.day}
                    </button>
                  ) : (
                    <span key={i} className="archmenu__cell">
                      {c.day}
                    </span>
                  )
                )}
              </div>

              <div className="archmenu__foot">
                <span className="archmenu__key">
                  <span className="archmenu__dot" /> has a puzzle
                </span>
                <button
                  type="button"
                  className="archmenu__all"
                  onClick={() => {
                    setOpen(false);
                    navigate(archiveBase);
                  }}
                >
                  View all &#8594;
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

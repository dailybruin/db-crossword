// Tests for the scheduled-publishing time gate. Run with `npm test`
// (node --test). No framework needed — Node's built-in test runner.
import { test } from "node:test";
import assert from "node:assert/strict";
import { publishInstant, activePuzzles } from "./sheet.js";

// LA is UTC-7 in summer (PDT) and UTC-8 in winter (PST). The offset must come
// from the date itself, not a constant, so these two must differ by an hour.
test("publishInstant: LA wall time resolves correctly across DST", () => {
  // Summer: 8am PDT = 15:00 UTC.
  assert.equal(
    publishInstant("2026-08-06", "08:00"),
    Date.UTC(2026, 7, 6, 15, 0)
  );
  // Winter: 8am PST = 16:00 UTC.
  assert.equal(
    publishInstant("2026-01-15", "08:00"),
    Date.UTC(2026, 0, 15, 16, 0)
  );
});

// The two days around a US DST switch (spring forward is Sun Mar 8, 2026) must
// land on opposite offsets — proof the offset is computed per-date.
test("publishInstant: offset flips across the spring-forward boundary", () => {
  // Sat Mar 7 is still PST (UTC-8): 8am -> 16:00 UTC.
  assert.equal(publishInstant("2026-03-07", "08:00"), Date.UTC(2026, 2, 7, 16, 0));
  // Mon Mar 9 is PDT (UTC-7): 8am -> 15:00 UTC.
  assert.equal(publishInstant("2026-03-09", "08:00"), Date.UTC(2026, 2, 9, 15, 0));
});

// Blank publish time = start of that day in LA (backward compatible: existing
// rows have no publish_time and must keep behaving as they did).
test("publishInstant: blank time means midnight LA", () => {
  // Midnight PDT = 07:00 UTC.
  assert.equal(publishInstant("2026-08-06", ""), Date.UTC(2026, 7, 6, 7, 0));
  assert.equal(publishInstant("2026-08-06", undefined), Date.UTC(2026, 7, 6, 7, 0));
});

// Tolerant of single-digit hours and seconds; garbage falls back to midnight.
test("publishInstant: forgiving parse", () => {
  assert.equal(publishInstant("2026-08-06", "8:00"), Date.UTC(2026, 7, 6, 15, 0));
  assert.equal(publishInstant("2026-08-06", "08:00:00"), Date.UTC(2026, 7, 6, 15, 0));
  assert.equal(publishInstant("2026-08-06", "nonsense"), Date.UTC(2026, 7, 6, 7, 0));
  assert.ok(Number.isNaN(publishInstant("not-a-date", "08:00")));
});

const rows = [
  { type: "mini", date: "2026-08-06", puz_url: "u6", active: "TRUE", publish_time: "08:00" },
  { type: "mini", date: "2026-08-05", puz_url: "u5", active: "TRUE", publish_time: "" },
  { type: "mini", date: "2026-08-07", puz_url: "u7", active: "TRUE", publish_time: "08:00" },
  { type: "mini", date: "2026-08-04", puz_url: "u4", active: "FALSE", publish_time: "08:00" },
];

// Just before Aug 6 8am PDT (14:59 UTC): the newest *eligible* puzzle is Aug 5,
// not the still-scheduled Aug 6 or Aug 7. The site keeps showing yesterday's.
test("activePuzzles: a future-scheduled puzzle stays hidden; previous one wins", () => {
  const now = Date.UTC(2026, 7, 6, 14, 59);
  const live = activePuzzles(rows, "mini", now);
  assert.deepEqual(live.map((r) => r.date), ["2026-08-05"]);
});

// One minute after Aug 6 8am PDT: Aug 6 is now live and, being newest, wins.
// Aug 7 is still in the future; Aug 4 is a kill-switched (active=FALSE) row.
test("activePuzzles: the puzzle appears once its publish time passes", () => {
  const now = Date.UTC(2026, 7, 6, 15, 1);
  const live = activePuzzles(rows, "mini", now);
  assert.deepEqual(live.map((r) => r.date), ["2026-08-06", "2026-08-05"]);
});

// active=FALSE is an instant kill switch regardless of publish time.
test("activePuzzles: kill switch hides a row even after its time", () => {
  const now = Date.UTC(2030, 0, 1, 0, 0); // far future: every time has passed
  const live = activePuzzles(rows, "mini", now);
  assert.ok(!live.some((r) => r.date === "2026-08-04"));
});

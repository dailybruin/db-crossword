// Helpers for the YYYY-MM-DD strings the Sheet uses. We parse the parts by hand
// rather than `new Date(str)` so the day never shifts by a timezone: "2026-08-06"
// should read as August 6 for everyone, not August 5 for anyone west of UTC.

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// "2026-08-06" -> { y: 2026, m: 7, d: 6 } (m is 0-based, for Date math)
export function parseDate(str) {
  const [y, m, d] = String(str).split("-").map(Number);
  return { y, m: m - 1, d };
}

// "2026-08-06" -> "August 6, 2026"
export function formatLong(str) {
  const { y, m, d } = parseDate(str);
  return `${MONTHS[m]} ${d}, ${y}`;
}

// "2026-08-06" -> { day: 6, mo: "AUG", year: 2026 } for stacked date labels
export function dateParts(str) {
  const { y, m, d } = parseDate(str);
  return { day: d, mo: MONTHS_SHORT[m].toUpperCase(), year: y };
}

// AP style month abbreviations: March through July are never shortened.
const MONTHS_AP = [
  "Jan.", "Feb.", "March", "April", "May", "June",
  "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec.",
];

// "15:00" -> "3 p.m.", "09:30" -> "9:30 a.m.", "12:00" -> "noon" (AP style)
export function formatTimeAP(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  if (h === 12 && m === 0) return "noon";
  if (h === 0 && m === 0) return "midnight";
  const hour = h % 12 || 12;
  const mins = m ? `:${String(m).padStart(2, "0")}` : "";
  return `${hour}${mins} ${h < 12 ? "a.m." : "p.m."}`;
}

// ("2026-11-22", "15:00") -> "Nov. 22, 2026, at 3 p.m."; a blank time gives
// just "Nov. 22, 2026".
export function formatUpdated(date, time) {
  const { y, m, d } = parseDate(date);
  const day = `${MONTHS_AP[m]} ${d}, ${y}`;
  return time ? `${day}, at ${formatTimeAP(time)}` : day;
}

export { MONTHS, MONTHS_SHORT };

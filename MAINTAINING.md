# Maintaining the Daily Bruin Crossword

This document explains how the crossword site works and how to make changes.
It is written for future maintainers and editors. It intentionally contains
**no secrets, URLs, IDs, or account details** — those live in configuration and
in the shared Daily Bruin accounts, not in this repo.

---

## 1. What this is

A small web app that shows the latest Daily Bruin crossword:

- **Frontend** — a React (Vite) app that renders the puzzle. Served by nginx.
- **Backend** — a small Express (Node) API with one job: return the latest
  puzzle as JSON.
- **Hosting** — both run on Kubernetes as separate deployments.

Editors publish puzzles through a **Google Sheet** (the catalog) plus a **Google
Drive folder** (the puzzle files). There is no database and no login for the app
to maintain — see below.

---

## 2. How publishing works (for editors)

Editors never touch code. The workflow is:

1. **Build the puzzle** in [Crosshare](https://crosshare.org) (free) and
   **export it as a `.puz` file**. (An already-made crossword `.json` file also
   works — see note below — but `.puz` from Crosshare is the normal path.)
2. **Upload the file** to the shared Google Drive folder, then
   **right-click → Share → Copy link**.
3. **Add a row** to the Google Sheet with these columns:

   | Column         | What to put                                                                                   |
   |----------------|-----------------------------------------------------------------------------------------------|
   | `type`         | `mini` or `standard`                                                                          |
   | `publish_date` | The date the puzzle runs, in `YYYY-MM-DD`                                                     |
   | `publish_time` | *(optional)* Time it should go live that day, `HH:MM` in LA time. Blank = start of the day.   |
   | `author`       | Byline shown on the site                                                                      |
   | `title`        | Puzzle title                                                                                  |
   | `puz_url`      | The Drive share link from step 2                                                              |
   | `active`       | `TRUE` to make it live-eligible; `FALSE` to hide it                                           |

That's it — the site picks it up within a few minutes.

### Which puzzle shows?

For each `type`, the site shows the row with the **newest `publish_date`** among
rows that are both `active = TRUE` **and** whose publish time has already passed.
**Row position in the Sheet does not matter** — the date (and time) is the control.

- **Publish / replace:** add a new row with a newer `publish_date`.
- **Schedule ahead:** set a future `publish_date`/`publish_time`; the puzzle stays
  hidden until then, and the previous one keeps showing in the meantime.
- **Un-publish / take down:** set that row's `active` to `FALSE` (the previous
  active puzzle becomes live again).
- **Fix a live puzzle:** upload a corrected file and add a new row with a newer
  date (cleanest — see "Gotchas").

### Things editors should know

- **Scheduling is automatic.** A puzzle goes live once its `publish_date` (and
  `publish_time`, if set) arrive — nobody has to flip anything on the day. A blank
  `publish_time` means the start of that day. Use the real run date.
- **`publish_time` is 24-hour LA time** (e.g. `08:00`, `17:30`). Its column is
  formatted as plain text so Google doesn't rewrite the value — keep it that way.
- **Changes take a few minutes**, not seconds (Google caches the Sheet export,
  and the backend caches the current puzzle) — so a puzzle appears within a few
  minutes of its scheduled time, not to the exact second.
- **Keep one active row per `type` per `publish_date`.** If two rows tie on the
  newest date, the result is ambiguous — bump the date or set the old one to `FALSE`.
- **Blank rows are ignored**, so a stray empty row won't break anything.
- **File format:** upload a `.puz` (from Crosshare) *or* an already-converted
  crossword `.json` file (the older standard puzzles are JSON). The backend
  detects which it is. Do **not** upload a Google Sheet, Doc, or PDF as the
  `puz_url` — it must be the puzzle file itself, shared so "anyone with the link"
  can view it.

---

## 3. How it works under the hood

```
Editor → Crosshare (.puz) → Google Drive folder (files)
                          → Google Sheet  (catalog, published as CSV)
                                   │  (public read, no login)
                                   ▼
                          Backend (Express, k8s)
                          - reads the Sheet CSV
                          - picks the newest active row whose publish time has passed
                          - downloads the .puz from Drive
                          - converts .puz → crossword JSON
                          - caches + serves it
                                   │
                                   ▼
                          Frontend (React) renders the puzzle
```

**Why this design:** the entire read path needs **no API keys or tokens**. The
Sheet is "Published to the web" (public read-only) and the Drive files are shared
"anyone with the link." So there are no credentials in the app that can expire or
leak — which is what keeps it running with minimal maintenance.

### Key files

| File | Role |
|------|------|
| `backend/index.js` | The `/api/crossword/latest` endpoint; caching; source selection |
| `backend/sheet.js` | Fetch + parse the Sheet CSV, apply the scheduled publish time (LA time, daylight-saving aware), pick the newest active row that's due, resolve Drive links |
| `backend/sheet.test.js` | Tests for the date + scheduling logic — run with `npm test` in `backend/` |
| `backend/puz.js`   | Convert a `.puz` file (or pass through an already-made crossword `.json`) into the JSON the frontend expects |
| `frontend/layouts/HomeLayout/index.jsx` | Fetches from the backend and renders the puzzle (or an empty state) |
| `backend/crossword-backend-dply.yaml` | Backend Kubernetes deployment + the `CROSSWORD_SHEET_URL` setting |

### The one setting: `CROSSWORD_SHEET_URL`

The backend reads which Sheet to use from the `CROSSWORD_SHEET_URL` environment
variable (defined in `backend/crossword-backend-dply.yaml`).

- **Set** → the backend reads from the Google Sheet (normal operation).
- **Unset** → the backend falls back to the legacy WordPress source. This
  fallback exists only for the migration period and will stop working once the
  WordPress server is retired.

To point at a **different** Sheet, publish that Sheet to the web as CSV, update
this value, and redeploy the backend (below).

---

## 4. Deploying changes

Both deployments build a Docker image, push it, and roll out on Kubernetes.
You need `docker` and `kubectl` configured for the cluster.

```bash
# Backend (code or the CROSSWORD_SHEET_URL setting changed)
cd backend && ./deploy.sh

# Frontend (UI changed)
cd frontend && ./deploy.sh
```

`backend/deploy.sh` also runs `kubectl apply` on the deployment, so changes to
`CROSSWORD_SHEET_URL` in the yaml take effect on deploy.

**Verify after deploying the backend:**

```bash
curl -s "<PUBLIC_BACKEND_DOMAIN>/api/crossword/latest?type=mini"
```

You should get JSON with the current mini's clues.

---

## 5. Reverting

Reverting is easy because nothing is deleted and the WordPress fallback still
exists during migration. From least to most drastic:

1. **Bad puzzle data:** fix it in the Sheet (set `active = FALSE` or correct the
   `publish_date`). No deploy needed.
2. **Flip the backend off the Sheet fast (no rebuild):**
   ```bash
   kubectl set env deployment/crossword-backend CROSSWORD_SHEET_URL-
   ```
   This unsets the variable so the backend uses the fallback source. To make it
   permanent, also remove the `env:` block from the backend yaml.
3. **Undo a whole deploy (bad build):**
   ```bash
   kubectl rollout undo deployment/crossword-backend
   kubectl rollout undo deployment/crossword-frontend
   ```

> Note: the WordPress-based reverts only work while that server still exists.
> After it is retired, "reverting" means fixing forward in the Sheet.

---

## 6. Ownership & durability (read this if you're taking over)

The system is designed to run without a dedicated developer, **but only if it is
owned by durable Daily Bruin accounts**, not any individual's personal account:

- The **GitHub repo** should live in the Daily Bruin org.
- The **Google Sheet and Drive folder** must be owned by a shared/durable Daily
  Bruin Google account. If they sit on a personal account, the site breaks when
  that person loses access.
- **Editors** are managed via normal Google sharing on the Sheet and Drive folder
  (add/remove their emails as editors).

There are **no API keys or tokens** to rotate — the read path is public by
design. The only real durability risk is account ownership, so keep the Sheet and
Drive under an account the organization controls.

---

## 7. Gotchas / notes for developers

- **`frontend/.env.local`** (if present) is a local-only override pointing the
  frontend at a local backend. It is excluded from the production build via
  `frontend/.dockerignore` — do not remove that exclusion.
- **Publish timing is computed at read time, not by a scheduler.** On every
  request the backend compares "now" (in LA time) against each row's
  `publish_date`/`publish_time`, so there is no cron job or background worker to
  keep alive — a future-scheduled puzzle simply starts winning once its time
  passes. The timezone/daylight-saving handling lives in `backend/sheet.js`
  (`publishInstant`) and is covered by `backend/sheet.test.js`.
- **The run-date column is read as `publish_date`, or the older `date` if that's
  what a Sheet still uses** — both work, so an older sheet won't break.
- The backend caches the **converted puzzle** (the expensive download + parse)
  keyed on the file link, but **re-applies the Sheet's `author`/`title`/date on
  every request** — so metadata edits appear within a few minutes (Google's CSV
  cache), no restart needed. Changing the actual **grid/clues** means uploading a
  new file and pointing `puz_url` at it (that conversion is what's cached).
- The Sheet's `author`/`title` override whatever is embedded in the `.puz`, so
  editors control the byline from the Sheet.
- Running locally: start the backend with `CROSSWORD_SHEET_URL` set, then run the
  frontend dev server (`npm run dev`) with `.env.local` pointing at it.

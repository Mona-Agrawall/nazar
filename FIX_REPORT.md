# Fix Report — `fix/scan-issues`

All issues from the scan were worked through in four phases on the `fix/scan-issues` branch (48 commits before this report — one per fix — nothing pushed). After every phase the type check, production build and a demo-mode start (no Supabase env vars, plus a headless-browser render) were run and passed.

**Final state:** `npm run typecheck` (now strict) ✔ · `npm run lint` ✔ (0 warnings) · `npm test` ✔ (20/20) · `npm run build` ✔ · demo mode starts and renders ✔ · 22 browser-check scripts re-run at the end ✔.

**How things were verified**

- **Browser (CDP):** a headless Chrome driven over the DevTools protocol against the dev server in demo mode. It covers typing, keys, focus, fetch stubs and media emulation.
- **Probe:** a small script calling the server modules directly.
- **Stubbed Supabase:** the Supabase client running against a fake `fetch` that records and answers requests. No real project was used.
- **Local Postgres:** a disposable `postgres:16` Docker container with a stubbed `auth` schema and Supabase-style grants. All migrations were applied to it from scratch, and it was deleted afterwards. No real or remote database was touched.

---

## 1. Issues

### Phase 1: High severity

| # | Issue | Status | What changed | How verified |
|---|-------|--------|--------------|--------------|
| 1.1 | Empty watchlist showed all stocks | Fixed | `getStocks`/`getEvents`: `[]` now means "none" and only an omitted list means "all". The routes pass `?? []`. | Probe: `[]` gave 14 stocks before and 0 after. Unit test. |
| 1.2 | Crash without Supabase env vars (server + frontend) | Fixed | New `server/config.ts`. Server Supabase clients are created lazily. `src/lib/supabase.ts` exports `null` when Supabase isn't configured. Missing config implies demo mode. | Before: server crashed with `supabaseUrl is required`. After: it starts and renders. With fake config, requests still get 401. Unit test. |
| 1.3 | Server bundle served publicly from `dist/` | Fixed | esbuild output moved to `dist-server/server.cjs` (gitignored). `start` script and README updated. | Before: `GET /server.cjs` returned 200 with 49 KB of JS (and the `.map`). After: the SPA HTML fallback. Unit test. |
| 1.4 | Acknowledge sent the symbol, not the event ID | Fixed | Cards acknowledge their stock's timeline events by ID. State comes from the events (logic in `src/lib/pulseAck.ts`). | curl: acking `RELIANCE` was a no-op, acking `evt_rel_1` worked. Unit test. |
| 1.5 | Rapid removal re-added stocks, no rollback | Fixed | Edits read the latest symbols from a ref and go through a serial queue (`src/lib/serialQueue.ts`). Failures roll back, then resync from the server. | Simulation: server ended at `[B,C]` before and `[C]` after. Unit test. |
| 1.6 | `api.ts` didn't check `res.ok` | Fixed | A single `requestJSON` helper throws on non-2xx. All calls use it and callers catch. The initial `resetDemo` failure no longer blocks loading. | Headless render against a 401-only server: "Something went wrong" before, dashboard after. Unit test. |
| 1.7 | Unhandled async errors in auth middleware | Fixed | `getUser` is wrapped in try/catch and answers 503. | Invalid Supabase URL: unhandled rejection and a hanging request before, 503 after. Unit test. |
| 1.8 | Rename wiped all stocks | Fixed | A name-only update patches the row directly. Symbols still go through the RPC. | Stubbed Supabase: `replace_watchlist_items` with `p_symbols: []` before, `PATCH watchlists` after. Unit test. |
| 1.9 | Unbounded in-memory sessions | Fixed | 6h idle TTL (swept on access, no timers), cap of 5000 with LRU eviction, session ID limited to 64 chars. | 20k unique IDs: 5000 sessions remain, and TTL expiry leaves 1. Unit test. |
| 1.10 | Duplicate default watchlists | Fixed | Migration `20261027000001`: per-user advisory lock, unique partial index `(user_id) WHERE is_default`, existing duplicates demoted (not deleted). Idempotent creation with a `unique_violation` guard. | Local Postgres, two concurrent transactions: 2 defaults before, 1 after (twice). The migration can be re-run. |

### Phase 2: Medium severity

| # | Issue | Status | What changed | How verified |
|---|-------|--------|--------------|--------------|
| 2.1 | Stale or hardcoded narratives | Fixed | Fixed text for 5 symbols and the `EXPLANATIONS` map were removed. Text is now built from the delta, volume and attention factors. | After "Mark as read": "RELIANCE gained 3.8%" at 0% before; "essentially unchanged" after. |
| 2.2 | Narrative cache shared by symbol | Fixed | The cache key covers every input (prices, volume, away time, level). Bounded to 500 entries. | The synced session no longer sees the cached narrative from the 7h 42m session. |
| 2.3 | "3 things changed" minimum | Fixed | `Math.max(3, n)` removed. The summary is computed from the watchlist, with "Nothing changed" and "1 thing" wording. | Probe: `[ITC]` gave 3 before and 0 after. The default list still gives 3. |
| 2.4 | Hardcoded fallback stocks | Fixed | `'RELIANCE, TCS'`/`'HDFCBANK'` fallbacks replaced with `None` (in a neutral colour). | Code review plus browser render. |
| 2.5 | Events not filtered by away time | Fixed | Only events inside the away window are shown. Times are derived from the timestamp (IST). | Probe: 15m gave 6 events (all in the future) before and 0 after. 2h gives 2, and synced gives 0. |
| 2.6 | Empty "Surges" filter | Fixed | The HDFCBANK "Volume Spike" event is now `volume_surge`. The detail modal colours events by the sign of the change. | Probe: the filter returns HDFCBANK. |
| 2.7 | Search chips / sector search | Fixed | Mock search also matches sector and tags. | Banking, Tech, Energy and EV returned 0 before. Now they return 3, 3, 1 and 1. |
| 2.8 | Search debounce and race | Fixed | 200ms debounce, only the latest request applies, errors caught. | Browser: a slow "T" response showed 10 stale results from 3 requests before; after, 1 correct result from 1 request. |
| 2.9 | Ctrl+K conflict | Fixed (preventive) | App is now the only Ctrl+K handler and toggles search. CommandSearch no longer listens for it. | No user-visible failure could be reproduced, since listener order happened to work. The fragile order dependence is gone, and the browser toggle test passes before and after. |
| 2.10 | Misleading status labels | Fixed | New `SIMULATED` feed mode: "Simulated data", and twelve_data mode says only search is live. The footer says "not real prices". | Browser: "Market Open", "Delayed 15m" and "NSE / BSE Delayed" are gone. |
| 2.11 | Stock modal loading forever, stale responses | Fixed | Error state with a retry button. Responses for a symbol that is no longer shown are ignored. | Browser: forced 500 loaded forever before; after, "Couldn't load RELIANCE. Try again". |
| 2.12 | Chart date axis | Fixed | Points carry a `timestamp`. The client formats a time for 1D, day and time for 1W, and a date for 1M/1Y/ALL. | Browser hover: 1M/1Y showed identical hh:mm before; after, "29 Sept 2026" and "24 Nov 2025". |
| 2.13 | ₹ for US stocks | Fixed | `currencySymbol(exchange)` (`src/lib/currency.ts`) used everywhere, including attention-factor text. Index values have no currency sign. | Browser: AAPL row and MSFT modal show `$`, RELIANCE shows `₹`. |
| 2.14 | Invented `dayHigh` | Fixed | The day range is bounded by the open and current price. | Probe: ITC high 484.0 (≈30d high) before, 472.1 after. |
| 2.15 | Active watchlist not saved | Fixed | Selecting a list sends `setActive` (non-blocking). | Browser: reload returned to Primary before; after it keeps "Tech & Digital". |
| 2.16 | Delete inconsistencies | Fixed | Supabase mode keeps the selection unless the active list was deleted. Demo mode refuses to delete the default and returns 404 for unknown IDs. | curl (demo) and stubbed Supabase. |
| 2.17 | Polling vs watchlist-switch race | Fixed | Load generations: a load applies only if no newer load or edit started. | Browser: heading "Tech & Digital" showed Primary's 9 rows before; after, Tech's 3 rows. |
| 2.18 | Route input validation | Fixed | `server/validation.ts` checks name, symbols (upper-cased, de-duplicated, max 100), IDs, query strings and `awaySeconds` (≤30 days). | curl: repeated `?q` gave 500 and bad symbols, `1e12` seconds and object symbols were accepted. All now give 400 (repeated `?q` returns normal results). |
| 2.19 | Client-set `is_default` | Fixed | Migration `20261027000002`: column privileges (`INSERT(user_id,name)`, `UPDATE(name,updated_at)`). The RPC ignores `p_is_default`. `ensure_default_watchlist` is `SECURITY DEFINER`. | Local Postgres as `authenticated`: the RPC created a default before; after, RPC gives `false` and direct INSERT/UPDATE are denied. The normal create/replace/rename/default flows still work. |
| 2.20 | Escape closed all modals | Fixed | Shared `useEscapeKey` layer stack: only the topmost layer closes. The create modal now closes on Escape. | Browser: one Escape closed the modal underneath before; after it closes Why, then the detail modal. |
| 2.21 | Create-watchlist errors | Fixed | Errors shown in the modal, `maxLength=50`, selection reset after success. | Browser: no message and 1 unhandled rejection before; after, the message is shown with 0 rejections. |
| 2.22 | Auth message issues | Partly fixed | Rate-limit and unconfirmed-email messages added, and other Supabase errors keep their own text. "Check your email" only shows without a session. "Skip for now" persists per tab, and the sign-out button becomes "Exit demo" (hidden when demo mode is forced). **Password reset not added**, see §4. | Browser with stubbed auth: rate limit gave a generic error before and a specific message after. Demo: sign-out did nothing before; now it exits to sign-in, and reload keeps demo. |

### Phase 3: Security and performance

| # | Issue | Status | What changed | How verified |
|---|-------|--------|--------------|--------------|
| 3.1 | Security headers | Fixed | `helmet` added, `X-Powered-By` removed. A CSP (self, Google Fonts, Supabase) applies to the production build. `vercel.json` sets the same headers for static files. | curl: no headers before; CSP, HSTS, nosniff, frame and referrer headers after. The production build renders with 0 CSP violations and the font loads. |
| 3.2 | Generic error messages | Fixed | `server/errors.ts`: `sendError` logs and returns a generic 500, and `ClientError` keeps business-rule messages. The JSON error handler covers malformed bodies. | Stubbed Supabase: a raw Postgres error before, generic after. Bad JSON gave an HTML stack trace before, now `400 Invalid JSON body`. |
| 3.3 | 404 for unknown `/api` routes | Fixed | `/api` catch-all returns a JSON 404, registered before the SPA fallback. | 200 `text/html` before, `404 {"error":"Not found"}` after (dev and prod). |
| 3.4 | `active_watchlist_id` ownership | Fixed | Migration `20261027000003`: a trigger enforces ownership, and existing foreign references are set to NULL (no rows deleted). | Local Postgres: pointing at another user's watchlist UUID succeeded before and raises after. Own lists and deleting the active list still work. |
| 3.5 | Fewer poll requests | Fixed | Indices, feed status and the stock universe load once at startup. Read-only routes skip `ensure_default_watchlist`. | Browser: 7 requests per poll before, 4 after. Stubbed Supabase: 16 calls per poll before, 13 after. |
| 3.6 | Pause polling when hidden | Fixed | Polling skips while `document.visibilityState` is hidden and refreshes on return. | Browser: 7 requests while hidden before; after, 0 while hidden and 4 on return. |
| 3.7 | Gemini timeout and dedupe | Fixed | 3s timeout falls back to deterministic text. Concurrent identical requests share one call. `GEMINI_MODEL` env override. | Stubbed 8s Gemini: blocked for over 6s with 3 calls before; after, 3.0s with 1 call. A fast Gemini is still used. |
| 3.8 | Reduced-motion support | Fixed | The canvas and intro draw a static frame. `MotionConfig reducedMotion="user"`. | Browser with emulated reduce: 60 frames/sec before, 0 after. Normal motion is unchanged. |

### Phase 4: Accessibility and engineering

| # | Issue | Status | What changed | How verified |
|---|-------|--------|--------------|--------------|
| 4.1 | Keyboard and touch access | Fixed | The remove button always shows on touch devices and on row focus, and has an `aria-label`. The header logo and session time are now `<button>`s. Timeline cards are focusable and open with Enter or Space. | Browser: opacity 0 on focus and touch before, 1 after. The header controls and timeline cards are now in the tab order. |
| 4.2 | Modal focus trap and restore | Fixed | `useFocusTrap` hook used on all 5 dialogs. Search and create dialogs get `role="dialog"` and `aria-modal`. | Browser: 25 of 25 Tab presses left the dialog before; after, 0 of 25 and focus returns to the opener. |
| 4.3 | Popover outside click and Escape | Fixed | Closes on outside pointer-down or Escape, and sets `aria-expanded`. | Browser: stayed open on outside click before; after it closes, and an inside click keeps it open. |
| 4.4 | Enable `strict` | Fixed | `"strict": true` in `tsconfig.json`; the code had 0 strict errors. | `tsc --showConfig` and typecheck. |
| 4.5 | ESLint with react-hooks | Fixed | `eslint.config.js` and `npm run lint`. Fixed: a ternary used as a statement, 2× prefer-const, and the Why modal effect's missing dependency (now depends on the facts it sends and ignores stale responses). | `eslint .` is clean. |
| 4.6 | Tests for the Phase 1 bugs | Fixed (9 of 10 automated) | 20 tests in `tests/` (`npm test`, Node test runner via tsx). Issue 1.10 is a SQL race, which was verified manually in Docker (see above). | 20/20 pass. Swapping in `main`'s versions makes the matching tests fail. |

Extra commit: `docs:` README now lists the new migrations, the `lint`/`test` scripts and the `dist-server/` path.

---

## 2. Decisions made on your behalf

| Decision | Why | Alternatives |
|---|---|---|
| No Supabase config means demo mode, on both server and client | Nobody can sign in anyway, and it makes "no env vars" work without extra flags. No user data is exposed because there is no database. | Require `VITE_DEMO_MODE=true` and show a setup error otherwise. |
| Server bundle goes to `dist-server/` | Simplest way to keep it out of the statically served folder. | Serve only an allow-list from `dist/`, or put static files in `dist/public`. |
| The pulse ack button is hidden for stocks with no timeline events | Acknowledgements are stored per event, so there's nothing to save. | Add a per-stock acknowledgement on the server. |
| Failed watchlist edits roll back, then resync from the server | Rollback alone can disagree with requests that were already queued. | Pessimistic updates (wait before changing the UI). |
| Sessions: 6h idle TTL, 5000 cap, LRU, swept on access | No timers (serverless-friendly) and bounded memory. | Move sessions to Redis or Supabase (bigger change). |
| Duplicate defaults are demoted, not deleted | Your "do not delete data" rule. | Merge the duplicate lists' items. |
| Narratives are deterministic text from the data | Never contradicts the numbers. Gemini behaviour is unchanged. | Keep the hand-written demo copy, but only when the numbers match. |
| "Meaningful" threshold kept at score ≥ 65 | Existing value. The demo still shows 3. | Tune it. |
| Event times shown in IST | All event stocks trade on NSE, and the server timezone (UTC on Vercel) was arbitrary. | Format in the viewer's timezone on the client. |
| HDFCBANK event reclassified as `volume_surge` | It is literally a "Volume Spike" (14.5M shares). | Redefine the "Surges" filter (e.g. by volume in the text). |
| Search debounce of 200ms | Responsive while still cutting requests. | 300ms, or search on Enter. |
| New `SIMULATED` feed mode | Honest labelling, since prices never come from a feed. | Remove the indicator. |
| Currency by exchange (`$` for NASDAQ/NYSE) | Minimal change. Number grouping stays `en-IN`. | Add a `currency` field to the data model and use `Intl.NumberFormat` per currency. |
| Day range = open and current price | They're the only real intraday prices. | Generate a plausible high and low from the chart data. |
| Hand-written validation instead of zod | A handful of routes, so no new dependency. Names are still trimmed and truncated to 50 (previous behaviour). New demo watchlists without symbols are now empty (previously RELIANCE and TCS). | zod schemas. Rejecting names over 50 characters. |
| `is_default` protected by column privileges plus a `SECURITY DEFINER` `ensure_default_watchlist` | Covers both the RPC and direct table writes. The RPC keeps its signature, so old and new server code both work. | A trigger that rejects `is_default` changes. A separate internal function. |
| CSP only in production builds | Vite dev injects inline scripts. | A nonce-based CSP in dev. |
| `active_watchlist_id` ownership via a trigger, existing foreign references set to NULL | RLS can't express a cross-table check on a column. NULL falls back to the first list. | A composite foreign key `(id, user_id)`. |
| Static data loaded only at startup | It never changes between polls. The popover's "Last Engine Tick" time therefore shows load time. | Refresh static data every N polls. |
| Gemini timeout of 3s | Narratives are generated inside API requests. | Generate in the background and return the fallback immediately. |
| `GEMINI_MODEL` is not added to `.env.example` | Your "do not modify .env files" rule. It's documented here instead (optional, defaults to `gemini-3.6-flash`). | — |
| Focus trap and Escape stack are small in-house hooks | No new dependencies, and they're shared by all dialogs. | `focus-trap-react` or Radix Dialog. |
| ESLint: `exhaustive-deps` as a warning, `no-explicit-any` off | `any` is used deliberately at JSON and Supabase boundaries. Lint currently reports 0 warnings. | Stricter typed linting. |
| Tests use Node's runner via tsx | No new test dependency. | Vitest with jsdom (would allow component tests). |
| "Skip for now" persists in `sessionStorage` | Per tab, matching the existing per-tab demo session. | `localStorage` (across tabs). |

**New dependencies:**
- `helmet@^8.3.0` (runtime).
- Dev: `eslint@^10.12.0`, `@eslint/js@^10.0.1`, `typescript-eslint@^8.71.1`, `eslint-plugin-react-hooks@^7.1.1`, `globals@^17.13.0`.

All were published at least two weeks before today; newer releases were skipped for that reason.

---

## 3. Migrations to apply manually

Run these in the Supabase **SQL Editor**, in order, after the existing two. All three are idempotent and delete no rows.

1. **`supabase/migrations/20261027000001_one_default_watchlist_per_user.sql`**
   - Demotes duplicate default watchlists (keeps the oldest as default).
   - Adds the unique index `watchlists_one_default_per_user`.
   - Replaces `ensure_default_watchlist()` with a race-safe version.
2. **`supabase/migrations/20261027000002_server_controlled_default_watchlist.sql`**
   - Revokes table-wide INSERT/UPDATE on `watchlists` from `anon`/`authenticated` and grants only `INSERT(user_id, name)` and `UPDATE(name, updated_at)`.
   - Replaces `create_watchlist_with_items` (ignores `p_is_default`).
   - Makes `ensure_default_watchlist()` `SECURITY DEFINER`.
   - Relies on Supabase's default SELECT grant to `authenticated`, which standard projects have.
3. **`supabase/migrations/20261027000003_active_watchlist_ownership.sql`**
   - Sets any `profiles.active_watchlist_id` that points at someone else's watchlist to NULL.
   - Adds the `profiles_active_watchlist_owner` trigger.

**Deploy order:** the new server code works with and without these migrations, so you can deploy either first. After applying them, sign up a fresh test user and check:
- the default watchlist appears;
- creating, renaming, adding and removing stocks, and deleting a list all work;
- switching lists survives a reload.

These were tested only on a local Postgres with a stubbed `auth` schema, not on a real Supabase project.

---

## 4. Not done / needs your input

Nothing had to be reverted after three failed attempts. These were left alone because they need a product decision, configuration I can't do, or a bigger change than the scan item:

1. **Password reset (part of 2.22).** It needs a redirect URL configured in Supabase Auth settings and a new "set new password" screen for the `PASSWORD_RECOVERY` event. Decide whether you want it.
2. **Pre-existing `npm audit` findings**, all present on `main` and not introduced here: `express`/`body-parser`/`qs`/`proxy-addr` (1 critical, 1 high, 2 moderate) and `vite`/`source-map-js` (2 high). Fixing them means dependency upgrades (`npm audit fix`, possibly a Vite major). This is your call, because it can change build behaviour.
3. **Demo login credentials are published in `README.md`** (pre-existing, section 15). Consider removing them or rotating those accounts.
4. **Real market data.** Prices, indices and events are still a static demo dataset. Live quotes would be a new provider method, as the README already notes.
5. **Per-user "last seen" snapshots for signed-in users** still live in server memory (per instance on Vercel). A real fix needs a table, e.g. on `profiles`.
6. **The "ALL" chart timeframe is the same data as "1Y"** (mock data limitation).
7. **No UI for deleting or renaming watchlists.** The APIs exist and are fixed, but there are no screens. This wasn't in the fix list.
8. **The duplicate-default race (1.10) has no automated test.** That would need Postgres in CI. It was verified manually with Docker.
9. **Supabase-mode checks used stubs and a local Postgres**, not your real project. Please run the smoke test in §3 after applying the migrations.

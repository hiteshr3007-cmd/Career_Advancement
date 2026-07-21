# Frontend Test Cases

Living test-case set for frontend releases. Current baseline: **release 2026-07-20** (`main @ b07eb5c`). Extend each pass; regenerate a section only if the feature is significantly reworked.

## Not in scope (do NOT file as bugs)

- Auth screens, root splash page, sidebar, and dashboard welcome banner dark-mode exclusion — intentional fixed dark-gradient/white-card brand design.
- Recharts axis/grid/tick colors — set via SVG props, not touched by the theme pass (remain legible by default gray).
- Career-plan stuck at `processing` on server restart — backend reliability gap, no auto-recovery.
- Industry/category matching logic itself — only the frontend empty-state symptom was fixed; backend substring match unchanged.
- Rate limiting, resume-upload MIME-sniffing, OCR — known backend hardening gaps.
- `GET /admin/users` 500 on the `qa-admin@test.local` seed row — pre-existing reserved-TLD email validation bug, unrelated.

---

## Gap Analysis page (prefix `GAP-`)

Preconditions common to happy-path: candidate account with skills + experience on profile and ≥1 active benchmark whose category matches the candidate's industry. App reachable; logged in as that candidate.

### GAP-001 — Gap Analysis nav item visible for candidate only
- **Title:** Gap Analysis appears as an enabled nav item for candidates and is absent/inaccessible for other roles
- **Preconditions:** Accounts for candidate and for a staff/admin role.
- **Roles:** Candidate (visible), staff/admin (not applicable)
- **Steps:** 1) Log in as candidate. 2) Inspect sidebar. 3) Log in as recruiter/admin, inspect sidebar.
- **Expected:** Candidate sees an enabled "Gap Analysis" nav entry (no "Soon" badge). Non-candidate roles do not see it (or it is not reachable / redirects), consistent with candidate-only career endpoints.
- **Priority:** major

### GAP-002 — Generate gap analysis happy path (async lifecycle)
- **Title:** Generating a gap analysis moves spinner → populated report
- **Preconditions:** Candidate with matching active benchmark; no in-flight plan.
- **Roles:** Candidate
- **Steps:** 1) Open Gap Analysis. 2) Click "Generate my gap analysis". 3) Observe the loading/spinner state. 4) Wait for completion.
- **Expected:** UI shows a pending/processing spinner, then renders a populated report containing: overall readiness score, prioritized skill gaps each with a priority band, missing certifications, experience gap, and resume-quality issues. No console errors; no `undefined`/`null`/`NaN` rendered.
- **Priority:** critical

### GAP-003 — Regenerate disables button mid-request and refreshes report
- **Title:** Regenerate disables its button during the request and refreshes the report on completion
- **Preconditions:** A completed gap report already displayed.
- **Roles:** Candidate
- **Steps:** 1) With a completed report shown, click "Regenerate". 2) Observe the button state during the request. 3) Wait for completion.
- **Expected:** The Regenerate button is disabled (and/or shows a busy state) while the request is in flight, preventing double-submit; on completion the report content refreshes (timestamp/values update) and the button re-enables.
- **Priority:** major

### GAP-004 — Report sections map to real backend data
- **Title:** Rendered gap sections match `GET /career/me/gap-report`
- **Preconditions:** Completed plan.
- **Roles:** Candidate
- **Steps:** 1) Open Gap Analysis with a completed report. 2) Capture the network response for the gap-report call. 3) Compare rendered skill gaps / certifications / experience gap / readiness score against the response.
- **Expected:** Every rendered value is sourced from the live response (no hardcoded/placeholder values); priority bands shown match the response's priority data.
- **Priority:** major

### GAP-005 — Empty/edge state: no plan generated yet
- **Title:** Gap Analysis before any generation shows a clear call-to-action, not an error or blank
- **Preconditions:** Candidate who has never generated a plan.
- **Roles:** Candidate
- **Steps:** 1) Open Gap Analysis as a fresh candidate. 2) Observe initial state.
- **Expected:** A clear empty/initial state with a "Generate my gap analysis" affordance — not a spinner that never resolves, a raw 404, or a blank page.
- **Priority:** major

### GAP-006 — Edge: minimal-profile candidate (no skills/experience)
- **Title:** Gap analysis for a bare profile completes without crashing
- **Preconditions:** Candidate with an empty/minimal profile but a matching active benchmark exists.
- **Roles:** Candidate
- **Steps:** 1) Generate a gap analysis. 2) Inspect the report.
- **Expected:** Report completes; skill gaps reflect that most/all required skills are missing (or a coherent state), no `NaN`/`undefined`, readiness score renders as a valid number.
- **Priority:** minor

---

## Career Roadmap page (prefix `ROAD-`)

### ROAD-001 — Career Roadmap nav item visible for candidate only
- **Title:** Career Roadmap is an enabled candidate-only nav entry
- **Preconditions:** Candidate + non-candidate accounts.
- **Roles:** Candidate (visible)
- **Steps:** 1) Log in as candidate, check sidebar for "Career Roadmap" (no "Soon"). 2) Check a non-candidate role.
- **Expected:** Enabled for candidate; not reachable for other roles.
- **Priority:** major

### ROAD-002 — Generate roadmap happy path
- **Title:** Generating a roadmap renders four phases in order
- **Preconditions:** Candidate with matching active benchmark.
- **Roles:** Candidate
- **Steps:** 1) Open Career Roadmap. 2) Generate a plan. 3) Wait for completion.
- **Expected:** All four horizons render **in order**: 30-day, 90-day, 180-day, 12-month. Each phase shows its goal and a non-empty list of actions, each action tagged by focus area (skill / certification / resume / experience / networking).
- **Priority:** critical

### ROAD-003 — All four horizons present with non-empty actions
- **Title:** No horizon is missing or empty
- **Preconditions:** Completed roadmap.
- **Roles:** Candidate
- **Steps:** 1) Inspect each of the four phase blocks.
- **Expected:** Exactly four phases, correct order, each with ≥1 action. If the backend (deterministic scaffold) always emits four, the page must render four. (Note: LLM path may emit fewer — record but see backend RM- notes.)
- **Priority:** major

### ROAD-004 — Dashboard "Generate Roadmap" quick action navigates correctly
- **Title:** Dashboard quick action routes to Career Roadmap
- **Preconditions:** Candidate on dashboard.
- **Roles:** Candidate
- **Steps:** 1) On the dashboard, click "Generate Roadmap" quick action.
- **Expected:** Navigates to the Career Roadmap page (previously linked nowhere). No 404/dead link.
- **Priority:** major

### ROAD-005 — Regenerate lifecycle and button disabling
- **Title:** Roadmap regenerate disables mid-request and refreshes
- **Preconditions:** Completed roadmap.
- **Roles:** Candidate
- **Steps:** 1) Click Regenerate. 2) Observe button during request. 3) Wait for refresh.
- **Expected:** Button disabled during request; content refreshes on completion.
- **Priority:** major

### ROAD-006 — Edge: roadmap content consistent with gap analysis
- **Title:** Roadmap actions align with the same candidate's gap report
- **Preconditions:** Both gap report and roadmap generated for the same candidate.
- **Roles:** Candidate
- **Steps:** 1) Note the top skill gaps from Gap Analysis. 2) Open Career Roadmap. 3) Compare.
- **Expected:** Roadmap actions plausibly address the gaps surfaced in the gap report (e.g. a missing required skill appears as a skill-focus action). No contradictory content.
- **Priority:** minor

---

## Password-reset email delivery (prefix `PWR-`)

### PWR-001 — Request reset for a known account returns neutral 202
- **Title:** Forgot-password request always accepts (no account enumeration)
- **Preconditions:** A known account email exists.
- **Roles:** All
- **Steps:** 1) Go to `/forgot-password`. 2) Submit a known account email.
- **Expected:** UI shows a neutral confirmation (e.g. "if an account exists, a link was sent"); HTTP 202. No indication of whether the email exists.
- **Priority:** major

### PWR-002 — Reset link retrievable in dev (no SMTP) via server log
- **Title:** With no SMTP_HOST, the reset link is logged at WARNING and readable
- **Preconditions:** Backend running with no `SMTP_HOST` configured.
- **Roles:** All
- **Steps:** 1) Request a reset. 2) Read the backend server log.
- **Expected:** A log line at WARNING level contains the reset link (`/reset-password?token=…`). (Ties to fix FL-.)
- **Priority:** critical

### PWR-003 — Complete reset: new password works, old fails
- **Title:** Setting a new password via the link updates credentials
- **Preconditions:** A valid reset link obtained.
- **Roles:** All
- **Steps:** 1) Open the link (`/reset-password?token=…`). 2) Set a new password. 3) Log in with the new password. 4) Attempt login with the old password.
- **Expected:** New-password login succeeds; old-password login fails (401).
- **Priority:** critical

### PWR-004 — Reset link is single-use
- **Title:** Reusing a consumed reset link is rejected
- **Preconditions:** A reset link already used once (PWR-003).
- **Roles:** All
- **Steps:** 1) Open the same link again. 2) Attempt to set a password.
- **Expected:** Rejected with "Invalid or expired reset token".
- **Priority:** major

### PWR-005 — Reset page with missing/garbage token
- **Title:** `/reset-password` with an invalid or absent token shows an error, not a crash
- **Preconditions:** None.
- **Roles:** All
- **Steps:** 1) Open `/reset-password` with no token. 2) Open with a garbage token and try to submit.
- **Expected:** Clear invalid-token messaging; no console crash, no blank page, no ability to submit a valid reset.
- **Priority:** minor

### PWR-006 — Edge: request reset for unknown email
- **Title:** Unknown email still returns neutral 202 (no enumeration) and sends/logs nothing
- **Preconditions:** An email not registered.
- **Roles:** All
- **Steps:** 1) Submit an unknown email at `/forgot-password`.
- **Expected:** Same neutral 202 response as PWR-001; no reset link logged/sent for the nonexistent account.
- **Priority:** minor

---

## Settings page (prefix `SET-`)

### SET-001 — Account card shows the logged-in user's details
- **Title:** Settings Account card matches the current account for every role
- **Preconditions:** Accounts for each role.
- **Roles:** All (candidate, recruiter, hr_reviewer, employer, administrator, super-admin if present)
- **Steps:** 1) Log in as each role. 2) Open Settings. 3) Compare name/email/role vs `GET /auth/me`.
- **Expected:** Account card shows correct name, email, and role for the logged-in account, matching `/auth/me`.
- **Priority:** major

### SET-002 — Appearance card present with theme control
- **Title:** Settings shows an Appearance card with a light/dark control
- **Preconditions:** Logged in.
- **Roles:** All
- **Steps:** 1) Open Settings. 2) Locate the Appearance card.
- **Expected:** Appearance card renders with a working light/dark theme control.
- **Priority:** major

### SET-003 — Settings reachable from bottom of nav for all roles
- **Title:** Settings nav entry present for all roles
- **Preconditions:** Accounts per role.
- **Roles:** All
- **Steps:** 1) For each role, find "Settings" at the bottom of the sidebar and open it.
- **Expected:** Reachable for every role; page loads with both cards.
- **Priority:** minor

### SET-004 — Edge: Settings legible in dark mode
- **Title:** Settings cards legible in dark mode
- **Preconditions:** Dark mode enabled.
- **Roles:** All
- **Steps:** 1) Enable dark mode. 2) Open Settings.
- **Expected:** Account and Appearance cards use dark-card-on-dark-page with light text; no white-on-white. (Overlaps DARK-.)
- **Priority:** minor

---

## Theme toggle (prefix `THM-`)

### THM-001 — Topbar toggle switches theme and syncs with Settings
- **Title:** Topbar moon/sun toggle flips theme and Settings reflects it
- **Preconditions:** Logged in.
- **Roles:** All
- **Steps:** 1) Click the topbar theme icon. 2) Observe the app shell background. 3) Open Settings → Appearance.
- **Expected:** App shell background switches; Settings Appearance control shows the same (now-active) state. The two controls are in sync.
- **Priority:** major

### THM-002 — Settings toggle switches theme and syncs with topbar
- **Title:** Settings Appearance control flips theme and topbar icon reflects it
- **Preconditions:** Logged in.
- **Roles:** All
- **Steps:** 1) In Settings, flip the theme control. 2) Observe topbar icon and background.
- **Expected:** Theme switches; topbar icon state matches. Bidirectional sync.
- **Priority:** major

### THM-003 — Theme persists across reload
- **Title:** Chosen theme is remembered after a page reload
- **Preconditions:** Logged in.
- **Roles:** All
- **Steps:** 1) Set dark mode. 2) Reload the page. 3) Set light mode. 4) Reload.
- **Expected:** The chosen theme persists across reloads (stored preference), not reset to default.
- **Priority:** major

### THM-004 — OS preference respected on first visit
- **Title:** First visit (no stored preference) respects OS `prefers-color-scheme`
- **Preconditions:** Fresh/incognito session with no stored theme; OS set to dark (and separately light).
- **Roles:** All
- **Steps:** 1) In a fresh incognito session with OS dark, load the app. 2) Repeat with OS light.
- **Expected:** First render matches the OS preference; subsequent explicit choice overrides and persists.
- **Priority:** minor

### THM-005 — Edge: theme choice isolated per stored preference, survives navigation
- **Title:** Theme stays applied across in-app navigation
- **Preconditions:** Logged in, dark mode set.
- **Roles:** All
- **Steps:** 1) Set dark. 2) Navigate across several dashboard pages.
- **Expected:** Dark mode remains applied on every page without flicker back to light.
- **Priority:** minor

---

## Dark-mode legibility across dashboard pages (prefix `DARK-`)

Common preconditions: dark mode enabled; appropriate role for the page. For each: headings, card backgrounds, table rows, and modal content must be legible (dark card on dark page, light text) — never white-on-white or dark-on-dark. Toggling back to light must be pixel-identical to pre-change.

### DARK-001 — Core candidate pages (Dashboard, Profile, Upload, Career Matches)
- **Roles:** Candidate
- **Steps:** 1) In dark mode, visit Dashboard, Profile, Upload, Career Matches. 2) Inspect headings/cards/tables. 3) Toggle to light and compare.
- **Expected:** All legible in dark; Career Matches heading specifically legible (was the reported symptom); light mode unchanged.
- **Priority:** major

### DARK-002 — Career Intelligence pages (Gap Analysis, Career Roadmap)
- **Roles:** Candidate
- **Steps:** 1) Dark mode; open Gap Analysis and Career Roadmap with populated content. 2) Inspect.
- **Expected:** Phase cards, gap tables, badges legible in dark; light mode unchanged.
- **Priority:** major

### DARK-003 — Candidate directory + Candidate detail modal (staff/admin)
- **Roles:** Recruiter/HR/Employer/Admin
- **Steps:** 1) Dark mode; open Candidates. 2) Open a candidate detail modal.
- **Expected:** Table rows and modal content legible in dark.
- **Priority:** major

### DARK-004 — Benchmarks list + BOTH modals (detail + edit)
- **Roles:** Staff/Admin
- **Steps:** 1) Dark mode; open Benchmarks. 2) Open the read-only **detail** modal (click a row). 3) Open the **edit** modal.
- **Expected:** Both modals render dark (not hardcoded white). Detail modal specifically must not be white-on-dark (ties to fix FM-).
- **Priority:** major

### DARK-005 — Admin + Super Admin pages
- **Roles:** Administrator / Super Admin
- **Steps:** 1) Dark mode; open Admin (user management) and Super Admin pages.
- **Expected:** Tables, forms, cards legible in dark.
- **Priority:** major

### DARK-006 — Settings + shared forms/widgets, and light-mode parity sweep
- **Roles:** All
- **Steps:** 1) Dark mode; open Settings and any form-bearing pages. 2) Toggle back to light. 3) Compare each page to expected light appearance.
- **Expected:** Dark legible everywhere; light mode pixel-identical to before the migration (no regressions from token migration).
- **Priority:** major

---

## Fix verification: "0% ready, no gaps" messaging (prefix `FZ-`)

### FZ-001 — Non-matching-industry candidate shows distinct message on Gap Analysis
- **Title:** Gap Analysis shows "No active benchmarks matched your profile" when zero benchmarks matched
- **Preconditions:** Candidate whose industry/functional area matches no active benchmark category; plan generated to completion.
- **Roles:** Candidate
- **Steps:** 1) Set up such a candidate. 2) Generate a plan. 3) Open Gap Analysis.
- **Expected:** Distinct "No active benchmarks matched your profile" explanation — NOT a misleading "0% ready / no gaps / fully qualified" state.
- **Priority:** critical

### FZ-002 — Same distinct message on Career Roadmap
- **Title:** Career Roadmap shows the same distinct no-match message
- **Preconditions:** Same as FZ-001.
- **Roles:** Candidate
- **Steps:** 1) Open Career Roadmap for the same candidate.
- **Expected:** Same "No active benchmarks matched your profile" message; no fabricated roadmap.
- **Priority:** critical

### FZ-003 — Profile link in the message navigates to /profile
- **Title:** "Double-check your profile" link opens the profile page
- **Preconditions:** No-match message displayed.
- **Roles:** Candidate
- **Steps:** 1) Click "Double-check your profile" in the message.
- **Expected:** Navigates to `/profile`.
- **Priority:** major

---

## Fix verification: dev-mode reset-link logging (prefix `FL-`)

### FL-001 — Reset link appears in server log at WARNING
- **Title:** No-SMTP reset link is logged and visible
- **Preconditions:** Backend with no SMTP_HOST.
- **Roles:** All
- **Steps:** 1) Request a password reset. 2) Inspect backend logs.
- **Expected:** The reset link is emitted at WARNING level (previously swallowed at INFO) and is visible in the log.
- **Priority:** major

### FL-002 — Link from log completes the reset end-to-end
- **Title:** The logged link is functional
- **Preconditions:** FL-001 link obtained.
- **Roles:** All
- **Steps:** 1) Use the logged link to reset a password (per PWR-003).
- **Expected:** Reset completes; the logged URL is correct and usable.
- **Priority:** minor

---

## Fix verification: Benchmarks detail modal dark mode (prefix `FM-`)

### FM-001 — Read-only detail modal renders dark
- **Title:** Benchmarks detail (read-only) modal is not hardcoded white in dark mode
- **Preconditions:** Dark mode; staff/admin; ≥1 benchmark.
- **Roles:** Recruiter/HR/Employer/Admin
- **Steps:** 1) Dark mode. 2) Benchmarks → click a row to open the read-only detail modal. 3) Inspect background/text.
- **Expected:** Modal uses dark background with light text (not the old hardcoded white). Verified by opening in the browser, not diff alone.
- **Priority:** major

### FM-002 — Edit modal still correct in dark (no regression)
- **Title:** Benchmarks edit modal remains dark-correct
- **Preconditions:** Same as FM-001.
- **Roles:** Staff/Admin
- **Steps:** 1) Dark mode. 2) Open the edit modal.
- **Expected:** Edit modal dark-correct (it was already fixed); confirm no regression alongside the detail-modal fix.
- **Priority:** minor

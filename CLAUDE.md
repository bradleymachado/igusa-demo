# CLAUDE.md — Igusa Investor Demo

Clickable web prototype of the Igusa iPhone app for investor pitches. Spec: `PRD.md`. Product sources of truth: `..\Igusa_ConceptBrief_v1.1.md`, `..\01_Assignments\Igusa\Igusa_BuildPlan_v1.0.md` (§2 fixed inputs, §3 check values, design and language rules).

## Stack
Node 25, Vite + React 19 + TypeScript, plain CSS custom properties, Vitest (unit), Playwright (screens). No UI kit, no backend, no model calls.

## Commands
- `npm run dev` — local server
- `npm test` — engine + data unit tests (D1, D2, D4)
- `npm run e2e` — Playwright flow + screenshots to `shots/`
- `npm run build` — static build to `dist/`

## Layout
- `src/engine/` — pure TS: day index, shade levels, Weave lift, ranking (mirror of Swift S10; no React imports)
- `src/data/` — condition templates (events, colours, planted patterns) + fixed-seed sample-data generator
- `src/theme/` — `tokens.css` with `[data-theme="newsprint"|"tatami"]`
- `src/stage/` — side-by-side layout, presenter bar
- `src/phone/` — iPhone frame, status bar, home screen, widgets
- `src/watch/` — Apple Watch frame, watch face, complication, tiles, severity picker
- `src/setup/` — setup tutorial (condition pick, events, widget step, sample-data choice)
- `src/state/` — one shared store for both devices (entries, events, theme), localStorage-backed
- `src/screens/` — EventList, Grid, Weave, DoctorSummary, Paywall

## Rules
- Colour only on data. Event palette: Brick #B5462F, Slate #3F6694, Ochre #C08A2E, Plum #7A4E82, Moss #5E7F3A. Patina #3F8A84 is the brand colour, never an event.
- Shade ramp: event-hex tints at 22/40/58/78/100 %; empty #F0F0F0 (theme-adjusted).
- Touch targets ≥ 44 px; every control has an aria-label.
- Weave wording is association only ("followed … more often"). Never "cause", "diagnose", "treat", "cure". No nutrition figures.
- Footer on every view: "Prototype. Sample data. Not medical advice."
- All theme values come from tokens; components never hard-code colours.
- Pushing to GitHub and enabling Pages are Brad's to approve.
- Commit locally after each slice passes its checks.

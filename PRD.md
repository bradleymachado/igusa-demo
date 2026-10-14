# Igusa Investor Demo — PRD v1.1

Live: https://bradmachado.com/igusa-demo/ (published 2026-10-14)

2026-10-11 · Owner: Brad · Window: Mon 12 Oct – Fri 23 Oct 2026 (Mac mini arrives in this window; native S0 follows)

v1.1: phone and Apple Watch side by side; setup tutorial for the viewer's own condition replaces the single fixed demo user; visual directions cut from three to two to fit.

## Problem
Investors can't feel "log a symptom in one tap, then see the pattern" from a deck. They need to touch it, and the native app is weeks away.

## User
An investor, in two settings: (a) Brad presenting from a laptop; (b) the investor opening the link on their own device afterwards. Secondary: Brad trying out look and feel before the SwiftUI build.

## Stage
A laptop screen with an iPhone and an Apple Watch side by side, both live and in sync. A thin presenter bar sits underneath (steps, theme switch, Reset). On a phone-sized screen the iPhone fills the screen and the Watch sits behind a toggle.

## Core flow (the 3-minute pitch)
1. **Setup tutorial** in the iPhone app: "What are you tracking?" → pick a condition (IBS · Migraine · Heartburn/GERD · Food allergy · Hives/eczema · Start blank) → suggested events with colours and the "ask severity" setting → edit or accept → "Add the widget" step → choose "Fill with 6 months of sample data" (default) or start empty.
2. **Home screen:** the widget now shows the viewer's events. Tap a colour tile → "Logged." + Undo; tap a severity event → 1–5 row → tap 3 → today's count goes up.
3. **Watch:** tap the complication or a tile on the watch face → logs → the iPhone widget and grid update at the same moment.
4. **App:** event list with press and hold → severity; year grid → scrub → tap a day → that day's entries.
5. **Weave:** overlay grid (e.g. Bloating × Dairy, diagonal split), trigger ranking ("Bloating followed dairy meals 2.8× more often"), When view (hour × weekday).
6. **Doctor summary** (one printable page) → **paywall** ($2.99 / $14.99 / $29.99).

## v1 must-haves
1. Side-by-side iPhone + Apple Watch frames with a simulated home screen (small/medium/large widgets) and watch face (complication + one-tap tiles + severity crown-style picker), sharing one live state.
2. Setup tutorial with 5 condition templates + blank; each template defines events, colours, severity settings and the planted patterns its sample data shows.
3. In-app screens: event list, year grid with scrub + day panel, Weave (overlay, ranking, When), doctor summary, paywall.
4. Deterministic sample data per template (fixed seed), 6 months, with planted patterns; live taps add to it; Reset returns to the start of the tutorial.
5. Two switchable visual directions from one theme-token file: **A Newsprint** (concept brief §5 as written) and **B Tatami** (warm paper, woven grid cells). Night is cut for time; the token file leaves room for it.
6. One public link that works on a laptop and a phone.

## Out of scope
Accounts, backend, persistence beyond localStorage, Siri, HealthKit, real AI meal tagging (tags are seeded), StoreKit, Android/Wear OS, analytics, CSV export, a Night theme.

## Native plan impact
The Watch is **not** in Build Plan S0–S17. Showing it to investors implies it ships. If the demo keeps it, the native plan needs a watchOS subtask (estimate 8–12 h: watch app + complication + sync through the shared store) after S6. R3 found 832 roadmap votes for widget/Watch/Siri in competitors' reviews, so the demand is real.

## Stack and hosting
Vite + React + TypeScript, plain CSS with custom properties (no UI kit). Fonts: Newsreader + Libre Franklin. Static build → GitHub Pages (repo `bradleymachado/igusa-demo`, public; Brad approves the push).

## Right-sizing
No model calls. Weave runs in plain TypeScript (lagged co-occurrence → lift), so live taps really change the results and the engine doubles as the reference for Swift S10. Sample data comes from a fixed-seed generator per template, not hand-typed.

## Data
Generated in code; tutorial choices and live taps go to localStorage on the viewer's device only. No personal data leaves the browser. Footer: "Prototype. Sample data. Not medical advice."

## Definition of done
| # | Check | Evidence |
|---|---|---|
| D1 | Weave lift on synthetic set A = 3.00 ± 0.05; below-threshold set (8 exposures / 4 symptoms) suppressed with "2 more exposures needed" | `npm test` output |
| D2 | Shade levels for counts 0,1,2,3,4,5,7 → 0,1,2,3,4,5,5; entry at 2026-09-27 23:59 local → day 27 Sep | `npm test` output |
| D3 | Widget tap and watch tap each → today's count +1 on both devices and the grid cell shade updates; severity attaches to the original tap time | Playwright test + screenshots |
| D4 | Every template's sample data yields ≥ 3 ranked triggers above threshold; IBS gives Bloating × Dairy lift between 2.5 and 3.2 | test output |
| D5 | Tutorial → home screen → watch → app → Weave → summary → paywall, no dead ends, at 1440×900 (both devices) and 390×844 (phone) | screenshots per step |
| D6 | No "cause", "diagnos", "treat" or "cure" in shipped UI strings | grep count = 0 |
| D7 | Theme switch A ↔ B without reload; text contrast ≥ 4.5:1 in both | screenshots + contrast script |
| D8 | `npm run build` passes; the Pages URL loads in Chrome with 0 console errors | build log + URL + console read |

## Schedule (vertical slices)
| Slice | Days | Output |
|---|---|---|
| V1 Scaffold, stage with both frames, theme tokens, shared state, engine + generator with tests (D1, D2) | Mon 12 – Tue 13 | runs locally |
| V2 iPhone home screen + widgets, instant tap, severity step, undo | Wed 14 | hero moment |
| V3 Watch face: complication, tiles, severity picker, live sync with iPhone (D3) | Thu 15 | |
| V4 Setup tutorial + 5 condition templates and their sample data (D4) | Fri 16 – Mon 19 | |
| V5 Event list, year grid, scrub, day panel; Weave overlay, ranking, When view | Tue 20 – Wed 21 | |
| V6 Doctor summary, paywall, presenter bar; Tatami theme; UX pass, audit, deploy prep (D5–D8) | Thu 22 – Fri 23 | Brad approves push |

## Open questions (defaults in force until Brad says otherwise)
- Condition list: IBS, Migraine, Heartburn/GERD, Food allergy, Hives/eczema (R4 evidence: NICE CG150 diary, UAS7, Monash FODMAP).
- Watch stays in the demo, and a watchOS subtask gets added to the native plan.
- Repo public on Pages. Alternative: a private repo with Netlify password protection.

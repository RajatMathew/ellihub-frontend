# 01 · Run and readback
**Who:** Rajat + Yasim (each posts your own readback) · **Depends on:** — · **Estimate:** S

## Goal
You've both actually clicked through the module against the doc that says what's real vs mock, and
you've each posted a 10-line plan for card 02 in your own words — so any misunderstanding gets caught
today, not three weeks in. Nothing gets built or changed in this card.

## Where it shows in the UI
The whole module: Projects · SOV · Requisitions · Change Orders · Documents tabs, plus the
`requisitions@` mailbox Tasks board (it reads state from this module). Two spots are worth a close
look because they're not obviously mock at a glance: the SOV tab's 489 State Street file card opens a
real workbook (`public/reqs/489-state-street/SOV.xlsx`), and the Documents tab's Boyland file browser
is a static list reproduced from Peter's drive, not a live file store.

## Backend
None. This card is look-only — no schema, no endpoints.

## Frontend
None. No code changes. Just run what's already there.

```bash
git checkout peter/requisitions-module
npm install --legacy-peer-deps
npm run dev
```
(If your checkout root is the monorepo root rather than this `ellihub-frontend` folder, `cd frontend`
first — see `../README.md`.) Open `http://localhost:5174/app/requisitions`. The screens open without a
backend because of a dev auth bypass wired in `.env` (`VITE_DEV_AUTH_BYPASS`) — that's expected, and
card 09 removes it once real auth is wired. If Peter instead points you at a live demo URL on the
issue, use that and skip the local run.

## Done when
- [ ] App is running locally at the URL above, or you've opened the demo URL from the issue
- [ ] You've opened every tab — **Projects · SOV · Requisitions · Change Orders · Documents** — and
      every view on each (**Pipeline** default, **Board**, **List** — Documents defaults to **List**)
- [ ] You've opened the Projects drawer for at least one project in each of the four lifecycle buckets
      (Onboarding, Active, Fully billed, Archived) and scrolled through every section: KPIs, onboarding
      checklist / month timeline / close-out (whichever applies), contacts, billing settings, notes,
      documents, activity
- [ ] You've opened a requisition drawer and its G702 editor (try Hollis's July requisition — it's at
      Pencil)
- [ ] You've opened a Change Order drawer with its inline PDF (Boyland has real ones)
- [ ] You've opened the `requisitions@` mailbox and found its Tasks board, and noticed at least one
      card that's clearly derived from module state rather than hand-written
- [ ] You've read `../real-vs-mock.md` top to bottom, including the "Fixed by Peter — do not change"
      list at the bottom, and checked at least three rows of the table against what you actually saw
      on screen
- [ ] You've each posted your own 10-line plan for card 02 on **card 01's GitHub issue**, in your own
      words — not a copy of card 02's text back at Peter
- [ ] Peter has replied to the readback. That reply, not the posting, is what closes this card.

## Don't
- Don't change anything. If something looks broken or contradicts what you read, say so in the
  readback or as a separate issue comment — don't "fix" it first. Per README: "when something cannot
  work the way it is built, say so on the issue before changing it."
- Don't skip straight to card 02's code because you're confident you understand it. The readback is
  the point of this card, not a formality.
- Don't pull in the July restyle of shared components (sidebar, tables) if you notice it sitting on
  the branch — it is explicitly not part of this PR.

## See also
`../README.md` (full working rules, voice), `../real-vs-mock.md` (the complete table + the fixed list),
`../contract.md` § 4 "Order of work".

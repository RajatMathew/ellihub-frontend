# Requisitions module — handoff to Cofount

Rajat, Yasim —

This is our monthly billing module. It is built, I have clicked through every screen, and it does what we need.
**Do not redesign it. Put the backend under it.**

## What it is, in one paragraph

We bill general contractors once a month. Every project has a Schedule of Values (SOV) — the GC's Excel.
Every month we fill in the % complete per line (the G702), send a **pencil** copy, get it back marked up,
send the **final** with the documents that GC requires (lien waivers, CPRs, MWBE, stored-material photos…),
get **approved**, get **paid**. Change orders we send the GC add to the contract once approved and roll into
the next requisition. The **Projects** tab is the front door — it tells us which projects we are billing
this month and what to do next on each one. That is the whole module.

## Run it

```bash
git checkout peter/requisitions-module
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Open <http://localhost:5174/app/requisitions>. The dev auth bypass is on in `.env` (`VITE_DEV_AUTH_BYPASS`) —
it exists only so the screens open without a backend; remove it when the real auth is wired.

## Read in this order

1. **`real-vs-mock.md`** — what is done, what is mock, what is yours. Five minutes. Read it first.
2. **`contract.md`** — every function in `src/modules/requisitions/data.ts` → your endpoint → your table → your hook.
   This is the spec. The math is in the prototype; port it, don't reinterpret it.
3. **`tasks/`** — one card per job, numbered in the order to do them. Each card is self-contained:
   paste it into Claude Code and go. Same cards are the GitHub issues.
4. **`.claude/rules/requisitions-module.md`** — the rules your Claude follows when it touches the module
   (path-scoped, same mechanism as your other rules). `src/modules/requisitions/AGENTS.md` is the same text for any other tool.

## How we work on this

- **Readback first.** Before you code a card, reply on its issue with your own 10-line plan. I answer the same day.
  This is where misunderstandings get caught — on day one, not week three.
- **One card at a time, in order.** Each card ends with a clickable increment on the demo URL, not a description.
- **Questions go on the issue**, not in email threads.
- **The UI is approved.** If something cannot work the way it is built, say so on the issue before changing it.
  Tab names, stage names, view order, colors and wording are fixed — the list is at the bottom of `real-vs-mock.md`.
- The July restyle of the shared components (sidebar, tables) is **not** in this PR. Don't pull it in.

Peter Ligas
ELLI NY Design Corp

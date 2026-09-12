# Notes for Claude

Read `SPEC.md` before making any change. It is the source of truth for the project's rules and names.

## What this is
The pre-launch website for Take The Chair ($CHAIR), a token planned for Robinhood Chain via the Pons launchpad. The site runs in simulation mode: no wallet connection, no contracts, no signing.

## Stack
- Next.js (App Router), React, TypeScript, plain CSS in `app/globals.css`.
- Fonts come from `@fontsource` packages (Old Standard TT, IBM Plex Sans Condensed). Don't switch to `next/font/google`.
- Deployed on Vercel from the public GitHub repo.

## Layout
- `app/page.tsx`: all page sections and copy.
- `components/Simulator.tsx`: the client-side simulator. All randomness happens inside effects or event handlers, never during render.
- `lib/sim.ts`: simulator numbers and made-up example prices.
- `lib/site.ts`: links and the status table.
- `scripts/generate-art.mjs`: generates the guilloche artwork in `public/art`.

## Also in this repo
- `contracts/`: Foundry project. `src/Press.sol`, `src/TakeoverDesk.sol`, tests in `test/`. Run `forge test`. Never weaken a test to make it pass; change the spec first if a rule changes.
- `tally/`: the Tally script (viem + OpenZeppelin merkle-tree). Pure maths in `src/shares.ts` with tests; chain code in `src/tally.ts`.

## Rules for changes
- Keep the banknote style: colour tokens in `:root`, Old Standard TT for text, the blue security strip, guilloche bands. No gradients, rounded cards or drop shadows.
- Sentence case everywhere. Plain, specific wording.
- The status table must stay honest. Never mark something done that isn't.
- Keep the risk notice and the "not affiliated with Robinhood or Pons" line in the footer.
- Before launch, the site must never ask a wallet to sign anything.
- Run `npm run build` and make sure it passes before finishing.

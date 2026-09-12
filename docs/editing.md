# Updating the site (for the team)

| To change | Edit |
| --- | --- |
| Contract addresses, X handle, GitHub link, status table | `lib/site.ts` |
| Page text | `app/page.tsx` |
| Simulator numbers | `lib/sim.ts` |
| Colours and layout | `app/globals.css` |

Edit on GitHub with the pencil icon and commit. Vercel redeploys in about two minutes.

**On launch day:** paste the token address into `contracts.token` in `lib/site.ts`. The "Launching on Pons" button becomes "Buy on Pons". After deploying the Press, paste `press` and `desk` too and the Live view goes live with wallet connection.

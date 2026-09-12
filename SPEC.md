# Take The Chair ($CHAIR) — Project Spec

**Status:** draft v0.3 · website built in simulation mode · no contracts deployed

This file is the source of truth for the project. Every chat with Claude and every Claude Code session should read it first. If a rule changes, change it here before changing any code.

---

## The pitch

**Take the Chair. Set the policy. Print for every holder.**

$CHAIR is a memecoin on Robinhood Chain, launched on Pons and paired with SPY. A slice of every trade fills the Press. The wallet sitting in the Chair decides which stock the Press buys next. When the Press is full, anyone can press BRRR: it buys the Chair's pick and prints it out to everyone holding $CHAIR. No staking, no deposits: just hold.

Want to set policy? Outbuy the Chair. Want the most printed stock? Hold longest. Flippers get almost nothing.

---

## Vocabulary

| Word on the site | What it actually is |
|---|---|
| The Press | The smart contract that receives $CHAIR's trading fees and buys stock |
| The Chair | The one wallet currently allowed to pick the stock |
| Pick | The stock token the Chair has chosen |
| Takeover | Taking the Chair by making a big enough buy through the site |
| Takeover price | How big a buy you need to take the Chair right now |
| Print / BRRR | The moment the Press spends its SPY on the Chair's pick |
| Earning window | The time between one print and the next |
| The Tally | The open-source script that works out every holder's share after each print |
| Stash | The printed stock a wallet has earned and can claim |
| Print log | The public record of every print |

---

## The loop

1. People trade $CHAIR on Pons. A slice of every trade arrives at the Press as SPY.
2. Anyone can take the Chair by buying $CHAIR through the site's **takeover box** with a buy at least as big as the takeover price.
3. The Chair picks a stock: one official Robinhood stock token.
4. When the Press reaches the print threshold, anyone can press **BRRR**.
5. The Press swaps its SPY into the Chair's pick, pays a small salary to the Chair and a tip to whoever pressed BRRR, and sets the rest aside for holders.
6. The **Tally** calculates every holder's share based on their average balance during the earning window, publishes the full results, and posts a summary on-chain.
7. After a short safety delay, holders claim their stash from the site whenever they like.

---

## Rules

Numbers marked TBD get tuned before launch. Every rule has a "why" so we never forget what it protects against.

### Fees and pairing
- **Fees to the Press:** the Pons creator fee, with the Press contract set as recipient. *Confirm on the Pons create form that the recipient can be a contract, and what fee options exist.*
- **Pairing:** SPY. *Needs Pons approval. Request early.*

### The Chair
- **Taking the Chair:** buy through the takeover box with a SPY amount at or above the takeover price. The $CHAIR goes straight to the buyer's wallet.
- **Takeover price:** starts at 110% of the sitting Chair's buy, then shrinks steadily to the minimum bar over 2 hours.
  *Why: a whale can't lock the seat forever. The longer a Chair sits, the cheaper the takeover.*
- **Minimum takeover:** TBD SPY.
  *Why: stops someone grabbing an empty Chair with dust.*
- **Keep the stake:** the Chair must keep holding at least the $CHAIR they bought to take the seat. If their wallet drops below that, anyone can call **remove Chair**, and BRRR also checks it automatically. Moving tokens to another wallet counts as dropping below.
  *Why: nobody can take the Chair and dump while still choosing the stock.*
- **Removed Chair:** the seat goes empty, the salary isn't paid, and the pick defaults to SPY until the next takeover.
- **Chair's salary:** 2% of each print, paid in the stock bought, only if the Chair still holds their stake at that moment.
- **Only takeover box buys count.** Buying directly on Pons does not take the Chair. The site must say this clearly.
  *Why: the Press contract can't see trades made directly on Pons.*
- **Empty Chair:** the pick defaults to SPY.
- **Same-moment takeovers:** if two buys land together, the first one to land wins. The second still goes through as a normal buy but doesn't take the Chair. Robinhood Chain orders transactions first-come-first-served, not by who pays more gas.

### Picks
- The Chair can change their pick at any time.
- **Only official Robinhood stock tokens are allowed,** fixed in the contract at deploy.
  *Why: otherwise a Chair could "pick" a token they created themselves and have the Press buy it from them.*
- **Only stocks with a working Chainlink price feed.** Robinhood says every stock token has one. Verify each ticker on our list.

### Prints (BRRR)
- **Threshold:** TBD SPY. Calibrate so a busy launch prints every 15–30 minutes.
- **Anyone can press BRRR** once the Press holds at least the threshold.
- **Caller tip:** 0.1% of the print.
  *Why: someone always has a reason to press the button.*
- **Price check:** the swap fails if the price is more than 1% worse than Chainlink's price.
  *Why: stops the Chair or a bot pumping a thin stock market right before the Press buys into it.*
- **Stale price:** if the price feed hasn't updated recently, BRRR fails and waits.

### Printing to holders
- **Who earns:** every wallet holding $CHAIR during the earning window. Nobody signs up.
- **How much:** each wallet's share is its *average* $CHAIR balance over the earning window, divided by the total of everyone's averages.
  *Why: buying seconds before BRRR and selling right after earns almost nothing. Holding the whole window earns the full share.*
- **Excluded addresses** never earn: the Pons bonding curve, the Pons locker, the Uniswap pool contract, the Press and takeover contracts, and burn addresses. The list is fixed and published.
  *Why: otherwise most of the stock would be "printed" to contracts that can never claim it.*
- **The Tally** runs after every print. It reads every $CHAIR transfer, calculates every share, publishes the full results file to the public GitHub repo, and posts one fingerprint (a Merkle root) to the Press contract.
- **Running totals:** each posted fingerprint covers the total each wallet has *ever* earned of each stock. Claiming pays the difference between that total and what the wallet already claimed. One claim collects everything owed, at any time. Unclaimed stock never expires.
- **Safety delay:** a newly posted fingerprint waits 6 hours before it becomes active. The previous one stays claimable during the wait.
  *Why: anyone can rerun the script and check the numbers match. If a new fingerprint looks wrong, every holder can still claim everything they were owed under the old one.*
- **Pending vs claimable:** the site shows a wallet's estimated earnings immediately after BRRR ("printing…"), then "claimable" once the fingerprint is active.

### The tally key (the one limited key)
- The Tally posts fingerprints from a dedicated wallet used for nothing else.
- **What the tally key can do:** post a new fingerprint (which waits the 6-hour delay), and hand its role to a new wallet.
- **What the tally key can never do:** touch the SPY in the Press, change any rule or number, choose the Chair or the pick, pause anything, or pay out more of any stock than the Press actually bought for holders. The contract enforces these limits.
- **If the Tally stops running:** printed stock stays safe in the Press contract and becomes claimable as soon as the Tally resumes.
- **Later:** move the tally key to a multisig so no single person controls it.

### Supply and control
- **Supply:** 1,000,000,000 $CHAIR, fixed by Pons. No minting.
- **No admin** apart from the limited tally key above: no owner, no pause button, no upgrades, no editable lists.
- **Say it plainly on the site:** "One limited key posts printing results. It can't touch funds or rules. Here's how to check its work."
- **Trade-off to understand:** if a bug is found after launch, it cannot be fixed. That is why testing and an outside review come before launch, not after.

---

## Security checklist

Before launch, tests must prove every one of these:

**Chair and picks**
- [ ] A Chair whose balance drops below their stake can be removed by anyone, and BRRR removes them automatically.
- [ ] Nobody can pick a token outside the official list.
- [ ] Two takeovers in the same block behave as described above.

**Prints**
- [ ] BRRR fails below threshold, with a stale price, or outside the price band.
- [ ] Every external token call is safe from reentrancy.
- [ ] Every unit of SPY and stock held by the Press is accounted for.

**Printing and claims**
- [ ] Nobody can claim more than their running total, or claim the same stock twice.
- [ ] Total claimed of each stock can never exceed what the Press bought for holders.
- [ ] A new fingerprint can't be claimed against until its 6-hour delay passes, and the old one works meanwhile.
- [ ] The tally key cannot move SPY or change anything except posting fingerprints and handing over its role.
- [ ] Excluded addresses never earn.
- [ ] The average-balance maths matches hand-calculated examples, including wallets that buy mid-window, sell mid-window, and transfer between wallets.
- [ ] Two independent runs of the Tally on the same print produce the identical fingerprint.

**Before launch**
- [ ] Full end-to-end run on testnet: trades, takeovers, BRRR, Tally, claims.
- [ ] Outside review completed, findings fixed, report linked on the site.

---

## Website

**Stack:** Next.js, hosted on Vercel, public GitHub repo.

**Sections:**
- **Live board:** current Chair (wallet, pick, time in seat, salary earned, stake status), takeover price with a live shrinking bar, Press progress toward the next BRRR, big BRRR button.
- **Takeover box:** the buy box that takes the Chair.
- **Your stash:** estimated earnings, claimable stock, one-click claim.
- **Print log:** every print, each linked to its transaction on the Robinhood Chain explorer, with the stock bought, amount, and a link to that decision's full results file.
- **Verify:** how to rerun the Tally yourself and check the fingerprint matches.
- **Rules:** every number above, linked to the contract line that enforces it once verified.
- **Status:** an honest table of what exists and what doesn't yet.
- **FAQ and risk notice.**

**Before launch:** a simulator mode with made-up numbers so people can play with the mechanic and build hype. Wallet connection is read-only. The site never asks anyone to sign anything before launch.

---

## Branding rules

- Footer says: not affiliated with Robinhood or Pons.
- No Robinhood logo. Banknote styling is original: no real currency designs, seals or portraits.
- All art and mascots are original.

---

## Open questions (answer before writing contract code)

**Pons**
1. Can the Pons creator fee recipient be a contract address? What fee percentages are available?
2. Has Pons approved SPY pairing for us?
3. Exact addresses to exclude: our token's bonding curve, the Pons locker (Bitquery lists PonsV2LaunchLocker as 0x267444d099b10fb5ed7c3cc7b7c767adca574952 — verify), and where tokens sit after graduation to Uniswap v4.

**Stocks and prices**
4. Where does the Press swap SPY into stock tokens (which exchange and pool), and is there enough liquidity for each stock on the list?
5. Is there an on-chain registry of official stock tokens, or do we hardcode the addresses?
6. Do Chainlink stock feeds go stale when US markets are closed? If so, BRRR pauses on weekends. Lean into it: "The Press is closed. Emergency print Monday."

**The Tally**
7. Which data provider do we use to read every $CHAIR transfer on Robinhood Chain, and what are its limits and costs?
8. Where does the press run (scheduled GitHub Action or a small server), and how is its key stored safely?
9. Do team wallets earn like everyone else (disclosed publicly) or get excluded?

**Legal and launch**
10. Robinhood stock tokens aren't available in the US and are restricted in other places. What does that mean for printing them to holders, and should the site restrict some regions?
11. UK rules on promoting a crypto token (FCA financial promotions): what's allowed on X?
12. Is there a Robinhood Chain testnet with stock tokens and price feeds to test against?
13. Who will review the contracts and the Tally before launch?

---

## Build order

- **Phase 0:** Spec (this file)
- **Phase 1:** Accounts: GitHub, Vercel, Claude Code, fresh deployer wallet, X handle, domain
- **Phase 2:** Website with simulator mode, deployed on Vercel (built, see README)
- **Phase 3:** Contracts (the Press, the takeover contract) and tests
- **Phase 4:** The Tally script and tests, full end-to-end run on testnet
- **Phase 5:** Outside review, fixes
- **Phase 6:** Launch on Pons

---

## Decisions log

- **2026-09-11:** First name: Fed Chair ($FED). Mechanic: king of the hill, where the Chair picks the stock that gets bought.
- **2026-09-11:** Rewards: hold to earn (no deposits). Shares use average balance over each earning window. Distribution via the Tally with running-total Merkle claims, a 6-hour safety delay, and a limited press key. Replaces the earlier opt-in reserves proposal.
- **2026-09-11:** Renamed to Take The Chair ($CHAIR), @TakeTheChair. The Fed contract is now the Press, the Printing Press script is now the Tally, rate decisions are prints. Banknote visual style.
- **2026-09-11:** Website built in simulation mode (Next.js, Vercel).
- **2026-09-12:** Site live at take-the-chair-56it.vercel.app. Added a Simulation/Live toggle; Live shows the empty launch-day state with no wallet connection.

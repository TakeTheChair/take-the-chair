# The Tally

The open-source script that works out every holder's share after each print and posts the result to the Press.

## What it does
1. Reads every `Print` event from the Press and every `$CHAIR` transfer since launch.
2. For each print, works out each wallet's time-weighted balance over the window since the previous print.
3. Splits that print's stock across holders in proportion, skipping excluded addresses (bonding curve, locker, pools, contracts, burn addresses).
4. Adds the shares onto running totals, builds a Merkle tree of `(holder, stock, cumulative)`, and writes the full results to `results/`.
5. With `--post`, sends the root to the Press. Claims open 5 minutes later.

## Check our work
Copy `config.example.json` to `config.json`, fill in the real addresses (published on the website), and run:

```
npm install
npm run tally
```

The root printed at the end must match the one on-chain. If it doesn't, tell everyone.

## Tests
`npm test` runs the maths against hand-worked examples: full-window holders, mid-window buys and sells, last-second buys, wallet-to-wallet transfers, and rounding.

## Running it for real
The wallet behind `TALLY_PRIVATE_KEY` should be used for nothing else and hold only enough ETH for gas. It cannot move any funds in the Press. Run `npm run post` after each print, or schedule it (a GitHub Action works) to run every few minutes and exit early when there's nothing new.

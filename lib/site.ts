// Edit this file to update links and status without touching page code.

export const site = {
  name: "Take The Chair",
  ticker: "$CHAIR",
  xHandle: "TakeTheChairSPY",
  // Paste your GitHub repo link here once it exists, e.g. "https://github.com/you/take-the-chair"
  githubUrl: "https://github.com/TakeTheChair/take-the-chair",
  explorerUrl: "https://robinhoodchain.blockscout.com",
  // Paste the real addresses here after deployment. Leave empty until then and the site says "not deployed".
  contracts: {
    token: "",
    press: "",
    desk: "",
  },
  // The Tally publishes results here after each print; the site reads claim proofs from it.
  tallyResultsUrl: "https://raw.githubusercontent.com/TakeTheChair/take-the-chair/main/tally/results/latest.json",
  ponsUrl: "https://ponsfamily.com",
  stockTokenDocs: "https://docs.robinhood.com/chain/stock-tokens/",
};

export type StatusState = "done" | "in-progress" | "not-started";

export const status: { item: string; detail: string; state: StatusState }[] = [
  { item: "Website", detail: "Live, with the simulator, the live view and wallet connection.", state: "done" },
  { item: "Press contract", detail: "Complete. Fee claiming from Pons, Chainlink price checks, BRRR and holder claims. 23 tests passing.", state: "done" },
  { item: "The Tally", detail: "Complete. Works out every holder's share after each print and publishes the results on GitHub.", state: "done" },
  { item: "Pons SPY pairing", detail: "SPY is an approved pair token on Pons.", state: "done" },
  { item: "Source code", detail: "Public on GitHub.", state: "done" },
  { item: "Launch", detail: "12 September 2026 on Pons. The contract address is posted on X first, then here.", state: "in-progress" },
];

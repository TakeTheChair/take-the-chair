// Edit this file to update links and status without touching page code.

export const site = {
  name: "Take The Chair",
  ticker: "$CHAIR",
  xHandle: "TakeTheChair",
  // Paste your GitHub repo link here once it exists, e.g. "https://github.com/you/take-the-chair"
  githubUrl: "https://github.com/TakeTheChair/take-the-chair",
  explorerUrl: "https://robinhoodchain.blockscout.com",
  stockTokenDocs: "https://docs.robinhood.com/chain/stock-tokens/",
};

export type StatusState = "done" | "in-progress" | "not-started";

export const status: { item: string; detail: string; state: StatusState }[] = [
  { item: "Website", detail: "This site, with the simulator and the live view.", state: "done" },
  { item: "Press contract", detail: "Written, with 23 passing tests. Not deployed. Venue adapters for Robinhood Chain still to build.", state: "in-progress" },
  { item: "The Tally", detail: "Written and tested. Runs once the Press is deployed.", state: "in-progress" },
  { item: "Pons SPY pairing", detail: "Needs approval from Pons.", state: "not-started" },
  { item: "Token", detail: "Not launched. The contract address will appear here first.", state: "not-started" },
  { item: "Launch date", detail: "12 September 2026. The token launches on Pons; the Press goes live once deployed and verified.", state: "in-progress" },
];

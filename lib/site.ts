// Edit this file to update links and status without touching page code.

export const site = {
  name: "Take The Chair",
  ticker: "$CHAIR",
  xHandle: "TakeTheChair",
  // Paste your GitHub repo link here once it exists, e.g. "https://github.com/you/take-the-chair"
  githubUrl: "",
  explorerUrl: "https://robinhoodchain.blockscout.com",
  stockTokenDocs: "https://docs.robinhood.com/chain/stock-tokens/",
};

export type StatusState = "done" | "in-progress" | "not-started";

export const status: { item: string; detail: string; state: StatusState }[] = [
  { item: "Website", detail: "This site, running in simulation mode.", state: "done" },
  { item: "Token", detail: "Not launched. The contract address will appear here first.", state: "not-started" },
  { item: "Press contract", detail: "Rules written in the project spec. No code yet.", state: "in-progress" },
  { item: "The Tally", detail: "The script that works out every holder's share. Rules written, no code yet.", state: "in-progress" },
  { item: "Pons SPY pairing", detail: "Needs approval from Pons. Not requested yet.", state: "not-started" },
  { item: "Outside review", detail: "None yet. The reviewer and their report will be linked here.", state: "not-started" },
  { item: "Launch date", detail: "Announced on X once the contracts are built, tested and reviewed.", state: "not-started" },
];

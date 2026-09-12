// Simulator settings. Every number here is made up for the demo.

export type Stock = { ticker: string; name: string; priceInSpy: number };

// Illustrative prices measured in SPY, not live data.
export const STOCKS: Stock[] = [
  { ticker: "NVDA", name: "Nvidia", priceInSpy: 0.28 },
  { ticker: "TSLA", name: "Tesla", priceInSpy: 0.52 },
  { ticker: "PLTR", name: "Palantir", priceInSpy: 0.25 },
  { ticker: "AAPL", name: "Apple", priceInSpy: 0.35 },
  { ticker: "MSFT", name: "Microsoft", priceInSpy: 0.78 },
  { ticker: "GOOGL", name: "Alphabet", priceInSpy: 0.31 },
  { ticker: "AMZN", name: "Amazon", priceInSpy: 0.34 },
  { ticker: "SPY", name: "S&P 500 ETF", priceInSpy: 1 },
];

export const SIM = {
  printThreshold: 5, // SPY needed in the Press before BRRR
  minGapSeconds: 5 * 60, // BRRR also needs 5 minutes since the last print
  takeoverPremium: 1.1, // takeover price starts at 110% of the sitting Chair's buy
  decaySeconds: 2 * 60 * 60, // takeover price falls to the minimum over 2 hours
  minTakeover: 0.5, // SPY
  feeToPress: 0.02, // share of each trade that lands in the Press
  chairSalary: 0.02,
  brrrTip: 0.001,
  totalSupply: 1_000_000_000,
  eligibleSupply: 700_000_000, // example: supply outside the bonding curve, locker and pools
  pressInflowPerSecond: 5 / 1800, // average SPY per simulated second
  takeoverChancePerSecond: 1 / 4500,
  botPressDelaySeconds: 420, // a bot presses BRRR if nobody else does
  startClock: 9.5 * 3600, // 09:30
};

export function stock(ticker: string): Stock {
  return STOCKS.find((s) => s.ticker === ticker) ?? STOCKS[STOCKS.length - 1];
}

export function takeoverPrice(stakeSpy: number | null, seatedFor: number): number {
  if (stakeSpy === null) return SIM.minTakeover;
  const start = stakeSpy * SIM.takeoverPremium;
  const frac = Math.min(1, Math.max(0, seatedFor / SIM.decaySeconds));
  return Math.max(SIM.minTakeover, start - (start - SIM.minTakeover) * frac);
}

export function clock(seconds: number): string {
  const s = ((Math.floor(seconds) % 86400) + 86400) % 86400;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function randomWallet(): string {
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  const part = (n: number) => Array.from({ length: n }, hex).join("");
  return `0x${part(4)}…${part(4)}`;
}

export function fmt(n: number, dp = 2): string {
  const [whole, frac] = Math.abs(n).toFixed(dp).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (n < 0 ? "-" : "") + grouped + (frac ? "." + frac : "");
}

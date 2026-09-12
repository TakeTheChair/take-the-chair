// Pure maths for the Tally. No network code here, so it can be tested and re-run by anyone.

export type Transfer = { from: string; to: string; value: bigint; time: number; index: number };

const ZERO = "0x0000000000000000000000000000000000000000";

/** Replays transfers up to and including `time` to get every wallet's balance at that moment. */
export function balancesAt(transfers: Transfer[], time: number): Map<string, bigint> {
  const bal = new Map<string, bigint>();
  for (const t of transfers) {
    if (t.time > time) break;
    apply(bal, t);
  }
  return bal;
}

function apply(bal: Map<string, bigint>, t: Transfer) {
  const from = t.from.toLowerCase();
  const to = t.to.toLowerCase();
  if (from !== ZERO) bal.set(from, (bal.get(from) ?? 0n) - t.value);
  if (to !== ZERO) bal.set(to, (bal.get(to) ?? 0n) + t.value);
}

/**
 * Time-weighted average balance of every wallet over (start, end].
 * `opening` is the balance map at `start`. Transfers must be sorted by (time, index).
 * Returns balance-seconds, not averages; dividing by the window length is unnecessary for shares.
 */
export function weightedBalances(
  opening: Map<string, bigint>,
  transfers: Transfer[],
  start: number,
  end: number
): Map<string, bigint> {
  const bal = new Map(opening);
  const weight = new Map<string, bigint>();
  let cursor = start;
  const accrue = (until: number) => {
    const dt = BigInt(until - cursor);
    if (dt <= 0n) return;
    for (const [who, b] of bal) if (b > 0n) weight.set(who, (weight.get(who) ?? 0n) + b * dt);
    cursor = until;
  };
  for (const t of transfers) {
    if (t.time <= start) continue;
    if (t.time > end) break;
    accrue(t.time);
    apply(bal, t);
  }
  accrue(end);
  return weight;
}

/**
 * Splits `pool` across wallets in proportion to their weight, skipping excluded addresses.
 * Uses floor division so the total handed out never exceeds the pool. Dust stays in the contract.
 */
export function splitPool(
  weights: Map<string, bigint>,
  pool: bigint,
  excluded: Set<string>
): Map<string, bigint> {
  let total = 0n;
  for (const [who, w] of weights) if (!excluded.has(who.toLowerCase()) && w > 0n) total += w;
  const out = new Map<string, bigint>();
  if (total === 0n) return out;
  for (const [who, w] of weights) {
    if (excluded.has(who.toLowerCase()) || w <= 0n) continue;
    const share = (pool * w) / total;
    if (share > 0n) out.set(who.toLowerCase(), share);
  }
  return out;
}

/** Adds one print's shares onto the running totals: holder => stock => cumulative. */
export function addToTotals(
  totals: Map<string, Map<string, bigint>>,
  stock: string,
  shares: Map<string, bigint>
) {
  const s = stock.toLowerCase();
  for (const [who, amt] of shares) {
    const row = totals.get(who) ?? new Map<string, bigint>();
    row.set(s, (row.get(s) ?? 0n) + amt);
    totals.set(who, row);
  }
}

/** Flattens totals into sorted leaves so two runs always produce the same tree. */
export function toLeaves(totals: Map<string, Map<string, bigint>>): [string, string, bigint][] {
  const leaves: [string, string, bigint][] = [];
  for (const [who, row] of totals) for (const [stock, amt] of row) if (amt > 0n) leaves.push([who, stock, amt]);
  leaves.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));
  return leaves;
}

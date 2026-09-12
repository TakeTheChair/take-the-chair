import { test } from "node:test";
import assert from "node:assert/strict";
import { balancesAt, weightedBalances, splitPool, addToTotals, toLeaves, type Transfer } from "./shares.js";

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const C = "0xcccccccccccccccccccccccccccccccccccccccc";
const CURVE = "0x1111111111111111111111111111111111111111";
const ZERO = "0x0000000000000000000000000000000000000000";

const mint: Transfer = { from: ZERO, to: CURVE, value: 1000n, time: 0, index: 0 };

test("holding the whole window earns the full share", () => {
  const tx: Transfer[] = [mint, { from: CURVE, to: A, value: 100n, time: 0, index: 1 }];
  const w = weightedBalances(balancesAt(tx, 0), tx, 0, 600);
  assert.equal(w.get(A), 100n * 600n);
});

test("buying halfway earns half, selling halfway earns half", () => {
  const tx: Transfer[] = [
    mint,
    { from: CURVE, to: A, value: 100n, time: 0, index: 1 },
    { from: CURVE, to: B, value: 100n, time: 300, index: 2 },
    { from: A, to: CURVE, value: 100n, time: 300, index: 3 },
  ];
  const w = weightedBalances(balancesAt(tx, 0), tx, 0, 600);
  assert.equal(w.get(A), 100n * 300n);
  assert.equal(w.get(B), 100n * 300n);
});

test("buying one second before the print earns almost nothing", () => {
  const tx: Transfer[] = [
    mint,
    { from: CURVE, to: A, value: 100n, time: 0, index: 1 },
    { from: CURVE, to: B, value: 100_000n, time: 599, index: 2 },
  ];
  const w = weightedBalances(balancesAt(tx, 0), tx, 0, 600);
  const shares = splitPool(w, 1_000_000n, new Set([CURVE]));
  assert.equal(shares.get(A), (1_000_000n * 60_000n) / 160_000n);
  assert.equal(shares.get(B), (1_000_000n * 100_000n) / 160_000n);
});

test("transfers between wallets move the earning, and the curve never earns", () => {
  const tx: Transfer[] = [
    mint,
    { from: CURVE, to: A, value: 100n, time: 0, index: 1 },
    { from: A, to: C, value: 100n, time: 200, index: 2 },
  ];
  const w = weightedBalances(balancesAt(tx, 0), tx, 0, 600);
  const shares = splitPool(w, 600n, new Set([CURVE]));
  assert.equal(shares.get(A), 200n);
  assert.equal(shares.get(C), 400n);
  assert.equal(shares.get(CURVE), undefined);
});

test("running totals accumulate and leaves are deterministic", () => {
  const totals = new Map();
  addToTotals(totals, "0xSPY", new Map([[A, 5n], [B, 7n]]));
  addToTotals(totals, "0xSPY", new Map([[A, 5n]]));
  addToTotals(totals, "0xNVDA", new Map([[B, 1n]]));
  const leaves = toLeaves(totals);

  assert.deepEqual(
    leaves.map((l) => l.join(":")),
    [`${A}:0xspy:10`, `${B}:0xnvda:1`, `${B}:0xspy:7`]
  );
});

test("floor division never hands out more than the pool", () => {
  const w = new Map([[A, 1n], [B, 1n], [C, 1n]]);
  const shares = splitPool(w, 100n, new Set());
  let sum = 0n;
  for (const v of shares.values()) sum += v;
  assert.ok(sum <= 100n);
  assert.equal(sum, 99n);
});

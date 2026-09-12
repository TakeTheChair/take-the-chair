// The Tally: after each print, work out every holder's share, publish the results, post the root.
//
// Usage:
//   npm run tally          reads the chain, writes results/latest.json and results/print-N.json
//   npm run post           same, then posts the root from TALLY_PRIVATE_KEY
//
// Anyone can run `npm run tally` with the same config and get the same root. That's the point.

import { createPublicClient, createWalletClient, http, parseAbiItem, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { balancesAt, weightedBalances, splitPool, addToTotals, toLeaves, type Transfer } from "./shares.js";

type Config = {
  rpcUrl: string;
  chainId: number;
  chairToken: Address;
  press: Address;
  launchBlock: number;
  excluded: Address[]; // bonding curve, locker, pools, Press, desk, burn addresses
};

const cfg: Config = JSON.parse(readFileSync(new URL("../config.json", import.meta.url), "utf8"));
const shouldPost = process.argv.includes("--post");

const chain = {
  id: cfg.chainId,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [cfg.rpcUrl] } },
} as const;

const client = createPublicClient({ chain, transport: http(cfg.rpcUrl) });

const transferEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const printEvent = parseAbiItem(
  "event Print(uint256 indexed n, address indexed stock, uint256 spyIn, uint256 stockOut, uint256 toHolders, address chair, address presser)"
);
const pressAbi = [
  { type: "function", name: "postRoot", inputs: [{ name: "root", type: "bytes32" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "LAUNCH_TIME", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

const timeCache = new Map<bigint, number>();
async function blockTime(n: bigint): Promise<number> {
  const hit = timeCache.get(n);
  if (hit !== undefined) return hit;
  const b = await client.getBlock({ blockNumber: n });
  const t = Number(b.timestamp);
  timeCache.set(n, t);
  return t;
}

async function getLogsChunked<T>(fetch: (from: bigint, to: bigint) => Promise<T[]>, from: bigint, to: bigint) {
  const out: T[] = [];
  const step = 5_000n;
  for (let a = from; a <= to; a += step) {
    const b = a + step - 1n > to ? to : a + step - 1n;
    out.push(...(await fetch(a, b)));
  }
  return out;
}

async function main() {
  const latest = await client.getBlockNumber();
  const from = BigInt(cfg.launchBlock);
  console.log(`Reading blocks ${from} to ${latest}`);

  const prints = await getLogsChunked(
    (a, b) => client.getLogs({ address: cfg.press, event: printEvent, fromBlock: a, toBlock: b }),
    from,
    latest
  );
  if (prints.length === 0) {
    console.log("No prints yet. Nothing to tally.");
    return;
  }

  const rawTransfers = await getLogsChunked(
    (a, b) => client.getLogs({ address: cfg.chairToken, event: transferEvent, fromBlock: a, toBlock: b }),
    from,
    latest
  );
  const transfers: Transfer[] = [];
  for (const l of rawTransfers) {
    transfers.push({
      from: l.args.from!,
      to: l.args.to!,
      value: l.args.value!,
      time: await blockTime(l.blockNumber),
      index: Number(l.blockNumber) * 1_000_000 + l.logIndex,
    });
  }
  transfers.sort((x, y) => x.time - y.time || x.index - y.index);

  const launchTime = Number(await client.readContract({ address: cfg.press, abi: pressAbi, functionName: "LAUNCH_TIME" }));
  const excluded = new Set(cfg.excluded.map((a) => a.toLowerCase()));
  const totals = new Map<string, Map<string, bigint>>();
  let windowStart = launchTime;
  const printSummaries: object[] = [];

  for (const p of prints) {
    const end = await blockTime(p.blockNumber);
    const opening = balancesAt(transfers, windowStart);
    const weights = weightedBalances(opening, transfers, windowStart, end);
    const shares = splitPool(weights, p.args.toHolders!, excluded);
    addToTotals(totals, p.args.stock!, shares);
    printSummaries.push({
      n: Number(p.args.n),
      block: Number(p.blockNumber),
      tx: p.transactionHash,
      stock: p.args.stock,
      toHolders: p.args.toHolders!.toString(),
      windowStart,
      windowEnd: end,
      holders: shares.size,
    });
    windowStart = end;
  }

  const leaves = toLeaves(totals);
  const tree = StandardMerkleTree.of(
    leaves.map(([who, stock, amt]) => [who, stock, amt.toString()]),
    ["address", "address", "uint256"]
  );

  const result = {
    generatedAt: new Date().toISOString(),
    press: cfg.press,
    chairToken: cfg.chairToken,
    throughBlock: Number(latest),
    prints: printSummaries,
    root: tree.root,
    leaves: leaves.map(([who, stock, amt]) => ({ holder: who, stock, cumulative: amt.toString() })),
    tree: tree.dump(),
  };
  const n = prints.length;
  writeFileSync(new URL(`../results/print-${n}.json`, import.meta.url), JSON.stringify(result, null, 2));
  writeFileSync(new URL("../results/latest.json", import.meta.url), JSON.stringify(result, null, 2));
  console.log(`Print ${n}: ${leaves.length} leaves, root ${tree.root}`);

  if (!shouldPost) return;
  const key = process.env.TALLY_PRIVATE_KEY;
  if (!key) throw new Error("TALLY_PRIVATE_KEY is not set");
  const account = privateKeyToAccount(key as `0x${string}`);
  const wallet = createWalletClient({ account, chain, transport: http(cfg.rpcUrl) });
  const hash = await wallet.writeContract({ address: cfg.press, abi: pressAbi, functionName: "postRoot", args: [tree.root as `0x${string}`] });
  console.log(`Posted root in ${hash}. Claims open in 5 minutes.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

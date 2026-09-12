// Gets the claim proof for one wallet from results/latest.json. The website does the same thing.
// Usage: npx tsx src/proof.ts 0xYourWallet
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { readFileSync } from "node:fs";

const who = (process.argv[2] ?? "").toLowerCase();
const data = JSON.parse(readFileSync(new URL("../results/latest.json", import.meta.url), "utf8"));
const tree = StandardMerkleTree.load(data.tree);
for (const [i, v] of tree.entries()) {
  if (v[0].toLowerCase() === who) console.log({ stock: v[1], cumulative: v[2], proof: tree.getProof(i) });
}

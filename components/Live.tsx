"use client";
// The live banknote: reads the Press on Robinhood Chain and lets a connected wallet take the Chair,
// press BRRR and claim. Before the contracts are deployed it shows the empty state.
import { useCallback, useEffect, useState } from "react";
import { formatUnits, parseUnits, type Address } from "viem";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { site } from "@/lib/site";
import { deskAbi, erc20Abi, pressAbi, tickerOf, tokens } from "@/lib/chain";
import { ConnectButton, publicClient, short, useWallet } from "./Wallet";

const ZERO = "0x0000000000000000000000000000000000000000";
const fmt = (v: bigint, d = 2) => Number(formatUnits(v, 18)).toLocaleString(undefined, { maximumFractionDigits: d });

type PressState = {
  chair: Address;
  pick: Address;
  takeover: bigint;
  balance: bigint;
  threshold: bigint;
  minTakeover: bigint;
  canPrint: boolean;
  holds: boolean;
  printCount: bigint;
  stocks: Address[];
  forHolders: Record<string, bigint>;
};

export default function Live({ modeSwitch }: { modeSwitch: React.ReactNode }) {
  const press = site.contracts.press as Address | "";
  const desk = site.contracts.desk as Address | "";
  const w = useWallet();
  const [s, setS] = useState<PressState>();
  const [spyIn, setSpyIn] = useState("");
  const [pick, setPick] = useState("NVDA");
  const [busy, setBusy] = useState<string>();
  const [msg, setMsg] = useState<string>();
  const [mine, setMine] = useState<{ stock: Address; owed: bigint; cumulative: bigint; proof: `0x${string}`[] }[]>([]);

  const load = useCallback(async () => {
    if (!press) return;
    const c = { address: press, abi: pressAbi } as const;
    const [chair, pk, takeover, balance, threshold, minTakeover, canPrint, holds, printCount, stocks] = await Promise.all([
      publicClient.readContract({ ...c, functionName: "chair" }),
      publicClient.readContract({ ...c, functionName: "pick" }),
      publicClient.readContract({ ...c, functionName: "takeoverPrice" }),
      publicClient.readContract({ ...c, functionName: "pressBalance" }),
      publicClient.readContract({ ...c, functionName: "PRINT_THRESHOLD" }),
      publicClient.readContract({ ...c, functionName: "MIN_TAKEOVER" }),
      publicClient.readContract({ ...c, functionName: "canPrint" }),
      publicClient.readContract({ ...c, functionName: "chairHoldsStake" }),
      publicClient.readContract({ ...c, functionName: "printCount" }),
      publicClient.readContract({ ...c, functionName: "stocks" }),
    ]);
    const fh: Record<string, bigint> = {};
    for (const st of stocks) fh[st] = await publicClient.readContract({ ...c, functionName: "forHolders", args: [st] });
    setS({ chair, pick: pk, takeover, balance, threshold, minTakeover, canPrint, holds, printCount, stocks: [...stocks], forHolders: fh });
  }, [press]);

  useEffect(() => {
    load().catch(() => {});
    const t = setInterval(() => load().catch(() => {}), 15000);
    return () => clearInterval(t);
  }, [load]);

  // Your claimable stash: results file from the Tally, minus what you already claimed.
  useEffect(() => {
    if (!press || !w.address || !site.tallyResultsUrl) return;
    const who = w.address.toLowerCase();
    (async () => {
      try {
        const r = await fetch(site.tallyResultsUrl, { cache: "no-store" }).then((x) => x.json());
        const tree = StandardMerkleTree.load(r.tree);
        const out: typeof mine = [];
        for (const [i, v] of tree.entries()) {
          if (String(v[0]).toLowerCase() !== who) continue;
          const stock = v[1] as Address;
          const cumulative = BigInt(v[2] as string);
          const claimed = await publicClient.readContract({ address: press, abi: pressAbi, functionName: "claimed", args: [w.address!, stock] });
          out.push({ stock, cumulative, owed: cumulative - claimed, proof: tree.getProof(i) as `0x${string}`[] });
        }
        setMine(out);
      } catch {
        setMine([]);
      }
    })();
  }, [press, w.address, s?.printCount]);

  async function run(label: string, fn: () => Promise<`0x${string}`>) {
    setBusy(label);
    setMsg(undefined);
    try {
      if (!(await w.ensureChain())) throw new Error("Switch your wallet to Robinhood Chain.");
      const hash = await fn();
      setMsg("Sent. Waiting for confirmation…");
      await publicClient.waitForTransactionReceipt({ hash });
      setMsg("Confirmed.");
      await load();
    } catch (e: unknown) {
      setMsg((e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? "Failed.");
    } finally {
      setBusy(undefined);
    }
  }

  const takeover = () =>
    run("takeover", async () => {
      const wc = w.walletClient!;
      const amount = parseUnits(spyIn || "0", 18);
      const allowance = await publicClient.readContract({ address: tokens.SPY.address, abi: erc20Abi, functionName: "allowance", args: [w.address!, desk as Address] });
      if (allowance < amount) {
        const h = await wc.writeContract({ address: tokens.SPY.address, abi: erc20Abi, functionName: "approve", args: [desk as Address, amount], chain: undefined, account: w.address! });
        await publicClient.waitForTransactionReceipt({ hash: h });
      }
      return wc.writeContract({ address: desk as Address, abi: deskAbi, functionName: "takeover", args: [amount, 0n, tokens[pick].address], chain: undefined, account: w.address! });
    });

  const brrr = () => run("brrr", () => w.walletClient!.writeContract({ address: press as Address, abi: pressAbi, functionName: "brrr", chain: undefined, account: w.address! }));

  const claim = (m: (typeof mine)[number]) =>
    run("claim", () => w.walletClient!.writeContract({ address: press as Address, abi: pressAbi, functionName: "claim", args: [m.stock, m.cumulative, m.proof], chain: undefined, account: w.address! }));

  const live = Boolean(press && desk);
  const pickTicker = s ? tickerOf(s.pick) : "SPY";
  const pickName = tokens[pickTicker]?.name ?? "";
  const fill = s && s.threshold > 0n ? Math.min(100, Number((s.balance * 100n) / s.threshold)) : 0;

  return (
    <section className="note" aria-label="Live">
      <span className="serial serial-tl" aria-hidden="true">No. {String(Number(s?.printCount ?? 0n)).padStart(6, "0")}</span>
      <span className="serial serial-br" aria-hidden="true">Series 2026</span>
      <div className="note-head">
        <p className="note-disclaimer">
          {live ? "Live from Robinhood Chain. Refreshes every 15 seconds." : "Live view. Fills in the moment the Press is deployed."}
        </p>
        {modeSwitch}
      </div>

      <div className="note-top">
        <figure className="portrait">
          <img src="/art/portrait.svg" alt="" width={340} height={420} />
          <figcaption>
            <span className="portrait-role">The Chair</span>
            <span className="portrait-who">{s && s.chair !== ZERO ? (s.chair.toLowerCase() === w.address?.toLowerCase() ? "You" : short(s.chair)) : "Empty seat"}</span>
          </figcaption>
        </figure>

        <div className="board">
          <div className="board-pick">
            <p className="board-label">{s && s.chair !== ZERO ? "Their pick" : "Default pick"}</p>
            <p className="pick-ticker">{pickTicker}</p>
            <p className="pick-name">{pickName}{s && s.chair !== ZERO && !s.holds ? " · Chair sold their stake, anyone can remove them" : ""}</p>
          </div>

          <div className="meter">
            <div className="meter-head">
              <p className="board-label">Takeover price</p>
              <p className="num">{s ? `${fmt(s.takeover, 4)} SPY` : "—"}</p>
            </div>
            <div className="bar" aria-hidden="true">
              <span className="bar-fill bar-fill-blue" style={{ width: s && s.takeover > 0n ? `${Math.min(100, Number((s.minTakeover * 100n) / s.takeover))}%` : "0%" }} />
            </div>
            <p className="meter-note">{s ? `Never below ${fmt(s.minTakeover, 4)} SPY.` : "Set at deployment, shown here in SPY."}</p>
          </div>

          <div className="meter">
            <div className="meter-head">
              <p className="board-label">The Press</p>
              <p className="num">{s ? `${fmt(s.balance, 4)} / ${fmt(s.threshold, 2)} SPY` : "0.00 SPY"}</p>
            </div>
            <div className="bar" aria-hidden="true">
              <span className="bar-fill" style={{ width: `${fill}%` }} />
            </div>
            <p className="meter-note">{s ? (s.canPrint ? "Full. Anyone can press." : "Fills with every trade.") : "Fills once trading starts on Pons."}</p>
          </div>

          <button className={`brrr ${s?.canPrint ? "brrr-ready" : ""}`} disabled={!s?.canPrint || !w.address || busy === "brrr"} onClick={brrr}>
            {busy === "brrr" ? "Printing…" : "BRRR"}
          </button>
        </div>
      </div>

      <div className="note-lower">
        <div className="panel">
          <h3>Take the Chair</h3>
          <p className="panel-note">Spend more SPY than the takeover price and pick a stock. Keep what you buy or anyone can remove you.</p>
          <div className="field-row">
            <label className="field">
              <span>SPY to spend</span>
              <input inputMode="decimal" value={spyIn} onChange={(e) => setSpyIn(e.target.value)} placeholder={s ? fmt(s.takeover, 4) : "0"} disabled={!live} />
            </label>
            <label className="field">
              <span>Your pick</span>
              <select value={pick} onChange={(e) => setPick(e.target.value)} disabled={!live}>
                {Object.keys(tokens).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="button-row">
            {w.address ? (
              <button className="btn" disabled={!live || busy === "takeover" || !spyIn} onClick={takeover}>
                {busy === "takeover" ? "Working…" : "Take the Chair"}
              </button>
            ) : (
              <ConnectButton />
            )}
            <span className="panel-note">{msg ?? w.error ?? (live ? "Two signatures: approve SPY, then take over." : "Opens the moment the Press is deployed.")}</span>
          </div>
        </div>

        <div className="panel">
          <h3>Your stash</h3>
          <p className="panel-note">{w.address ? "Stock set aside for you by past prints." : "Connect a wallet to see what you've earned."}</p>
          <ul className="stash">
            {s && s.stocks.length > 0 && !w.address && (
              <li><span className="stash-t">Set aside for all holders</span><span className="num">{s.stocks.map((st) => `${fmt(s.forHolders[st], 4)} ${tickerOf(st)}`).join(" · ")}</span></li>
            )}
            {w.address && mine.length === 0 && <li><span className="stash-t">Nothing yet</span><span className="num">0</span></li>}
            {mine.map((m) => (
              <li key={m.stock}>
                <span className="stash-t">{tickerOf(m.stock)}</span>
                <span className="num">{fmt(m.owed, 6)}</span>
                <button className="btn btn-quiet" disabled={m.owed === 0n || busy === "claim"} onClick={() => claim(m)}>
                  Claim
                </button>
              </li>
            ))}
          </ul>
          {!w.address && <div className="button-row"><ConnectButton className="btn btn-quiet" /></div>}
        </div>
      </div>
    </section>
  );
}

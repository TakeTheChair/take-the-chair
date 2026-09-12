"use client";

import { useEffect, useRef, useState } from "react";
import { SIM, STOCKS, clock, fmt, randomWallet, stock, takeoverPrice } from "@/lib/sim";

type Chair = { who: string; pick: string; stake: number; since: number };
type Print = {
  id: number;
  at: number;
  chair: string;
  pick: string;
  amount: number;
  perMillion: number;
  caller: string;
};
type State = {
  t: number;
  chair: Chair | null;
  press: number;
  fullSince: number | null;
  bag: number;
  stash: Record<string, number>;
  log: Print[];
  nextId: number;
  notice: string;
};

const YOU = "you";

function initialState(): State {
  return {
    t: SIM.startClock,
    chair: { who: "0x7a3f…91c2", pick: "NVDA", stake: 3.2, since: SIM.startClock - 1500 },
    press: 3.6,
    fullSince: null,
    bag: 10_000_000,
    stash: {},
    log: [],
    nextId: 1,
    notice: "",
  };
}

function label(who: string) {
  return who === YOU ? "You" : who;
}

function doPrint(s: State, caller: string): State {
  const bought = stock(s.chair ? s.chair.pick : "SPY");
  const total = SIM.printThreshold / bought.priceInSpy;
  const salary = s.chair ? total * SIM.chairSalary : 0;
  const tip = total * SIM.brrrTip;
  const forHolders = total - salary - tip;
  const yours =
    forHolders * (s.bag / SIM.eligibleSupply) +
    (s.chair?.who === YOU ? salary : 0) +
    (caller === YOU ? tip : 0);

  const entry: Print = {
    id: s.nextId,
    at: s.t,
    chair: s.chair ? label(s.chair.who) : "Empty seat",
    pick: bought.ticker,
    amount: total,
    perMillion: (forHolders / SIM.eligibleSupply) * 1_000_000,
    caller: label(caller),
  };

  return {
    ...s,
    press: s.press - SIM.printThreshold,
    fullSince: null,
    stash: { ...s.stash, [bought.ticker]: (s.stash[bought.ticker] ?? 0) + yours },
    log: [entry, ...s.log].slice(0, 8),
    nextId: s.nextId + 1,
    notice:
      caller === YOU
        ? `You pressed BRRR. The Press bought ${fmt(total, 3)} ${bought.ticker} and you earned the tip.`
        : `${caller} pressed BRRR. The Press bought ${fmt(total, 3)} ${bought.ticker}.`,
  };
}

function step(s: State, dt: number): State {
  let next: State = { ...s, t: s.t + dt };
  next.press += SIM.pressInflowPerSecond * dt * (0.3 + Math.random() * 1.4);

  const seatedFor = next.chair ? next.t - next.chair.since : 0;
  const urgency = next.chair ? 0.5 + 1.5 * Math.min(1, seatedFor / SIM.decaySeconds) : 3;
  if (Math.random() < SIM.takeoverChancePerSecond * dt * urgency) {
    const price = takeoverPrice(next.chair ? next.chair.stake : null, seatedFor);
    const amount = Math.ceil(price * (1.02 + Math.random() * 0.5) * 100) / 100;
    const who = randomWallet();
    const pick = STOCKS[Math.floor(Math.random() * STOCKS.length)].ticker;
    next.notice =
      next.chair?.who === YOU
        ? `${who} took the Chair from you with ${fmt(amount)} SPY and picked ${pick}.`
        : `${who} took the Chair with ${fmt(amount)} SPY and picked ${pick}.`;
    next.chair = { who, pick, stake: amount, since: next.t };
    next.press += amount * SIM.feeToPress;
  }

  if (next.press >= SIM.printThreshold) {
    if (next.fullSince === null) next.fullSince = next.t;
    else if (next.t - next.fullSince > SIM.botPressDelaySeconds) next = doPrint(next, randomWallet());
  } else {
    next.fullSince = null;
  }
  return next;
}

export default function Simulator() {
  const [s, setS] = useState<State>(initialState);
  const ref = useRef(s);
  const [speed, setSpeed] = useState(60);
  const [amount, setAmount] = useState("");
  const [pick, setPick] = useState("TSLA");

  const commit = (next: State) => {
    ref.current = next;
    setS(next);
  };

  useEffect(() => {
    const id = setInterval(() => commit(step(ref.current, 0.2 * speed)), 200);
    return () => clearInterval(id);
  }, [speed]);

  const seatedFor = s.chair ? s.t - s.chair.since : 0;
  const price = takeoverPrice(s.chair ? s.chair.stake : null, seatedFor);
  const startPrice = s.chair ? s.chair.stake * SIM.takeoverPremium : SIM.minTakeover;
  const decayFrac = startPrice > SIM.minTakeover ? (price - SIM.minTakeover) / (startPrice - SIM.minTakeover) : 0;
  const pressFrac = Math.min(1, s.press / SIM.printThreshold);
  const full = s.press >= SIM.printThreshold;
  const youSit = s.chair?.who === YOU;
  const priceToBeat = Math.ceil(price * 100) / 100;
  const current = stock(s.chair ? s.chair.pick : "SPY");
  const stashEntries = Object.entries(s.stash).filter(([, v]) => v > 0);
  const stashValue = stashEntries.reduce((sum, [t, v]) => sum + v * stock(t).priceInSpy, 0);

  const takeSeat = () => {
    const cur = ref.current;
    const want = parseFloat(amount);
    const nowPrice = Math.ceil(
      takeoverPrice(cur.chair ? cur.chair.stake : null, cur.chair ? cur.t - cur.chair.since : 0) * 100
    ) / 100;
    if (cur.chair?.who === YOU) {
      commit({ ...cur, notice: "You're already in the Chair. Change your pick with the menu above." });
    } else if (!Number.isFinite(want) || want <= 0) {
      commit({ ...cur, notice: "Enter how much SPY you want to spend." });
    } else if (want < nowPrice) {
      commit({ ...cur, notice: `Not enough. Taking the Chair right now needs at least ${fmt(nowPrice)} SPY.` });
    } else {
      commit({
        ...cur,
        chair: { who: YOU, pick, stake: want, since: cur.t },
        press: cur.press + want * SIM.feeToPress,
        notice: `You took the Chair with ${fmt(want)} SPY. Your pick is ${pick}.`,
      });
      setAmount("");
    }
  };

  const changePick = (ticker: string) => {
    const cur = ref.current;
    if (!cur.chair || cur.chair.who !== YOU) return;
    commit({ ...cur, chair: { ...cur.chair, pick: ticker }, notice: `Your pick is now ${ticker}.` });
  };

  const bagPct = (s.bag / SIM.totalSupply) * 100;

  return (
    <section className="note" aria-label="Simulator">
      <p className="note-disclaimer">
        This is a simulation with made-up numbers and prices. Nothing here is on-chain yet.
      </p>

      <div className="note-top">
        <figure className="portrait">
          <img src="/art/portrait.svg" alt="" width={340} height={420} />
          <figcaption>
            <span className="portrait-role">The Chair</span>
            <span className="portrait-who">{s.chair ? label(s.chair.who) : "Empty seat"}</span>
          </figcaption>
        </figure>

        <div className="board">
          <div className="board-pick">
            <p className="board-label">
              {s.chair ? (youSit ? "Your pick" : "Their pick") : "Default pick"}
            </p>
            {youSit ? (
              <select
                className="pick-select"
                value={s.chair!.pick}
                onChange={(e) => changePick(e.target.value)}
                aria-label="Change your pick"
              >
                {STOCKS.map((st) => (
                  <option key={st.ticker} value={st.ticker}>
                    {st.ticker}
                  </option>
                ))}
              </select>
            ) : (
              <p className="pick-ticker">{current.ticker}</p>
            )}
            <p className="pick-name">
              {current.name}
              {s.chair ? `, seated ${Math.floor(seatedFor / 60)} min` : ""}
            </p>
          </div>

          <div className="meter">
            <div className="meter-head">
              <p className="board-label">Takeover price</p>
              <p className="num">{fmt(price)} SPY</p>
            </div>
            <div className="bar" aria-hidden="true">
              <span className="bar-fill bar-fill-blue" style={{ width: `${Math.max(2, decayFrac * 100)}%` }} />
            </div>
            <p className="meter-note">Falls to {fmt(SIM.minTakeover)} SPY over two hours in the seat.</p>
          </div>

          <div className="meter">
            <div className="meter-head">
              <p className="board-label">The Press</p>
              <p className="num">
                {fmt(Math.min(s.press, 99))} of {fmt(SIM.printThreshold)} SPY
              </p>
            </div>
            <div className="bar" aria-hidden="true">
              <span className="bar-fill" style={{ width: `${pressFrac * 100}%` }} />
            </div>
            <p className="meter-note">
              {full
                ? "Full. Press BRRR before someone else takes the tip."
                : `Fills as people trade. ${fmt(SIM.printThreshold - s.press)} SPY to go.`}
            </p>
          </div>

          <button className="brrr" disabled={!full} onClick={() => commit(doPrint(ref.current, YOU))}>
            BRRR
          </button>
        </div>
      </div>

      <div className="note-lower">
        <div className="panel">
          <h3>Take the Chair</h3>
          <p className="panel-note">Beat the takeover price and the seat is yours. Bots will try to take it back.</p>
          <div className="field-row">
            <label className="field">
              <span>SPY to spend</span>
              <input
                inputMode="decimal"
                value={amount}
                placeholder={fmt(priceToBeat)}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </label>
            <label className="field">
              <span>Your pick</span>
              <select value={pick} onChange={(e) => setPick(e.target.value)}>
                {STOCKS.map((st) => (
                  <option key={st.ticker} value={st.ticker}>
                    {st.ticker}, {st.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="button-row">
            <button className="btn" onClick={takeSeat}>
              Take the Chair
            </button>
            <button className="btn-quiet" onClick={() => setAmount(String(priceToBeat))}>
              Use {fmt(priceToBeat)} SPY
            </button>
          </div>
        </div>

        <div className="panel">
          <h3>Your stash</h3>
          <label className="field">
            <span>
              You hold {fmt(s.bag, 0)} $CHAIR, {fmt(bagPct, 1)}% of supply
            </span>
            <input
              type="range"
              min={0.1}
              max={5}
              step={0.1}
              value={bagPct}
              onChange={(e) => commit({ ...ref.current, bag: (parseFloat(e.target.value) / 100) * SIM.totalSupply })}
            />
          </label>
          {stashEntries.length === 0 ? (
            <p className="panel-note">Nothing yet. Every print adds your share here.</p>
          ) : (
            <ul className="stash">
              {stashEntries.map(([t, v]) => (
                <li key={t}>
                  <span className="stash-t">{t}</span>
                  <span className="num">{fmt(v, 4)}</span>
                </li>
              ))}
              <li className="stash-total">
                <span>Worth about</span>
                <span className="num">{fmt(stashValue, 4)} SPY</span>
              </li>
            </ul>
          )}
          <button className="btn" disabled>
            Claiming opens at launch
          </button>
        </div>
      </div>

      <div className="log">
        <h3>Print log</h3>
        {s.log.length === 0 ? (
          <p className="panel-note">No prints yet. The first one lands when the Press fills.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Chair</th>
                  <th>Bought</th>
                  <th className="r">Amount</th>
                  <th className="r">Per 1M $CHAIR</th>
                  <th>Pressed by</th>
                </tr>
              </thead>
              <tbody>
                {s.log.map((p) => (
                  <tr key={p.id}>
                    <td className="num">{clock(p.at)}</td>
                    <td>{p.chair}</td>
                    <td className="strong">{p.pick}</td>
                    <td className="num r">{fmt(p.amount, 3)}</td>
                    <td className="num r">{fmt(p.perMillion, 5)}</td>
                    <td>{p.caller}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="note-foot">
        <p className="notice" role="status" aria-live="polite">
          {s.notice || "Watching the market."}
        </p>
        <div className="controls">
          <span className="num">{clock(s.t)}</span>
          <button className={speed === 60 ? "chip chip-on" : "chip"} onClick={() => setSpeed(60)} aria-pressed={speed === 60}>
            Normal
          </button>
          <button className={speed === 300 ? "chip chip-on" : "chip"} onClick={() => setSpeed(300)} aria-pressed={speed === 300}>
            Fast
          </button>
          <button className="chip" onClick={() => commit(initialState())}>
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}

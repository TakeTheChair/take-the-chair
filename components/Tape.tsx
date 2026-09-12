// The ticker tape under the header. Pure CSS marquee, duplicated so the loop is seamless.
const items = [
  "Take the Chair",
  "Set the policy",
  "Print for every holder",
  "Launching on Pons",
  "12 September 2026",
  "Robinhood Chain",
  "Paired with SPY",
  "No presale",
  "No airdrop",
  "No admin keys",
];

export default function Tape() {
  const row = items.map((t, i) => (
    <span key={i}>
      {t}
      <i aria-hidden="true">◆</i>
    </span>
  ));
  return (
    <div className="tape" aria-label="Ticker">
      <div className="tape-track">
        <div className="tape-row">{row}</div>
        <div className="tape-row" aria-hidden="true">
          {row}
        </div>
      </div>
    </div>
  );
}

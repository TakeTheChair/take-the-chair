import Ribbon from "@/components/Ribbon";
import Simulator from "@/components/Simulator";
import { site, status } from "@/lib/site";

const steps = [
  {
    title: "Every trade fills the Press",
    body: "A slice of every $CHAIR trade on Pons is paid to the Press contract, in SPY.",
  },
  {
    title: "Outbuy the Chair",
    body: "Buy through this site with more than the takeover price and the seat is yours. You pick the stock. Keep holding what you bought, or anyone can remove you.",
  },
  {
    title: "Anyone presses BRRR",
    body: "When the Press is full, anyone can press BRRR. It buys the Chair's pick, checked against Chainlink's price, and tips whoever pressed.",
  },
  {
    title: "Every holder gets a share",
    body: "Your share depends on how much $CHAIR you held on average since the last print. Claim it whenever you like.",
  },
];

const rules = [
  ["Fee to the Press", "To be set", "Chosen on the Pons launch form and can't be raised after launch."],
  ["Pairing", "SPY", "Fees arrive as SPY, so the Press never has to sell $CHAIR."],
  ["Takeover price", "110% of the sitting Chair's buy", "You have to beat the current Chair, not just match them."],
  ["Price decay", "Falls to the minimum over 2 hours", "A whale can't lock the seat forever."],
  ["Minimum takeover", "To be set", "Stops anyone taking an empty seat with dust."],
  ["Which buys count", "Only buys made through this site", "The contract can't see trades made directly on Pons."],
  ["Chair's stake", "Must keep holding it", "Sell or move the tokens and anyone can remove the Chair."],
  ["Chair's salary", "2% of each print", "Paid in the stock, only while the stake is still held."],
  ["Print size", "To be set", "Tuned so a busy launch prints every 15 to 30 minutes."],
  ["BRRR tip", "0.1% of each print", "Someone always has a reason to press."],
  ["Price check", "Within 1% of Chainlink", "Stops anyone pumping a thin market right before the buy."],
  ["Allowed picks", "Official Robinhood stock tokens", "A Chair can't point the Press at a token they made."],
  ["Your share", "Average balance since the last print", "Buying just before a print and selling after earns almost nothing."],
  ["Claim delay", "6 hours after each result is posted", "Time for anyone to check the numbers."],
  ["Supply", "1,000,000,000", "Fixed by Pons. No minting."],
  ["Admin keys", "One limited key", "It posts print results and nothing else. See below."],
];

const faqs = [
  [
    "Do I need to take the Chair to earn?",
    "No. Every holder gets a share of every print. The Chair picks the stock and earns a 2% salary on top.",
  ],
  [
    "Do I own the stocks?",
    "You receive Robinhood stock tokens that you can claim to your wallet. Robinhood describes them as tokenised debt securities that give economic exposure to the underlying shares, with no shareholder rights. They aren't available in the US and are restricted in some other places.",
  ],
  [
    "Why don't buys on Pons count toward the Chair?",
    "The Press contract can't see trades made directly on Pons. Takeovers go through this site so the contract can check the size of the buy.",
  ],
  [
    "What happens if I sell?",
    "Your average balance drops, so your share of future prints shrinks. Anything you already earned stays yours to claim.",
  ],
  [
    "Can the team change the rules?",
    "No. There's no owner, no pause button and no upgrades. The one limited key can only post print results, and it can't touch funds or rules.",
  ],
  [
    "What if the Tally stops running?",
    "Bought stock stays in the contract and becomes claimable as soon as results are posted again. Nothing expires.",
  ],
  [
    "Is there a presale or airdrop?",
    "No. The whole supply launches on Pons. Anyone offering you early $CHAIR is running a scam.",
  ],
  [
    "When is launch?",
    `The date will be announced on @${site.xHandle} once the contracts are built, tested and reviewed.`,
  ],
];

const stateLabel = { done: "Done", "in-progress": "In progress", "not-started": "Not started" } as const;

export default function Home() {
  const xUrl = `https://x.com/${site.xHandle}`;
  return (
    <>
      <Ribbon />
      <div className="wrap">
        <header className="site-header">
          <a className="brand" href="#top">
            <img src="/art/emblem.svg" alt="" width={48} height={48} />
            <span>{site.name}</span>
          </a>
          <nav aria-label="Sections">
            <a href="#how">How it works</a>
            <a href="#rules">Rules</a>
            <a href="#status">Status</a>
            <a href="#faq">Questions</a>
            <a className="nav-x" href={xUrl} target="_blank" rel="noreferrer">
              @{site.xHandle}
            </a>
          </nav>
        </header>

        <main id="top">
          <section className="hero">
            <h1>
              Take the Chair.
              <br />
              Set the policy.
              <br />
              Print for every holder.
            </h1>
            <div className="hero-row">
              <p className="lede">
                Outbuy the sitting Chair and you pick which tokenized stock gets bought next. Hold {site.ticker} and
                you get a share of every print. Built for Robinhood Chain, launching on Pons.
              </p>
              <p className="stamp">Not live yet</p>
            </div>
          </section>

          <Simulator />

          <section id="how" className="section">
            <h2>How it works</h2>
            <ol className="steps">
              {steps.map((s, i) => (
                <li key={s.title}>
                  <span className="step-n">{i + 1}</span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section id="rules" className="section">
            <h2>The rules</h2>
            <p className="section-lede">
              These are the planned rules. Anything marked "to be set" gets decided before launch. Once the contract is
              verified, each rule will link to the line of code that enforces it.
            </p>
            <div className="table-scroll">
              <table className="rules">
                <thead>
                  <tr>
                    <th>Rule</th>
                    <th>Setting</th>
                    <th>Why</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(([rule, value, why]) => (
                    <tr key={rule}>
                      <td>{rule}</td>
                      <td className={value === "To be set" ? "tbd" : "strong"}>{value}</td>
                      <td className="why">{why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="key" className="section">
            <h2>The one key, and what it can't do</h2>
            <p className="section-lede">
              Paying every holder by their average balance takes a calculation too big to run on-chain. After each print,
              an open-source script called the Tally reads every {site.ticker} transfer, works out each wallet's share,
              publishes the full results on GitHub, and posts a fingerprint of those results to the contract from one
              dedicated wallet.
            </p>
            <div className="key-cols">
              <div>
                <h3>It can</h3>
                <ul className="key-list">
                  <li>Post new print results, which wait 6 hours before anyone can claim against them.</li>
                  <li>Hand its role to a new wallet.</li>
                </ul>
              </div>
              <div>
                <h3>It can never</h3>
                <ul className="key-list key-list-no">
                  <li>Touch the SPY in the Press.</li>
                  <li>Change a rule or a number.</li>
                  <li>Choose the Chair or the stock.</li>
                  <li>Pause anything.</li>
                  <li>Pay out more of a stock than the Press bought.</li>
                </ul>
              </div>
            </div>
            <p className="section-lede">
              If a result ever looks wrong, the previous one stays claimable during the 6-hour wait, so nobody loses what
              they were already owed. Anyone can rerun the Tally and check the fingerprint matches.
            </p>
          </section>

          <section id="status" className="section">
            <h2>What exists today</h2>
            <p className="section-lede">
              Anything not marked done isn't done. If you see a {site.ticker} contract address anywhere before it appears
              here, it isn't ours.
            </p>
            <ul className="status">
              {status.map((row) => (
                <li key={row.item}>
                  <div>
                    <h3>{row.item}</h3>
                    <p>{row.detail}</p>
                  </div>
                  <span className={`state state-${row.state}`}>{stateLabel[row.state]}</span>
                </li>
              ))}
              <li>
                <div>
                  <h3>Source code</h3>
                  <p>
                    {site.githubUrl ? (
                      <a href={site.githubUrl} target="_blank" rel="noreferrer">
                        Public on GitHub
                      </a>
                    ) : (
                      "The GitHub link will be added here."
                    )}
                  </p>
                </div>
                <span className={`state ${site.githubUrl ? "state-done" : "state-not-started"}`}>
                  {site.githubUrl ? "Done" : "Not started"}
                </span>
              </li>
            </ul>
          </section>

          <section id="faq" className="section">
            <h2>Questions</h2>
            <div className="faq">
              {faqs.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </section>
        </main>
      </div>

      <footer className="site-footer">
        <div className="wrap footer-inner">
          <p className="risk">
            <strong>Risk notice.</strong> {site.ticker} is an experimental token that isn't live yet, and its contracts
            haven't been reviewed. Tokens can lose all their value or become hard to sell, and on-chain transactions can't
            be reversed. Stock tokens are not shares, and availability may be restricted where you live. Nothing on this
            site is financial, legal or tax advice. This site never asks you to sign anything before launch.
          </p>
          <p className="risk">
            Not affiliated with, endorsed by, or connected to Robinhood Markets, Inc. or Pons.
          </p>
          <div className="footer-links">
            <a href={xUrl} target="_blank" rel="noreferrer">
              X
            </a>
            {site.githubUrl && (
              <a href={site.githubUrl} target="_blank" rel="noreferrer">
                GitHub
              </a>
            )}
            <a href={site.stockTokenDocs} target="_blank" rel="noreferrer">
              Stock token docs
            </a>
            <a href={site.explorerUrl} target="_blank" rel="noreferrer">
              Chain explorer
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

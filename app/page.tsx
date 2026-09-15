import Reveal from "@/components/Reveal";
import Ribbon from "@/components/Ribbon";
import Tape from "@/components/Tape";
import Simulator from "@/components/Simulator";
import { ConnectButton } from "@/components/Wallet";
import { site, status } from "@/lib/site";

const steps = [
  {
    title: "Every trade fills the Press",
    body: "A cut of every $CHAIR buy and sell is paid in SPY straight into the Press contract. Nobody holds it. Nobody can touch it.",
  },
  {
    title: "The Chair picks the stock",
    body: "Whoever spends the most SPY buying $CHAIR through this site takes the Chair and chooses which stock the Press buys next. NVDA, TSLA, AAPL, anything on the list.",
  },
  {
    title: "BRRR. Everyone gets paid",
    body: "When the Press is full, anyone presses BRRR. The Press buys the Chair's pick and sets it aside for every holder. Your cut is based on how much $CHAIR you held. Claim it whenever you want.",
  },
];

const reasons = [
  ["Paid in real stock tokens", "Not more memecoin. Robinhood stock tokens, sent to your wallet when you claim."],
  ["No staking, no locking", "Just hold $CHAIR. The Tally counts your average balance between prints."],
  ["Nobody can change it", "No owner, no pause, no upgrade. The only key that exists posts print results and can't touch funds."],
  ["The Chair earns extra", "The sitting Chair takes 2% of every print on top of their holder share, while they hold their stake."],
];

const rules = [
  ["Pair", "SPY", "Fees arrive as SPY. The Press never sells $CHAIR."],
  ["Takeover price", "110% of the sitting Chair's buy", "Falls back to the minimum over 2 hours, so nobody keeps the seat forever."],
  ["Chair's salary", "2% of each print", "Only while the Chair still holds what they bought."],
  ["Gap between prints", "5 minutes minimum", "Nothing pays out instantly, even when the Press is full."],
  ["BRRR tip", "0.1% of each print", "Whoever presses gets paid for pressing."],
  ["Price check", "Within 1% of Chainlink", "The Press refuses to buy into a pumped price."],
  ["Allowed picks", "Official Robinhood stock tokens only", "A Chair can't point the Press at a fake token."],
  ["Claim delay", "5 minutes after results post", "A short window for anyone to check the maths."],
  ["Supply", "1,000,000,000", "Fixed by Pons. No minting, no team wallet."],
];

const faqs = [
  ["Do I need to take the Chair to earn?", "No. Every holder gets a share of every print. The Chair just picks the stock and earns a 2% salary on top."],
  ["How do I take the Chair?", "Connect your wallet on this page, enter more SPY than the takeover price, pick a stock, confirm. That's it. Buys made directly on Pons don't count for the Chair, because the contract can't see them."],
  ["What happens if I sell?", "Your average balance drops, so your share of future prints shrinks. Anything already set aside for you stays yours to claim."],
  ["What if the Chair sells their stake?", "Anyone can remove them. The seat goes empty, the pick resets to SPY, and the next buyer takes it at the minimum price."],
  ["Do I own the stocks?", "You receive Robinhood stock tokens in your wallet. Robinhood describes them as tokenised securities giving economic exposure to the underlying shares, with no shareholder rights. They aren't available in the US and are restricted in some other places."],
  ["Is there a presale or airdrop?", "No. The entire supply launches on Pons. Anyone offering you early $CHAIR is scamming you."],
  ["When is launch?", `14 September 2026, on Pons. The contract address goes out on @${site.xHandle} first and appears on this page straight after.`],
];

const stateLabel = { done: "Done", "in-progress": "Today", "not-started": "Not started" } as const;

export default function Home() {
  const xUrl = `https://x.com/${site.xHandle}`;
  const buyUrl = site.contracts.token ? `${site.ponsUrl}/token/${site.contracts.token}` : site.ponsUrl;
  return (
    <>
      <Ribbon />
      <Reveal />
      <div className="wrap">
        <header className="site-header">
          <a className="brand" href="#top">
            <img src="/art/emblem.svg" alt="" width={48} height={48} />
            <span>{site.name}</span>
          </a>
          <nav aria-label="Sections">
            <a href="#how">How it works</a>
            <a href="#rules">The numbers</a>
            <a href="#status">Status</a>
            <a href="#faq">Questions</a>
            <a className="nav-x" href={xUrl} target="_blank" rel="noreferrer">
              @{site.xHandle}
            </a>
            <ConnectButton className="btn btn-small" />
          </nav>
        </header>
        <Tape />

        <main id="top">
          <section className="hero">
            <h1>
              Hold {site.ticker}.
              <br />
              Get paid in stocks.
            </h1>
            <div className="hero-row" data-reveal>
              <div>
                <p className="lede">
                  Every trade feeds a Press that buys real stock tokens on Robinhood Chain and hands them to holders.
                  Whoever sits in the Chair decides which stock it buys next. Take the Chair by outbuying them.
                </p>
                <div className="hero-cta">
                  <a className="btn btn-big" href={buyUrl} target="_blank" rel="noreferrer">
                    {site.contracts.token ? "Buy on Pons" : "Launching on Pons"}
                  </a>
                  <a className="btn btn-quiet btn-big" href={xUrl} target="_blank" rel="noreferrer">
                    Follow on X
                  </a>
                </div>
              </div>
              <p className="stamp">Launches today</p>
            </div>
          </section>

          <Simulator />

          <section id="how" className="section" data-reveal>
            <h2>How it works</h2>
            <p className="section-lede">Three steps. Nothing to stake, nothing to lock, nothing to trust.</p>
            <ol className="steps steps-3">
              {steps.map((s, i) => (
                <li key={s.title}>
                  <span className="step-n">{i + 1}</span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section id="why" className="section" data-reveal>
            <h2>Why hold it</h2>
            <ul className="reasons">
              {reasons.map(([t, b]) => (
                <li key={t}>
                  <h3>{t}</h3>
                  <p>{b}</p>
                </li>
              ))}
            </ul>
          </section>

          <section id="rules" className="section" data-reveal>
            <h2>The numbers</h2>
            <p className="section-lede">
              Written into the contract. Read the code on{" "}
              <a href={site.githubUrl} target="_blank" rel="noreferrer">
                GitHub
              </a>
              .
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
                      <td className="strong">{value}</td>
                      <td className="why">{why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="section-lede">
              Paying thousands of holders by their average balance is too heavy to run on-chain, so an open script
              called the Tally works it out after each print, publishes the full list on GitHub, and posts a
              fingerprint of it to the contract. The Tally's key can post results and nothing else: it can't touch the
              SPY, change a rule, pick a stock, or pay out more of a stock than the Press bought. Anyone can rerun it and
              check the numbers.
            </p>
          </section>

          <section id="status" className="section" data-reveal>
            <h2>Status</h2>
            <p className="section-lede">
              If you see a {site.ticker} contract address anywhere before it appears here and on @{site.xHandle}, it
              isn't ours.
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
              {(
                [
                  ["$CHAIR token", site.contracts.token],
                  ["Press contract", site.contracts.press],
                  ["Takeover desk", site.contracts.desk],
                ] as const
              ).map(
                ([label, addr]) =>
                  addr && (
                    <li key={label}>
                      <div>
                        <h3>{label}</h3>
                        <p className="num">{addr}</p>
                      </div>
                      <a className="state state-done" href={`${site.explorerUrl}/address/${addr}`} target="_blank" rel="noreferrer">
                        View on explorer
                      </a>
                    </li>
                  ),
              )}
              <li>
                <div>
                  <h3>Source code</h3>
                  <p>
                    <a href={site.githubUrl} target="_blank" rel="noreferrer">
                      {site.githubUrl.replace("https://", "")}
                    </a>
                  </p>
                </div>
                <a className="state state-done" href={site.githubUrl} target="_blank" rel="noreferrer">
                  Open
                </a>
              </li>
            </ul>
          </section>

          <section id="faq" className="section" data-reveal>
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
            <strong>Risk notice.</strong> {site.ticker} is an experimental token and its contracts are new and
            unaudited. Tokens can lose all their value or become hard to sell, and on-chain transactions can't be
            reversed. Stock tokens are not shares, and availability may be restricted where you live. Nothing on this
            site is financial, legal or tax advice.
          </p>
          <p className="risk">Not affiliated with, endorsed by, or connected to Robinhood Markets, Inc. or Pons.</p>
          <div className="footer-links">
            <a href={xUrl} target="_blank" rel="noreferrer">X</a>
            <a href={site.githubUrl} target="_blank" rel="noreferrer">GitHub</a>
            <a href={site.ponsUrl} target="_blank" rel="noreferrer">Pons</a>
            <a href={site.stockTokenDocs} target="_blank" rel="noreferrer">Stock token docs</a>
            <a href={site.explorerUrl} target="_blank" rel="noreferrer">Chain explorer</a>
          </div>
        </div>
      </footer>
    </>
  );
}

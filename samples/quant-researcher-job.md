# Quantitative Researcher — Systematic Equities (Mid/High-Frequency)

**Firm:** Meridian Capital Strategies LP
**Team:** Core Alpha Research — Statistical Arbitrage Pod 7
**Location:** New York, NY (Hudson Yards) — 5 days/week on-site, non-negotiable
**Comp:** $225K–$375K base + discretionary bonus (historical range 1.0x–4.0x base for the seat) + multi-year deferred carry
**Reports to:** Senior Portfolio Manager, Equities Systematic

---

## About the Seat

Pod 7 runs a market-neutral, intraday-to-multi-day statistical arbitrage book trading ~3,500 US equities and selected ADRs. We are hiring **one** researcher to own signal generation end-to-end: ideation, feature engineering, backtesting, capacity analysis, and live production hand-off. This is a P&L-attributed seat. You will be measured on the **out-of-sample, post-cost, capacity-adjusted Sharpe** of the strategies you ship — nothing else.

We receive ~4,000 applications per opening and extend offers to roughly 3. The interview loop is 6–8 rounds including a 4-hour on-site research case. Do not apply unless the bar below is genuinely cleared.

---

## Hard Requirements (all mandatory — no exceptions)

- PhD in a quantitative field (Statistics, Math, Physics, EE, CS, or Financial Engineering) from a top program, **or** an MS plus 3+ years of buy-side systematic research with a documented, attributable live track record.
- Demonstrable expertise in **at least three** of: high-dimensional time-series modeling, state-space/Kalman methods, regularized regression (elastic net/LARS), gradient-boosted trees, deep sequence models (LSTM/TCN/Transformers for tabular-temporal data), Bayesian hierarchical modeling.
- Production-grade **Python** (NumPy/pandas/Polars, numba/Cython) **and** strong **C++** (C++17/20, lock-free structures, cache-aware optimization). You will read and write both daily.
- Deep, *practical* understanding of **microstructure**: limit order book dynamics, queue position, adverse selection, the Almgren–Chriss framework, square-root market-impact models, and transaction-cost modeling under realistic fill assumptions.
- Rigorous backtesting discipline: you can articulate and *defend against* look-ahead bias, survivorship bias, p-hacking, multiple-testing inflation, and the difference between in-sample IR and deployable IR. Familiarity with deflated Sharpe ratio and PBO (probability of backtest overfitting) required.
- Comfort with **terabyte-scale** tick and L2/L3 order book data; experience with kdb+/q **or** a columnar equivalent (ClickHouse, Arrow/Parquet at scale).
- Numerical maturity: linear algebra (SVD/eigendecomposition, conditioning), convex optimization, stochastic calculus sufficient to reason about Itô dynamics.

## Strongly Preferred

- Published research in a top venue (or equivalent unpublished proprietary work you can speak to abstractly).
- Experience with portfolio construction under constraints: factor-neutralization, risk-model integration (Barra/Axioma), and turnover/borrow-cost-aware optimization.
- Familiarity with low-latency infra: FPGA exposure, kernel-bypass networking (Solarflare/Onload), PTP time-sync, nanosecond-aware event logging.
- Exposure to alternative data ingestion and the survivorship/PIT (point-in-time) integrity problems it creates.

## Explicitly NOT a Fit If…

- Your "backtest Sharpe" has never survived contact with realistic transaction costs and slippage.
- You think a 4.0 in-sample IR is a good thing without immediately worrying about why.
- You require remote/hybrid flexibility, or are uncomfortable with a fully transparent, P&L-attributed performance review.
- You cannot pass a quantitative interview that includes brain-teasers, mental-math under time pressure, and a live coding round in both Python and C++.

---

## The Research Case (on-site, ~4 hours)

You will be given a sanitized intraday dataset (~50GB of L2 book + trades for a basket of names) and a workstation. In four hours you are expected to:

1. Form and articulate a falsifiable alpha hypothesis grounded in microstructure.
2. Engineer features and build a validated predictive model with **honest** cross-validation (purged/embargoed K-fold; we will check).
3. Translate the signal into a position-sizing rule under explicit cost and capacity assumptions.
4. Report a *deflated*, post-cost, capacity-adjusted performance estimate — and tell us, unprompted, exactly why it would degrade in production.

Candidates who present a beautiful in-sample equity curve without a sober out-of-sample and overfitting discussion are not advanced. We are far more interested in the rigor of your skepticism than the height of your Sharpe.

---

## Compensation & Terms

- Base $225K–$375K commensurate with seniority.
- Discretionary annual bonus directly tied to risk-adjusted, post-cost P&L attribution of your book.
- Multi-year deferral with cliff; **2-year non-compete** and 12-month non-solicit (enforced).
- Full relocation to NYC required; visa sponsorship available for exceptional candidates.

## How to Apply

Submit a CV (max 1 page), and a short note (≤300 words) describing one research result you are proud of — including, specifically, **how you knew it wasn't overfit**. Applications without that note are not reviewed.

*Meridian Capital Strategies LP is an equal opportunity employer. We do not respond to recruiter submissions for this role.*

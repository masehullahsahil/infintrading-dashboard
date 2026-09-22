# InfinTrading · Agent Ops Dashboard

A live operations dashboard for the InfinTrading trading agents — **Finder**,
**Evaluator**, **Buyer**, and **Deal Tracker**. Watch every agent's activity,
metrics, and status in one dark "trade floor" view.

## Quickstart

```bash
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
npm run preview  # serve the production build locally
npm test         # unit tests (vitest)
npm run lint     # eslint
```

## What it does

- **Overview** — every agent's live status, key metrics, and latest event.
- **Agent pages** — per-agent metric cards plus a newest-first activity log,
  with pause/resume per agent.
- **Live ticker** — a scrolling strip of the newest event from each agent.
- **Real-data feeds** — every agent page has an upload control: drop in a
  CSV or JSON feed (validated against that agent's contract) to switch it
  from simulated to real data and browse the feed table. Sample files ship at
  `public/sample-*.csv` so you can try every agent's real path without real
  data.

## Demo vs. live data

Every agent starts on a **simulated feed** — the dashboard says so wherever it
matters ("Simulated feed" badges, and a banner on the Overview page naming
which agents are still simulated). Uploading a valid feed file switches that
agent to a **"Live data"** badge; clearing the feed switches it back. An agent
shows exactly one feed at a time — simulated rows are never mixed into a live
dataset, and a rejected upload changes nothing.

To wire an automatic backend later, replace the generators in
`src/lib/mockGenerators.js` with fetch/WebSocket calls behind the data-source
abstraction in `src/lib/dataSource.js` — the UI already branches on it.

## Feed contracts

Each agent accepts a CSV (header row + data rows) or a JSON array of objects
using the same field names. Uploads are validated client-side before anything
is applied: 5 MB max, required columns present, numeric fields parse as
numbers (`$1,240` style tolerated), enum fields match the allowed values, and
every bad row is reported with its row number. A file with any invalid row is
rejected outright — fix it and re-upload. Uploaded feeds and agent
pause/resume state persist in `localStorage` across reloads.

### Finder — `suppliers.csv`

| Column           | Required | Notes                                                              |
| ---------------- | -------- | ------------------------------------------------------------------ |
| `supplier_name`  | **yes**  | e.g. `Summit Liquidators`                                          |
| `supplier_type`  | no       | e.g. `Liquidation auction house`, `B2B wholesale marketplace`       |
| `source_channel` | no       | Where it was found, e.g. `Wholesale portal`, `Broker email`         |
| `contact`        | no       | Email or URL                                                       |
| `found_date`     | no       | `YYYY-MM-DD`                                                       |
| `status`         | no       | `active` (default) or `under_review`                               |

Metrics: Suppliers found (rows) · Roster size (distinct names) · Under review.

### Evaluator — `listings.csv`

| Column            | Required | Notes                                            |
| ----------------- | -------- | ------------------------------------------------ |
| `brand`           | no       | e.g. `Lenovo`                                    |
| `raw_model`       | **yes**  | e.g. `ThinkPad X1 Carbon Gen9`                   |
| `cpu_family`      | no       | e.g. `i7`                                        |
| `gen`             | no       | CPU generation                                   |
| `asking_price`    | **yes**  | Listing price in USD                             |
| `estimated_resale`| no       | Projected resale in USD                          |
| `expected_profit` | no       | `estimated_resale - asking_price`, in USD        |
| `has_comp`        | no       | `True`/`False` — matched to a comparable listing |

Metrics: Listings seen (rows) · Matched to comp · Avg. margin.

### Buyer — `offers.csv`

| Column         | Required | Notes                                                              |
| -------------- | -------- | ------------------------------------------------------------------ |
| `model`        | **yes**  | e.g. `ThinkPad X1 Carbon Gen9`                                     |
| `asking_price` | **yes**  | Seller's asking price in USD                                       |
| `offer_price`  | **yes**  | Our offer in USD                                                   |
| `status`       | **yes**  | `offer_sent`, `countered`, `accepted`, `declined`, `no_response`    |
| `seller`       | no       | Who the offer went to                                              |
| `date`         | no       | `YYYY-MM-DD`                                                       |

Metrics: Offers sent (rows) · Active threads (`offer_sent`/`countered`/`no_response`) · Accept rate (`accepted` ÷ decided).

### Deal Tracker

Not a feed — user state. Flag lots from the Evaluator board with the Track
button and they appear here with closing countdowns, your bid plan (the
Evaluator's max bid carried over as the suggested ceiling), and outcome
tracking (watching → bidding → won / lost / passed). Deals persist in
`localStorage`. The tracker never bids or contacts sellers — it tracks, you
decide.

## Automatic collection status

**Evaluator — LIVE.** The scheduled Finder/Evaluator scans publish
`listings.json` + `meta.json` to the repo's `data/live-feed` branch after every
run (morning full scan + evening changes check). The dashboard fetches that
feed on load (`src/lib/liveFeed.js`) and the Evaluator board updates itself —
no uploads needed. A manual upload always wins: it marks the feed source as
"upload" and the live feed will not overwrite it until the operator clears it
or clicks "Switch to live feed".

Still manual (upload a file on each agent's page):

- **Finder** — supplier roster: scrapers or API integrations for liquidation
  auction houses, B2B wholesale marketplaces, and broker lists, plus dedupe
  against the existing roster.
- **Buyer** — offer tracking: an outbox/inbox for offers (marketplace
  messaging APIs or email parsing) that records status transitions instead of
  hand-entered rows.
- **Deal Tracker** — later: closing-time push reminders (cron or service worker)
  ahead of auction closes, so a nudge reaches you even with the dashboard
  closed.

Plus the cross-cutting pieces: server-side validation of incoming data, and
authentication for any write-capable integration. The feed contracts above
are the documented handoff point.

## Project structure

```
src/
  main.jsx                 entry point (error boundary + render)
  App.jsx                  layout + view routing
  theme.js                 design tokens (mirrored as CSS vars in index.css)
  index.css                global reset, tokens, keyframes, utility classes
  components/              Ticker, Sidebar, StatCard, StatusBadge, DemoBadge,
                           Overview, AgentPage, FeedControls, FeedTable,
                           ErrorBoundary
  hooks/
    useAgentSimulation.js  agent state, event tick loop, ticker, per-agent
                           feeds, persistence
    useIsNarrow.js         responsive breakpoint hook
  lib/
    agents.js              agent definitions, metric seeds
    mockGenerators.js      simulated event generators (demo feed)
    dataSource.js          demo vs. live data-mode resolution
    agentFeeds.js          per-agent feed contracts: schema, validation,
                           parsing (CSV/JSON), metric summarizers
    feedFile.js            shared upload file-reading (size limit)
    listingsCsv.js         Evaluator CSV parsing, validation, stats
public/
  sample-listings.csv      try the Evaluator's real-data path
  sample-suppliers.csv     try the Finder's real-data path
  sample-offers.csv        try the Buyer's real-data path
  favicon.svg
```

## Deployment

`npm run build` produces a static `dist/` folder — deploy it to any static
host (Vercel, Netlify, GitHub Pages, S3, …). No server or environment variables
required.

## License

MIT — see [LICENSE](LICENSE).

# InfinTrading · Agent Ops Dashboard

A live operations dashboard for the InfinTrading trading agents — **Finder**,
**Evaluator**, **Buyer**, and **Bookkeeper**. Watch every agent's activity,
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
- **Evaluator CSV upload** — drop in a real `listings.csv` (e.g. from
  `scout_parser.py`) to switch the Evaluator from simulated to real data and
  browse the listings table. A sample file ships at
  `public/sample-listings.csv` so you can try it without real data.

## Demo vs. live data

Three agents (Finder, Buyer, Bookkeeper) currently run on a **simulated feed** —
the dashboard says so wherever it matters ("Simulated feed" badges, and a
banner on the Overview page). The Evaluator switches to a **"Live data"** badge
once a real CSV is loaded.

To wire a real backend later, replace the generators in
`src/lib/mockGenerators.js` with fetch/WebSocket calls behind the data-source
abstraction in `src/lib/dataSource.js` — the UI already branches on it.

## listings.csv schema

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

Uploads are validated client-side (max 5 MB, required columns, parse errors
surfaced in the UI). Uploaded listings and agent pause/resume state persist in
`localStorage` across reloads.

## Project structure

```
src/
  main.jsx                 entry point (error boundary + render)
  App.jsx                  layout + view routing
  theme.js                 design tokens (mirrored as CSS vars in index.css)
  index.css                global reset, tokens, keyframes, utility classes
  components/              Ticker, Sidebar, StatCard, StatusBadge, DemoBadge,
                           Overview, AgentPage, EvaluatorPage, ErrorBoundary
  hooks/
    useAgentSimulation.js  agent state, event tick loop, ticker, persistence
    useIsNarrow.js         responsive breakpoint hook
  lib/
    agents.js              agent definitions, metric seeds
    mockGenerators.js      simulated event generators (demo feed)
    dataSource.js          demo vs. live data-mode resolution
    listingsCsv.js         CSV parsing, validation, stats
public/
  sample-listings.csv      try the Evaluator's real-data path
  favicon.svg
```

## Deployment

`npm run build` produces a static `dist/` folder — deploy it to any static
host (Vercel, Netlify, GitHub Pages, S3, …). No server or environment variables
required.

## License

MIT — see [LICENSE](LICENSE).

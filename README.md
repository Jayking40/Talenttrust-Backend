# TalentTrust Backend

Express API for the TalentTrust decentralized freelancer escrow protocol. Handles contract metadata, reputation, and integration with Stellar/Soroban.

## Prerequisites

- Node.js 18+
- npm or yarn

## Setup

```bash
# Clone and enter the repo
git clone <your-repo-url>
cd talenttrust-backend

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Start dev server (with hot reload)
npm run dev

# Start production server
npm start
```

## Scripts

| Script | Description |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run production server |
| `npm run dev` | Run with ts-node-dev |
| `npm test` | Run Jest tests |
| `npm run lint` | Run ESLint |

## API and Observability Endpoints

- `GET /api/v1/contracts`: Sample contracts endpoint.
- `GET /health/live`: Liveness signal for process-level checks.
- `GET /health/ready`: Readiness signal with runtime and dependency health details.
- `GET /health`: Full service-level health report (same payload as readiness).
- `GET /metrics`: Prometheus metrics in text exposition format.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP port used by the service |
| `SERVICE_NAME` | `talenttrust-backend` | Service label used in health and metrics |
| `METRICS_ENABLED` | `true` | Enables/disables `/metrics` route |
| `METRICS_AUTH_TOKEN` | _unset_ | If set, `/metrics` requires `Authorization: Bearer <token>` |

## Security Notes

- Keep `METRICS_AUTH_TOKEN` set in production unless `/metrics` is only reachable on trusted internal networks.
- `/metrics` intentionally excludes request bodies and unbounded labels to reduce accidental data leakage and high-cardinality abuse.
- Health payloads include operational signals only (event loop lag, memory pressure, dependency states), not secrets.

See `docs/backend/observability.md` for endpoint samples, threat scenarios, and scrape recommendations.

## Contributing

1. Fork the repo and create a branch from `main`.
2. Install deps, run tests and build: `npm install && npm test && npm run build`.
3. Open a pull request. CI runs build and tests on push/PR to `main`.

## CI/CD

GitHub Actions runs on push and pull requests to `main`:

- Install dependencies
- Build the project (`npm run build`)
- Run tests (`npm test`)

Keep CI passing before merging.

## License

MIT

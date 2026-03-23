# TalentTrust Backend

Express API for the TalentTrust decentralized freelancer escrow protocol. Handles contract metadata, reputation, and integration with Stellar/Soroban.

## Dependency Chaos Testing

The backend includes dependency-level chaos testing to simulate upstream outages and verify graceful degradation.

### Behavior

- `GET /api/v1/contracts` returns upstream data during normal operation.
- On upstream failures with graceful degradation enabled, it returns a safe fallback payload with `degraded: true`.
- If graceful degradation is disabled, it returns `503` with `contracts_unavailable`.

### Configuration

- `GRACEFUL_DEGRADATION_ENABLED=true|false` (default `true`)
- `UPSTREAM_CONTRACTS_URL` (default `https://example.invalid/contracts`)
- `UPSTREAM_TIMEOUT_MS` (default `1200`, bounded to `100..10000`)
- `CHAOS_MODE=off|error|timeout|random` (default `off`)
- `CHAOS_TARGETS` (comma-separated dependencies like `contracts`)
- `CHAOS_PROBABILITY` (float `0..1`, used by `random` mode)

### Docs

Detailed architecture and security notes are in `docs/backend/chaos-testing.md`.

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

| Script   | Description                    |
|----------|--------------------------------|
| `npm run build` | Compile TypeScript to `dist/`  |
| `npm run start` | Run production server          |
| `npm run dev`   | Run with ts-node-dev           |
| `npm test`      | Run Jest tests                 |
| `npm run lint`  | Run ESLint                     |

## Contributing

1. Fork the repo and create a branch from `main`.
2. Install deps, run tests and build: `npm install && npm test && npm run build`.
3. Open a pull request. CI runs build (and tests when present) on push/PR to `main`.

## CI/CD

GitHub Actions runs on push and pull requests to `main`:

- Install dependencies
- Build the project (`npm run build`)

Keep the build passing before merging.

## License

MIT

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

## New Features

### 1. Authentication Middleware (#55)
All routes under `/api/v1/admin/*` are protected by JWT authentication.
- **Header**: `Authorization: Bearer <token>`
- **Validation**: Ensures token is valid and not expired.

### 2. Event Idempotency (#67)
The `/api/v1/events` endpoint requires an `Idempotency-Key` header to prevent duplicate processing of the same smart contract event.
- **Header**: `Idempotency-Key: <unique-uuid-or-hash>`
- **Behavior**: If a key is seen again within 1 hour, the cached response is returned instead of re-processing.

### 3. Smart-Contract Event Indexer (#70)
A pipeline for indexing escrow and dispute lifecycle updates from smart contracts.
- **Endpoint**: `POST /api/v1/events`
- **Supported Events**: `escrow:created`, `escrow:completed`, `dispute:initiated`, `dispute:resolved`.

## Testing

Run unit and integration tests to verify these features:
```bash
npm test
```

## License

MIT

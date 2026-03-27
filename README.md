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

## Request Validation Framework

The API now includes a schema-based request validation framework for:

- Route `params`
- URL `query`
- JSON request `body`

Validation is strict by default:

- Unknown fields are rejected.
- Required fields are enforced.
- Type and range/length constraints are validated.

Validation middleware returns HTTP `400` with the shape:

```json
{
	"error": "Validation failed",
	"details": ["query.admin is not allowed"]
}
```

See `docs/backend/request-validation-framework.md` for implementation details and security notes.

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

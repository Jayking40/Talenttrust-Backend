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

## Deployment

### Automated Deployment Pipeline

The project uses a reproducible deployment workflow with environment promotion:

- **Development**: Auto-deploy from `develop` branch
- **Staging**: Auto-deploy from `staging` branch
- **Production**: Auto-deploy from `main` branch

### Environment Promotion Flow

```
Development → Staging → Production
```

### Deployment Features

- ✅ Automated CI/CD with GitHub Actions
- ✅ Environment-specific configuration validation
- ✅ Security scanning (npm audit)
- ✅ Test coverage enforcement (95% recommended)
- ✅ Pre-deployment validation checks
- ✅ Post-deployment health checks
- ✅ Rollback capabilities
- ✅ Deployment audit logging

### Quick Deployment

**Automatic**: Push to the appropriate branch
```bash
git push origin develop    # Deploy to development
git push origin staging    # Deploy to staging
git push origin main       # Deploy to production
```

**Manual**: Use GitHub Actions workflow dispatch

For detailed deployment documentation, see [Deployment Guide](docs/backend/deployment-guide.md).

## CI/CD

GitHub Actions runs on push and pull requests:

- Install dependencies
- Run linter and tests
- Build the project
- Security scanning
- Deployment validation
- Environment-specific deployment

Keep the build passing before merging.

## License

MIT

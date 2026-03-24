import { createApp } from './app';
import { readObservabilityConfig } from './observability';

const config = readObservabilityConfig();
const { app, healthService } = createApp({ config });

const server = app.listen(config.port, () => {
  console.log(`TalentTrust API listening on http://localhost:${config.port}`);
});

const shutdown = (): void => {
  healthService.close?.();
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

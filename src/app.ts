import express, { Request, Response } from 'express';
import { AppConfig } from './config';
import { ChaosPolicy } from './chaos/chaosPolicy';
import { ContractsClient } from './dependencies/contractsClient';
import { Contract } from './types/contracts';

interface ContractsDependency {
  getContracts(): Promise<Contract[]>;
}

interface CreateAppOptions {
  config: AppConfig;
  contractsDependency?: ContractsDependency;
}

/**
 * Creates the HTTP app with dependency resilience behavior and safe degraded responses.
 */
export function createApp(options: CreateAppOptions): express.Express {
  const app = express();
  const contractsDependency =
    options.contractsDependency ??
    new ContractsClient(
      {
        upstreamContractsUrl: options.config.upstreamContractsUrl,
        upstreamTimeoutMs: options.config.upstreamTimeoutMs,
      },
      new ChaosPolicy(options.config),
    );

  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'talenttrust-backend' });
  });

  app.get('/api/v1/contracts', async (_req: Request, res: Response) => {
    try {
      const contracts = await contractsDependency.getContracts();
      res.json({ contracts, degraded: false, source: 'upstream' });
    } catch (_error) {
      if (!options.config.gracefulDegradationEnabled) {
        res.status(503).json({ error: 'contracts_unavailable' });
        return;
      }

      res.json({
        contracts: [],
        degraded: true,
        source: 'fallback-empty',
        reason: 'upstream_unavailable',
      });
    }
  });

  return app;
}

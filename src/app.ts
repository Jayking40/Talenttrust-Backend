import express, { Express, NextFunction, Request, Response } from 'express';

import {
  HealthService,
  HealthServiceLike,
  healthReportToHttpStatus,
} from './observability/health-service';
import { MetricsService, MetricsServiceLike } from './observability/metrics-service';
import {
  ObservabilityConfig,
  readObservabilityConfig,
} from './observability/observability-config';

/**
 * Central app assembly so runtime wiring is easy to test without opening sockets.
 */
export interface AppContext {
  app: Express;
  config: ObservabilityConfig;
  healthService: HealthServiceLike;
  metricsService: MetricsServiceLike;
}

export interface CreateAppOptions {
  config?: ObservabilityConfig;
  healthService?: HealthServiceLike;
  metricsService?: MetricsServiceLike;
}

export function createApp(options: CreateAppOptions = {}): AppContext {
  const config = options.config ?? readObservabilityConfig();
  const healthService = options.healthService ?? new HealthService(config.serviceName);
  const metricsService = options.metricsService ?? new MetricsService(config.serviceName);
  const app = express();

  app.use(express.json());
  app.use((req: Request, res: Response, next: NextFunction) => {
    metricsService.trackHttpRequest(req, res, next);
  });

  app.get('/health/live', (_req: Request, res: Response) => {
    res.json({ status: 'up', service: config.serviceName });
  });

  app.get('/health/ready', async (_req: Request, res: Response) => {
    const report = await healthService.getReport();
    metricsService.recordHealthStatus(report.status);
    res.status(healthReportToHttpStatus(report.status)).json(report);
  });

  app.get('/health', async (_req: Request, res: Response) => {
    const report = await healthService.getReport();
    metricsService.recordHealthStatus(report.status);
    res.status(healthReportToHttpStatus(report.status)).json(report);
  });

  app.get('/metrics', async (req: Request, res: Response) => {
    if (!config.metrics.enabled) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    if (!hasMetricsAccess(req, config.metrics.authToken)) {
      res.set('WWW-Authenticate', 'Bearer realm="metrics"');
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    res.set('Content-Type', metricsService.contentType);
    res.send(await metricsService.getMetrics());
  });

  app.get('/api/v1/contracts', (_req: Request, res: Response) => {
    res.json({ contracts: [] });
  });

  return {
    app,
    config,
    healthService,
    metricsService,
  };
}

function hasMetricsAccess(req: Request, authToken?: string): boolean {
  if (!authToken) {
    return true;
  }

  const authorization = req.header('authorization');
  if (!authorization) {
    return false;
  }

  const [scheme, token] = authorization.split(' ');
  return scheme.toLowerCase() === 'bearer' && token === authToken;
}


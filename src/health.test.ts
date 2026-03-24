import request from 'supertest';

import { createApp } from './app';
import { HealthServiceLike, HealthReport, MetricsService } from './observability';
import { ObservabilityConfig } from './observability/observability-config';

function buildConfig(overrides: Partial<ObservabilityConfig> = {}): ObservabilityConfig {
  return {
    port: 3001,
    serviceName: 'talenttrust-backend',
    metrics: {
      enabled: true,
      authToken: undefined,
      ...(overrides.metrics ?? {}),
    },
    ...overrides,
  };
}

describe('health and observability integration', () => {
  it('returns enriched health details from /health and /health/ready', async () => {
    const { app } = createApp({ config: buildConfig() });

    const healthResponse = await request(app).get('/health');
    const readyResponse = await request(app).get('/health/ready');
    const liveResponse = await request(app).get('/health/live');

    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body).toMatchObject({
      service: 'talenttrust-backend',
    });
    expect(healthResponse.body.status).toMatch(/up|degraded|down/);
    expect(typeof healthResponse.body.signals.eventLoopLagMs).toBe('number');
    expect(typeof healthResponse.body.signals.heapUsedRatio).toBe('number');

    expect(readyResponse.status).toBe(200);
    expect(liveResponse.status).toBe(200);
    expect(liveResponse.body).toEqual({
      status: 'up',
      service: 'talenttrust-backend',
    });
  });

  it('protects /metrics with bearer auth when METRICS_AUTH_TOKEN is configured', async () => {
    const { app } = createApp({
      config: buildConfig({ metrics: { enabled: true, authToken: 'secret-token' } }),
    });

    const unauthorizedResponse = await request(app).get('/metrics');
    expect(unauthorizedResponse.status).toBe(401);
    expect(unauthorizedResponse.headers['www-authenticate']).toContain('Bearer');

    const authorizedResponse = await request(app)
      .get('/metrics')
      .set('Authorization', 'Bearer secret-token');

    expect(authorizedResponse.status).toBe(200);
    expect(authorizedResponse.headers['content-type']).toContain('text/plain');
    expect(authorizedResponse.text).toContain('service_health_status');
  });

  it('returns 404 for /metrics when metrics are disabled', async () => {
    const { app } = createApp({
      config: buildConfig({ metrics: { enabled: false, authToken: undefined } }),
    });

    const response = await request(app).get('/metrics');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not_found' });
  });

  it('returns 503 for readiness endpoints when service health is down', async () => {
    const report: HealthReport = {
      service: 'talenttrust-backend',
      status: 'down',
      timestamp: new Date().toISOString(),
      uptimeSeconds: 10,
      signals: {
        eventLoopLagMs: 1100,
        heapUsedBytes: 95,
        heapTotalBytes: 100,
        heapUsedRatio: 0.95,
      },
      dependencies: [{
        name: 'database',
        status: 'down',
        observedAt: new Date().toISOString(),
        details: 'connection timeout',
      }],
    };

    const downHealthService: HealthServiceLike = {
      getReport: async () => report,
    };

    const metrics = new MetricsService('talenttrust-backend');
    const { app } = createApp({
      config: buildConfig(),
      healthService: downHealthService,
      metricsService: metrics,
    });

    const healthResponse = await request(app).get('/health');
    const readyResponse = await request(app).get('/health/ready');

    expect(healthResponse.status).toBe(503);
    expect(readyResponse.status).toBe(503);
    expect(healthResponse.body.status).toBe('down');
    expect(healthResponse.body.dependencies[0].name).toBe('database');
  });
});

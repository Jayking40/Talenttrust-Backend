import request from 'supertest';
import app from './index';
import { EscrowHooks } from './hooks/escrow.hooks';

describe('API Gateway Tests', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', service: 'talenttrust-backend' });
    });
  });

  describe('GET /api/v1/contracts', () => {
    it('should return empty contracts list', async () => {
      const res = await request(app).get('/api/v1/contracts');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ contracts: [] });
    });
  });

  describe('POST /api/v1/events/escrow', () => {
    it('should return 400 if event or payload is missing', async () => {
      const res = await request(app).post('/api/v1/events/escrow').send({});
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Missing event or payload' });
    });

    it('should return 200 if hooks trigger successfully', async () => {
      jest.spyOn(EscrowHooks, 'onEscrowEvent').mockResolvedValue(undefined);
      const res = await request(app)
        .post('/api/v1/events/escrow')
        .send({ event: 'ESCROW_INITIALIZED', payload: { id: 1 } });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', message: 'Hooks triggered successfully' });
      expect(EscrowHooks.onEscrowEvent).toHaveBeenCalledWith('ESCROW_INITIALIZED', { id: 1 });
    });

    it('should return 500 if hooks throw an error', async () => {
      jest.spyOn(EscrowHooks, 'onEscrowEvent').mockRejectedValue(new Error('Test error'));
      const res = await request(app)
        .post('/api/v1/events/escrow')
        .send({ event: 'FUNDS_DEPOSITED', payload: { id: 2 } });
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal Server Error' });
    });
  });
});

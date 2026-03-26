import request from 'supertest';
import app from './index';
import jwt from 'jsonwebtoken';
import { clearIdempotencyStore } from './middleware/idempotency';

const JWT_SECRET = process.env.JWT_SECRET || 'tt-dev-secret-keep-it-safe';

describe('Integration Tests', () => {
  let token: string;

  beforeAll(() => {
    token = jwt.sign({ sub: 'admin-user' }, JWT_SECRET);
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    clearIdempotencyStore();
  });

  describe('Authentication', () => {
    it('should reject access to admin route without token', async () => {
      const response = await request(app).get('/api/v1/admin/events');
      expect(response.status).toBe(401);
    });

    it('should allow access to admin route with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/admin/events')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('events');
    });
  });

  describe('Event Indexing & Idempotency', () => {
    const eventBody = {
      contractId: '0xabc123',
      eventType: 'escrow:created',
      payload: { value: 1000 },
      timestamp: new Date().toISOString()
    };

    it('should process events and guarantee idempotency', async () => {
      const idempotencyKey = 'test-key-1';

      // First request
      const res1 = await request(app)
        .post('/api/v1/events')
        .set('Idempotency-Key', idempotencyKey)
        .send(eventBody);
      
      expect(res1.status).toBe(201);
      expect(res1.body.status).toBe('indexed');

      // Second request (Replay)
      const res2 = await request(app)
        .post('/api/v1/events')
        .set('Idempotency-Key', idempotencyKey)
        .send(eventBody);

      expect(res2.status).toBe(200);
      expect(res2.body.idempotencyHeader).toBe('replay-detected');
      expect(res2.body.eventId).toBe(res1.body.eventId);
    });

    it('should fail if Idempotency-Key is missing on POST /events', async () => {
      const response = await request(app)
        .post('/api/v1/events')
        .send(eventBody);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Idempotency-Key header is required');
    });
  });
});

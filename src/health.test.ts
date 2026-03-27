import request from 'supertest';
import app from './index';

describe('health endpoint', () => {
  it('returns service health payload', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'talenttrust-backend',
    });
  });
});

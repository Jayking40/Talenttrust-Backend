import express, { Request, Response } from 'express';
import { authenticateToken } from './middleware/auth';
import { idempotencyMiddleware } from './middleware/idempotency';
import { indexerService, EventType } from './services/indexer';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'talenttrust-backend' });
});

/**
 * @route GET /api/v1/contracts
 * @description List all contracts (Public)
 */
app.get('/api/v1/contracts', (_req: Request, res: Response) => {
  res.json({ contracts: [] });
});

/**
 * @route POST /api/v1/events
 * @description Webhook listener for smart contract events (Idempotent)
 */
app.post('/api/v1/events', idempotencyMiddleware, async (req: Request, res: Response) => {
  try {
    const event = req.body;
    const result = await indexerService.processEvent(event);
    res.status(201).json({
      message: 'Event processing started',
      ...result
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route GET /api/v1/admin/events
 * @description View indexed events (Protected)
 */
app.get('/api/v1/admin/events', authenticateToken, (_req: Request, res: Response) => {
  res.json({ events: indexerService.getEvents() });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`TalentTrust API listening on http://localhost:${PORT}`);
  });
}

export default app;

import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'talenttrust-backend' });
});

app.get('/api/v1/contracts', (_req: Request, res: Response) => {
  res.json({ contracts: [] });
});

app.post('/api/v1/events/escrow', async (req: Request, res: Response) => {
  // Simulating an internal/external webhook that ingests escrow events
  const { event, payload } = req.body;
  if (!event || !payload) {
    return res.status(400).json({ error: 'Missing event or payload' });
  }

  try {
    const { EscrowHooks } = await import('./hooks/escrow.hooks');
    await EscrowHooks.onEscrowEvent(event, payload);
    return res.status(200).json({ status: 'ok', message: 'Hooks triggered successfully' });
  } catch (error) {
    console.error('Failed to process escrow event', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`TalentTrust API listening on http://localhost:${PORT}`);
  });
}

export default app;

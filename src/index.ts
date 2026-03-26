import express, { Request, Response } from 'express';
import { secretsManager, initializeSecrets } from './config/secrets';

// Initialize secrets early in the application lifecycle
initializeSecrets();

const app = express();
const PORT = secretsManager.getValue<number>('PORT');

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'talenttrust-backend' });
});

app.get('/api/v1/contracts', (_req: Request, res: Response) => {
  res.json({ contracts: [] });
});

app.listen(PORT, () => {
  console.log(`TalentTrust API listening on http://localhost:${PORT}`);
});

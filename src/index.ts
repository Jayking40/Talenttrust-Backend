import express, { Request, Response } from 'express';
import { sanitize } from './middleware/sanitize';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(sanitize);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'talenttrust-backend' });
});

app.get('/api/v1/contracts', (_req: Request, res: Response) => {
  res.json({ contracts: [] });
});

app.listen(PORT, () => {
  console.log(`TalentTrust API listening on http://localhost:${PORT}`);
});

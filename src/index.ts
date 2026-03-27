import express, { Request, Response } from 'express';
import { createRequestValidationMiddleware } from './middleware/requestValidation';
import { ObjectSchema } from './validation/requestSchema';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'talenttrust-backend' });
});

const contractParamsSchema: ObjectSchema = {
  contractId: { type: 'string', required: true, minLength: 3, maxLength: 64 },
};

const contractListQuerySchema: ObjectSchema = {
  status: {
    type: 'string',
    required: false,
    enum: ['active', 'completed', 'disputed'],
  },
};

const contractMetadataBodySchema: ObjectSchema = {
  title: { type: 'string', required: true, minLength: 1, maxLength: 120 },
  description: { type: 'string', required: false, maxLength: 5000 },
  budget: { type: 'number', required: false, min: 0 },
};

app.get(
  '/api/v1/contracts',
  createRequestValidationMiddleware({ query: contractListQuerySchema }),
  (req: Request, res: Response) => {
    res.json({ contracts: [], filters: req.query });
  }
);

app.get(
  '/api/v1/contracts/:contractId',
  createRequestValidationMiddleware({ params: contractParamsSchema }),
  (req: Request, res: Response) => {
    res.json({ contractId: req.params.contractId });
  }
);

app.post(
  '/api/v1/contracts/:contractId/metadata',
  createRequestValidationMiddleware({
    params: contractParamsSchema,
    body: contractMetadataBodySchema,
  }),
  (req: Request, res: Response) => {
    res.status(201).json({
      contractId: req.params.contractId,
      metadata: req.body,
    });
  }
);

/* istanbul ignore next */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`TalentTrust API listening on http://localhost:${PORT}`);
  });
}

export default app;

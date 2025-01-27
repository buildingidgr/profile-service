import 'dotenv/config';
import express, { Request, Response, Application } from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { createLogger } from './utils/logger';
import { rabbitmq } from './utils/rabbitmq';
import { config } from './config';
import { profileRoutes } from './routes/profileRoutes';
import { validateToken } from './middleware/validateToken';
import { errorHandler } from './middleware/errorHandler';
import './consumers/opportunityConsumer';

const logger = createLogger('api-service');
const app: Application = express();

// Trust proxy for accurate rate limiting
app.set('trust proxy', true);

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(limiter);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Connect to RabbitMQ
rabbitmq.connect().catch((error) => {
  logger.error('Failed to connect to RabbitMQ:', error);
});

try {
  // API routes with JWT validation
  app.use('/api/profiles', validateToken, profileRoutes);

  // Error handling
  app.use(errorHandler);

  // Start server
  const port = config.port || 3000;
  app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
  });
} catch (error) {
  logger.error('Failed to start server:', error);
  process.exit(1);
}


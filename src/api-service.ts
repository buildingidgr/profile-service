import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { validateToken } from './middleware/validateToken';
import { profileRoutes } from './routes/profileRoutes';
import { requestLogger } from './middleware/requestLogger';

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Middleware
app.use(express.json());
app.use(requestLogger);

// JWT validation for protected routes
app.use('/api', validateToken);

// Routes
app.use('/api/profiles', profileRoutes);

// Error handling
app.use(errorHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(config.port, () => {
  console.log(`API Service running on port ${config.port}`);
});


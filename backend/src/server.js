import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { emailVerifiedRequired } from './middleware/emailVerification.js';
import { authRequired } from './middleware/auth.js';
import { requireAppAccess } from './middleware/appAccess.js';
import accountRoutes from './routes/accountRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import authRoutes from './routes/authRoutes.js';
import billingRoutes, { stripeWebhookHandler } from './routes/billingRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import footballRoutes from './routes/footballRoutes.js';
import intelligenceRoutes from './routes/intelligenceRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import premiumRoutes from './routes/premiumRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import studentPortalRoutes from './routes/studentPortalRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import workoutLibraryRoutes from './routes/workoutLibraryRoutes.js';
import workoutRoutes from './routes/workoutRoutes.js';
import { checkDatabaseHealth } from './services/healthService.js';
import { initMonitoring, registerProcessHandlers } from './services/monitoring.js';
import { logger } from './utils/logger.js';

const app = express();
const allowedOrigins = new Set(env.appUrls);
const localhostRegex = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/i;

initMonitoring();
registerProcessHandlers();

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      if (env.nodeEnv !== 'production' && localhostRegex.test(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.post('/api/billing/webhooks/stripe', ...stripeWebhookHandler);
app.post('/api/billing/webhook/stripe', ...stripeWebhookHandler);
app.use(express.json({ limit: '15mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/health', async (req, res) => {
  const database = await checkDatabaseHealth();
  const payload = {
    status: database.ok ? 'ok' : 'degraded',
    service: 'TrainFlow API',
    timestamp: new Date().toISOString(),
    database
  };

  return res.status(database.ok ? 200 : 503).json(payload);
});

app.use('/api/auth', authRoutes);
app.use('/api/account', authRequired, emailVerifiedRequired, accountRoutes);
app.use('/api/ai', authRequired, emailVerifiedRequired, requireAppAccess, aiRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', authRequired, emailVerifiedRequired, requireAppAccess, dashboardRoutes);
app.use('/api/students', authRequired, emailVerifiedRequired, requireAppAccess, studentRoutes);
app.use('/api/workouts', authRequired, emailVerifiedRequired, requireAppAccess, workoutRoutes);
app.use('/api/progress', authRequired, emailVerifiedRequired, requireAppAccess, progressRoutes);
app.use('/api/schedule', authRequired, emailVerifiedRequired, requireAppAccess, scheduleRoutes);
app.use('/api/finance', authRequired, emailVerifiedRequired, requireAppAccess, financeRoutes);
app.use('/api/football', authRequired, emailVerifiedRequired, requireAppAccess, footballRoutes);
app.use('/api/reports', authRequired, emailVerifiedRequired, requireAppAccess, reportsRoutes);
app.use('/api/workout-library', authRequired, emailVerifiedRequired, requireAppAccess, workoutLibraryRoutes);
app.use('/api/premium', authRequired, emailVerifiedRequired, requireAppAccess, premiumRoutes);
app.use('/api/intelligence', authRequired, emailVerifiedRequired, requireAppAccess, intelligenceRoutes);
app.use('/api/student-portal', studentPortalRoutes);
app.use('/api/admin', authRequired, emailVerifiedRequired, adminRoutes);

app.use(errorHandler);

export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(env.port, () => {
    logger.info('TrainFlow API running.', { port: env.port });
  });
}

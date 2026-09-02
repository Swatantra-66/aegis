const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config/index');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const { setupSwagger } = require('./config/swagger');
const AppError = require('./utils/AppError');

// Import routes
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const rolesRoutes = require('./modules/roles/roles.routes');
const mfaRoutes = require('./modules/mfa/mfa.routes');
const auditRoutes = require('./modules/audit/audit.routes');

/**
 * Express application assembly.
 * Wires up middleware and routes in the correct order.
 * Does NOT call listen() — allows supertest to import without port conflicts.
 */
const app = express();

// Enable trust proxy for reverse proxy environments (Nginx, DigitalOcean Load Balancers)
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.app.url,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging
app.use(requestLogger);

// API Documentation
if (config.env !== 'test') {
  setupSwagger(app);
}

// Health Check
app.get('/health', async (req, res) => {
  const db = require('./config/database');
  const redis = require('./config/redis');

  const [dbHealth, redisHealth] = await Promise.all([db.healthCheck(), redis.healthCheck()]);

  const status = dbHealth && redisHealth ? 'healthy' : 'degraded';
  const statusCode = status === 'healthy' ? 200 : 503;

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealth ? 'connected' : 'disconnected',
      redis: redisHealth ? 'connected' : 'disconnected',
    },
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/roles', rolesRoutes);
app.use('/api/v1/mfa', mfaRoutes);
app.use('/api/v1/audit', auditRoutes);

// 404 Handler
app.use((req, res, next) => {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;

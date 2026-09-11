const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

// Load .env file before validation
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Strict Joi schema for environment variable validation.
 * The server REFUSES to start if any required variable is missing or invalid.
 */
const envSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  APP_NAME: Joi.string().default('IAM-Portal'),
  APP_URL: Joi.string().uri().default('http://localhost:3000'),

  // PostgreSQL
  DB_HOST: Joi.string().required().messages({
    'any.required': 'DB_HOST is required (e.g., "localhost")',
  }),
  DB_PORT: Joi.number().port().default(5432),
  DB_NAME: Joi.string().required().messages({
    'any.required': 'DB_NAME is required (e.g., "iam_portal")',
  }),
  DB_USER: Joi.string().required().messages({
    'any.required': 'DB_USER is required (e.g., "postgres")',
  }),
  DB_PASSWORD: Joi.string().required().allow('').messages({
    'any.required': 'DB_PASSWORD is required',
  }),

  // Redis
  REDIS_URL: Joi.string().required().messages({
    'any.required': 'REDIS_URL is required (e.g., "redis://localhost:6379")',
  }),

  // JWT
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET must be at least 32 characters for security',
    'any.required': 'JWT_SECRET is required',
  }),
  JWT_REFRESH_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_REFRESH_SECRET must be at least 32 characters for security',
    'any.required': 'JWT_REFRESH_SECRET is required',
  }),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),

  // MFA
  MFA_ENCRYPTION_KEY: Joi.string().min(32).required().messages({
    'string.min': 'MFA_ENCRYPTION_KEY must be at least 32 characters for security',
    'any.required': 'MFA_ENCRYPTION_KEY is required',
  }),

  // Email & SMTP
  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.number().allow('').default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASS: Joi.string().allow('').default(''),
  EMAIL_FROM: Joi.string().default('AEGIS Security <aegisiamsecurity@gmail.com>'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),

  // Google Gmail REST API (HTTPS Port 443 — DigitalOcean Compatible)
  GMAIL_CLIENT_ID: Joi.string().empty(''),
  GMAIL_CLIENT_SECRET: Joi.string().empty(''),
  GMAIL_REFRESH_TOKEN: Joi.string().empty(''),
  GMAIL_USER: Joi.string().empty(''),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('debug'),
})
  .and('GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN')
  .unknown(); // Allow system vars (PATH, HOME, etc.)

const { error, value: envVars } = envSchema.validate(process.env, {
  abortEarly: false, // Report ALL missing vars, not just the first
});

if (error) {
  console.error('\nEnvironment validation failed:\n');
  error.details.forEach((detail) => {
    console.error(`  → ${detail.message}`);
  });
  console.error('\n  See .env.example for required variables.\n');
  process.exit(1);
}

/**
 * Validated and frozen configuration object.
 * Import this module instead of accessing process.env directly.
 */
const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  app: {
    name: envVars.APP_NAME,
    url: envVars.APP_URL,
  },
  db: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    name: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
  },
  redis: {
    url: envVars.REDIS_URL,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    accessExpiry: envVars.JWT_ACCESS_EXPIRY,
    refreshExpiry: envVars.JWT_REFRESH_EXPIRY,
  },
  mfa: {
    encryptionKey: envVars.MFA_ENCRYPTION_KEY,
  },
  email: {
    smtpHost: envVars.SMTP_HOST,
    smtpPort: envVars.SMTP_PORT,
    smtpSecure: envVars.SMTP_SECURE,
    smtpUser: envVars.SMTP_USER,
    smtpPass: envVars.SMTP_PASS,
    from: envVars.EMAIL_FROM,
    frontendUrl: envVars.FRONTEND_URL,
    gmailClientId: envVars.GMAIL_CLIENT_ID || '',
    gmailClientSecret: envVars.GMAIL_CLIENT_SECRET || '',
    gmailRefreshToken: envVars.GMAIL_REFRESH_TOKEN || '',
    gmailUser: envVars.GMAIL_USER || '',
  },
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
  },
  logging: {
    level: envVars.LOG_LEVEL,
  },
};

// Freeze to prevent runtime mutation
Object.freeze(config);
Object.freeze(config.app);
Object.freeze(config.db);
Object.freeze(config.redis);
Object.freeze(config.jwt);
Object.freeze(config.mfa);
Object.freeze(config.email);
Object.freeze(config.rateLimit);
Object.freeze(config.logging);

module.exports = config;

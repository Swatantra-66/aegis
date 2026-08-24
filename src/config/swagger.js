const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('./index');

/**
 * OpenAPI 3.0 specification generated from JSDoc annotations
 * in route files. Serves interactive Swagger UI at /api/docs.
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'IAM Portal API',
      version: '1.0.0',
      description:
        'Identity & Access Management Portal — OAuth 2.0, JWT, RBAC, MFA, and audit logging.',
      contact: {
        name: 'IAM Portal',
      },
    },
    servers: [
      {
        url: config.app.url,
        description: config.env === 'production' ? 'Production' : 'Development',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            statusCode: { type: 'integer', example: 400 },
            message: { type: 'string', example: 'Validation error' },
            errors: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 5 },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.routes.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Mount Swagger UI middleware on an Express app.
 * @param {import('express').Application} app
 */
const setupSwagger = (app) => {
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'IAM Portal API Docs',
    })
  );

  // Serve raw JSON spec
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

module.exports = { setupSwagger, swaggerSpec };

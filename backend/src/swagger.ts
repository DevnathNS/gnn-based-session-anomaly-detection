import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Adaptive Session Trust Enforcement API',
      version: '1.0.0',
      description:
        'Demo endpoints with trust-score-based access control. '
    },
    servers: [{ url: 'http://localhost:3000' }],
    tags: [
      { name: 'Public',   description: 'No authentication required' },
      { name: 'User',     description: 'Requires login' },
      { name: 'Admin',    description: 'High trust required' },
      { name: 'Sensitive',description: 'Highest trust required' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

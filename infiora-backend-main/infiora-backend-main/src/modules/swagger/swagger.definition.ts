import config from '../../config/config';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Infiora API',
    version: '1.0.0',
    description: 'Authoritative Node API for the active Infiora workspace.',
  },
  servers: [
    {
      url: `http://localhost:${config.port}/v1`,
      description: 'Active local development server',
    },
  ],
};

export default swaggerDefinition;

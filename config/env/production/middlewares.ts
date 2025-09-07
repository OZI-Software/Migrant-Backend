// config/env/production/middlewares.js
module.exports = ({ env }) => ({
    settings: {
      cors: {
        enabled: true,
        origin: ['https://your-production-domain.com', 'https://admin.your-domain.com'],
        headers: ['*'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
        credentials: true,
      },
    },
  });
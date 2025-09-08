// config/env/production/middlewares.js
module.exports = ({ env }) => ({
    settings: {
      cors: {
        enabled: true,
        origin: ['https://migrant-beige.vercel.app'],
        headers: ['*'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
        credentials: true,
      },
    },
  });
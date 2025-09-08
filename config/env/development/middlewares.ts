// config/env/development/middlewares.ts
module.exports = ({ env }) => ({
    settings: {
      cors: {
        enabled: true,
        origin: ['http://localhost:1337', 'http://localhost:3000', 'http://localhost:8000','https://migrant-beige.vercel.app'],
        headers: ['*'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
        credentials: true,
      },
    },
  });
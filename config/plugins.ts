// config/plugins.ts
export default ({ env }) => ({
  'ai-text-generation': {
    enabled: true,
    config: {
      openaiApiKey: env("OPEN_AI_API_TOKEN"),
    },
    resolve: "./src/plugins/ai-text-generation",
  },
  documentation: {
    enabled: true,
    config: {
      openapi: '3.0.0',
      info: {
        version: '1.0.0',
        title: 'Strapi API Documentation',
        description: 'Documentation for Strapi API',
        termsOfService: 'https://example.com/terms',
        contact: {
          name: 'API Support',
          email: 'support@example.com',
          url: 'https://example.com/contact'
        },
        license: {
          name: 'Apache 2.0',
          url: 'https://www.apache.org/licenses/LICENSE-2.0.html'
        },
      },
      'x-strapi-config': {
        plugins: ['upload', 'users-permissions'],
        path: '/documentation',
      },
      servers: [
        {
          url: env('API_URL', 'http://localhost:1337'),
          description: 'Development server',
        },
      ],
      externalDocs: {
        description: 'Find out more',
        url: 'https://docs.strapi.io/developer-docs/latest/getting-started/introduction.html',
      },
      security: [{
        bearerAuth: []
      }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          }
        }
      },
    },
  },
});
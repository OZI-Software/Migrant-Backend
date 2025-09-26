// config/middlewares.ts
export default [
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:', 'http:'],
          'img-src': ["'self'", 'data:', 'blob:', 'cdn.jsdelivr.net', 'strapi.io', 'res.cloudinary.com'],
          'media-src': ["'self'", 'data:', 'blob:', 'res.cloudinary.com'],
          'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'font-src': ["'self'", 'data:', 'blob:'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      headers: ['*'],
      origin: ['http://localhost:1337', 'http://localhost:3000', 'http://localhost:8000', 'https://migrant-beige.vercel.app', 'https://theimmigrant.com.au', 'https://www.theimmigrant.com.au'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      credentials: true
    }
  },
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  {
    name: 'strapi::public',
    config: {
      defaultIndex: false,
      maxAge: 31536000,
      path: './public',
      prefix: '/public',
      static: {
        etag: true,
        maxAge: 31536000,
        immutable: true,
      },
    },
  },
  'strapi::errors',
  'strapi::poweredBy',
  'strapi::logger',
];
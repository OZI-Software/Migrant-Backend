export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  // Add static file serving configuration
  serveStatic: {
    enabled: true,
    maxAge: 31536000,
    // Add MIME type overrides
    mimeTypes: {
      'text/css': ['css'],
      'application/javascript': ['js', 'mjs'],
      'image/svg+xml': ['svg'],
      'font/woff': ['woff'],
      'font/woff2': ['woff2'],
      'application/font-woff': ['woff'],
      'application/font-woff2': ['woff2'],
      'application/vnd.ms-fontobject': ['eot'],
      'font/opentype': ['otf'],
      'application/x-font-ttf': ['ttf'],
    }
  },
  // Add response headers
  response: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'Content-Type': 'text/javascript; charset=utf-8',
    },
  },
});

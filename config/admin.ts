export default ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  // Enhanced webpack configuration
  webpack: (config, webpack) => {
    // Remove the existing CSS rule if it exists to avoid conflicts
    config.module.rules = config.module.rules.filter(rule => 
      !rule.test?.toString().includes('css')
    );

    // Add proper CSS handling
    config.module.rules.push({
      test: /\.css$/,
      use: [
        {
          loader: 'style-loader',
          options: {
            injectType: 'singletonStyleTag'
          }
        },
        {
          loader: 'css-loader',
          options: {
            modules: false,
            sourceMap: true,
            esModule: false // Important for CSS files
          }
        }
      ]
    });

    // Configure output
    config.output = {
      ...config.output,
      filename: 'bundle.js',
      chunkFilename: '[name].bundle.js',
      publicPath: '/admin/',
    };

    // Add resolve aliases for version conflicts
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-router-dom': require.resolve('react-router-dom'),
      'react': require.resolve('react'),
      'react-dom': require.resolve('react-dom'),
      '@strapi/design-system': require.resolve('@strapi/design-system'),
      '@strapi/icons': require.resolve('@strapi/icons'),
    };

    // Add externals configuration
    config.externals = {
      ...config.externals,
      'react-router-dom': 'ReactRouterDOM',
      'react': 'React',
      'react-dom': 'ReactDOM',
    };

    return config;
  },
  // Admin-specific configuration
  admin: {
    path: '/admin',
    build: {
      backend: env('PUBLIC_ADMIN_URL', '/admin'),
    },
    watchIgnoreFiles: ['**/admin/**'],
  },
  // Security headers
  security: {
    xss: {
      enabled: true,
      mode: 'block',
    },
    csp: {
      enabled: true,
      policy: [
        {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          'style-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Added unsafe-eval for CSS
          'img-src': ["'self'", 'data:', 'blob:'],
          'font-src': ["'self'", 'data:'],
          'connect-src': ["'self'", 'https:'],
          'media-src': ["'self'"],
          'frame-src': ["'self'"],
        },
      ],
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY'),
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
});
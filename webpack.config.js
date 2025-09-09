'use strict';

module.exports = (config, webpack) => {
  // Add a rule to handle CSS files
  config.module.rules.push({
    test: /\.css$/,
    use: [
      'style-loader',
      {
        loader: 'css-loader',
        options: {
          modules: false,
          sourceMap: true,
        },
      },
    ],
  });

  // Ensure proper MIME types for JavaScript files
  config.output = {
    ...config.output,
    filename: 'bundle.js',
    chunkFilename: '[name].bundle.js',
    publicPath: '/',
  };

  // Add MIME type for JavaScript files
  config.devServer = {
    ...config.devServer,
    headers: {
      'Content-Type': 'application/javascript',
    },
  };

  return config;
};

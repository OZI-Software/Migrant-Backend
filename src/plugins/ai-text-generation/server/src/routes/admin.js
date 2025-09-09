// Path: ./src/plugins/ai-text-generation/server/src/routes/admin.js

'use strict';

module.exports = [
  {
    method: 'POST',
    path: '/generate',
    handler: 'textGenerationController.generate',
    config: {
      auth: {
        scope: ['admin']
      },
      policies: [],
      middlewares: [],
    },
  },
  {
    method: 'GET',
    path: '/status',
    handler: 'textGenerationController.getStatus',
    config: {
      auth: {
        scope: ['admin']
      },
      policies: [],
      middlewares: [],
    },
  },
];
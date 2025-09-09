'use strict';

module.exports = ({ strapi }) => {
  strapi.customFields.register({
    name: 'text-ai',
    plugin: 'ai-text-generation',
    type: 'string',
    inputSize: {
      default: 6,
      isResizable: true,
    },
  });
};
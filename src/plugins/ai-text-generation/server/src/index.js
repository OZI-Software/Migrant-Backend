// Path: ./src/plugins/ai-text-generation/server/src/index.js

"use strict";

const services = require("./services");
const controllers = require("./controllers");
const routes = require("./routes");
const adminRoutes = require("./routes/admin");

module.exports = {
  services,
  controllers,
  routes: {
    'content-api': {
      type: 'content-api',
      routes: routes
    },
    'admin': {
      type: 'admin',
      routes: adminRoutes
    }
  },

  register({ strapi }) {
    // Register the custom field on the server
    strapi.customFields.register({
      name: "ai-text-generator",
      plugin: "ai-text-generation",
      type: "text",
      inputSize: {
        default: 6,
        isResizable: true,
      },
    });
  },

  bootstrap({ strapi }) {
    // Initialize the text generation service
    const textGenerationService = strapi
      .plugin("ai-text-generation")
      .service("textGenerationService");
    
    textGenerationService.init();

    strapi.log.info("AI Text Generation plugin bootstrapped successfully");
  },
};
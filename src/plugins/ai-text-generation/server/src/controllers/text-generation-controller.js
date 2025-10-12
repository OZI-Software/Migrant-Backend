// Path: ./src/plugins/ai-text-generation/server/src/controllers/text-generation-controller.js

"use strict";

module.exports = ({ strapi }) => ({
  async generate(ctx) {
    try {
      const {
        prompt,
        model = 'gpt-3.5-turbo',
        temperature = 0.7,
        maxTokens = 250,
      } = ctx.request.body;

      // Validate required parameters
      if (!prompt || prompt.trim().length === 0) {
        return ctx.badRequest("Prompt is required");
      }

      // Validate parameters
      if (temperature < 0 || temperature > 2) {
        return ctx.badRequest("Temperature must be between 0 and 2");
      }

      if (maxTokens < 1 || maxTokens > 1000) {
        return ctx.badRequest("Max tokens must be between 1 and 1000");
      }

      const textGenerationService = strapi
        .plugin("ai-text-generation")
        .service("textGenerationService");

      const result = await textGenerationService.generateText({
        prompt,
        model,
        temperature,
        maxTokens,
      });

      ctx.body = {
        success: true,
        data: result,
      };
    } catch (error) {
      strapi.log.error("Text generation API error:", error.message);
      return ctx.badRequest(error.message);
    }
  },

  async getStatus(ctx) {
    try {
      const textGenerationService = strapi
        .plugin("ai-text-generation")
        .service("textGenerationService");

      // Check if the service is properly initialized
      const isInitialized = textGenerationService.genAI && textGenerationService.model;
      const hasApiKey = !!process.env.OPEN_AI_API_TOKEN;

      ctx.body = {
        success: true,
        data: {
          initialized: isInitialized,
          hasApiKey: hasApiKey,
          model: 'gemini-pro',
          status: isInitialized && hasApiKey ? 'ready' : 'not_ready',
        },
      };
    } catch (error) {
      strapi.log.error("Status check error:", error.message);
      return ctx.badRequest(error.message);
    }
  },
});
// Path: ./src/plugins/ai-text-generation/server/src/services/text-generation-service.js

'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = ({ strapi }) => ({

  init() {
    const config = strapi.plugin('ai-text-generation').config;
    
    if (!process.env.OPEN_AI_API_TOKEN) {
       throw new Error('Google Gemini API key is required for ai-text-generation plugin');
     }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
     this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    strapi.log.info('AI Text Generation service initialized');
  },

  preprocessText(text) {
    if (!text) return '';

    // Clean and limit text for safety
    const cleaned = text
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Limit to 4000 characters for safety
    return cleaned.substring(0, 4000);
  },

  async generateText(params) {
    if (!params.prompt || params.prompt.trim().length === 0) {
      throw new Error('Prompt is required for text generation');
    }

    const processedPrompt = this.preprocessText(params.prompt);
    
    try {
      const prompt = `You are a helpful content writer. Generate clear, engaging, and appropriate content based on the user's prompt: ${processedPrompt}`;
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const generatedText = response.text().trim();

      strapi.log.debug(`Generated text: ${generatedText.length} characters`);

      return {
        text: generatedText,
        usage: response.usageMetadata || {},
        model: params.model || 'gemini-pro',
        processedPrompt,
        originalPrompt: params.prompt
      };

    } catch (error) {
      strapi.log.error('Google Gemini text generation failed:', error.message);
      strapi.log.error('Google Gemini error details:', {
        status: error.status,
        code: error.code,
        type: error.type,
        response: error.response?.data || 'No response data'
      });
      
      // Handle common Google Gemini errors
      if (error.status === 401) {
        throw new Error('Invalid Google Gemini API key');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later');
      } else if (error.status === 400) {
        throw new Error('Invalid request parameters');
      }
      
      throw new Error(`Text generation failed: ${error.message}`);
    }
  }
});
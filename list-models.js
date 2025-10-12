require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found');
      return;
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const models = await genAI.listModels();
    
    console.log('Available Gemini models:');
    models.forEach(model => {
      console.log(`- ${model.name} (supports: ${model.supportedGenerationMethods?.join(', ')})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listModels();
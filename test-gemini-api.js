const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGeminiAPI() {
  console.log('🔑 Testing Gemini API Configuration');
  console.log('==================================================');
  
  // Check if API key exists
  const apiKey = process.env.OPEN_AI_API_TOKEN;
  console.log('API Key exists:', !!apiKey);
  console.log('API Key length:', apiKey ? apiKey.length : 0);
  console.log('API Key prefix:', apiKey ? apiKey.substring(0, 10) + '...' : 'Not found');
  
  if (!apiKey) {
    console.error('❌ OPEN_AI_API_TOKEN not found in environment variables');
    return;
  }
  
  try {
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    
    console.log('✅ Gemini AI initialized successfully');
    
    // Test with the correct model name
    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-pro'
    ];
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`\n🧪 Testing model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent('Say "Hello, AI is working!" in JSON format: {"message": "your response"}');
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ ${modelName} works! Response:`, text.substring(0, 200) + '...');
        
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(text);
          console.log('✅ JSON parsing successful for', modelName);
          console.log('Parsed response:', parsed);
          break; // Found working model
        } catch (parseError) {
          console.log(`⚠️  ${modelName} response is not valid JSON, but API is working`);
          console.log('Raw response:', text);
        }
        
      } catch (error) {
        console.log(`❌ ${modelName} failed:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Gemini API test failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
  }
}

testGeminiAPI().catch(console.error);
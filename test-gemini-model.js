require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiModel() {
  console.log('🧪 Testing gemini-2.0-flash-exp model...');
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('❌ No GEMINI_API_KEY found');
    return;
  }
  
  console.log('API Key:', apiKey.substring(0, 10) + '...');
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
    
    console.log('🔌 Model initialized successfully');
    
    const result = await model.generateContent('Hello, can you respond with "AI is working"?');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Model test successful!');
    console.log('Response:', text);
    
  } catch (error) {
    console.log('❌ Model test failed:', error.message);
    
    // Try alternative models
    const alternativeModels = [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro',
      'gemini-1.0-pro'
    ];
    
    for (const modelName of alternativeModels) {
      try {
        console.log(`🔄 Trying ${modelName}...`);
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent('Hello, can you respond with "AI is working"?');
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ ${modelName} works!`);
        console.log('Response:', text);
        break;
        
      } catch (altError) {
        console.log(`❌ ${modelName} failed:`, altError.message);
      }
    }
  }
}

testGeminiModel().catch(console.error);
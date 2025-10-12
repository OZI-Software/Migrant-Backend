require('dotenv').config();
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

async function simpleTest() {
  console.log('🧪 Simple Gemini API test...');
  
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'Not found');
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found');
    return;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try the most basic model first
    console.log('🔌 Initializing with basic model...');
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    console.log('🚀 Sending simple test prompt...');
    const prompt = "Hello, can you respond with just 'Working!' if you receive this?";
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Response received:', text);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Check if it's an authentication error
    if (error.message.includes('API_KEY')) {
      console.error('🔑 This appears to be an API key issue');
      console.error('📝 Please verify your GEMINI_API_KEY in the .env file');
    } else if (error.message.includes('404')) {
      console.error('🔍 Model not found - trying alternative models...');
      
      // Try other model names
      const alternativeModels = ['gemini-1.0-pro', 'gemini-1.5-pro', 'text-bison-001'];
      for (const modelName of alternativeModels) {
        try {
          console.log(`🔄 Trying ${modelName}...`);
          const altModel = genAI.getGenerativeModel({ model: modelName });
          const altResult = await altModel.generateContent("Test");
          console.log(`✅ ${modelName} works!`);
          break;
        } catch (altError) {
          console.log(`❌ ${modelName} failed`);
        }
      }
    }
  }
}

simpleTest();
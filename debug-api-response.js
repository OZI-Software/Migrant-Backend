const axios = require('axios');

async function debugAPIResponse() {
  console.log('🔍 Debugging API Response Format');
  
  const testData = {
    title: "Test Article",
    url: "https://example.com/test",
    content: "This is a test article content for debugging the API response format."
  };
  
  try {
    console.log('📤 Sending request to API...');
    console.log('📋 Request data:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post(
      'http://localhost:1337/api/news-feed/test-ai-extraction',
      testData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('\n✅ Response received!');
    console.log('📊 Status:', response.status);
    console.log('📋 Headers:', JSON.stringify(response.headers, null, 2));
    console.log('📄 Response data type:', typeof response.data);
    console.log('📄 Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data) {
      console.log('\n🔍 Analyzing response structure:');
      console.log('   - Has success property:', 'success' in response.data);
      console.log('   - Has content property:', 'content' in response.data);
      console.log('   - Has quality property:', 'quality' in response.data);
      console.log('   - Response keys:', Object.keys(response.data));
    }
    
  } catch (error) {
    console.log('\n❌ Request failed:');
    console.log('   - Error type:', error.constructor.name);
    console.log('   - Error message:', error.message);
    
    if (error.response) {
      console.log('   - Response status:', error.response.status);
      console.log('   - Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.code) {
      console.log('   - Error code:', error.code);
    }
  }
}

debugAPIResponse();
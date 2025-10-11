const axios = require('axios');

async function testAIExtraction() {
  console.log('🤖 Testing AI Content Extraction');
  console.log('=' .repeat(50));

  try {
    // Test with a simple Science article import
    console.log('📡 Sending request to import Science articles...');
    
    const response = await axios.post('http://localhost:1337/api/news-feed/import', {
      categories: ['Science'],
      maxArticlesPerCategory: 1
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 300000 // 5 minute timeout for AI processing
    });

    console.log('✅ Response received:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n📊 Import Results:');
      console.log(`- Imported: ${response.data.data.imported}`);
      console.log(`- Skipped: ${response.data.data.skipped}`);
      console.log(`- Errors: ${response.data.data.errors}`);
      
      if (response.data.data.errors > 0) {
        console.log('\n⚠️  There were errors during import. Check server logs for details.');
      } else if (response.data.data.imported > 0) {
        console.log('\n🎉 AI extraction test successful!');
      } else {
        console.log('\n🤔 No articles were imported. This might be due to duplicates or other issues.');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAIExtraction();
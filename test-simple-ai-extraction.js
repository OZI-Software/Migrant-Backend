const axios = require('axios');

const BASE_URL = 'http://localhost:1337';

// Simple test function for AI extraction
async function testAIExtraction() {
  console.log('🚀 Starting Simple AI Extraction Test');
  console.log('============================================================');
  console.log(`📅 Test started at: ${new Date().toLocaleString()}`);
  
  const category = 'Science';
  
  try {
    console.log(`🔍 Testing AI extraction for category: ${category}`);
    console.log(`📥 Triggering manual import for ${category}...`);
    
    const response = await axios.post(`${BASE_URL}/api/news-feed/import`, {
      categories: [category],
      maxArticlesPerCategory: 3
    }, {
      timeout: 300000, // 5 minutes timeout for AI processing
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ ${category} - Success!`);
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Data:`, JSON.stringify(response.data, null, 2));
    
    // Check if articles were processed
    if (response.data) {
      const { articlesImported = 0, articlesSkipped = 0, errors = 0 } = response.data;
      console.log(`\n📈 Results Summary:`);
      console.log(`   ✅ Articles Imported: ${articlesImported}`);
      console.log(`   ⏭️  Articles Skipped: ${articlesSkipped}`);
      console.log(`   ❌ Errors: ${errors}`);
      
      if (articlesImported > 0) {
        console.log(`\n🎉 SUCCESS: AI extraction processed ${articlesImported} articles!`);
        
        // Verify articles in database
        await verifyArticlesInDatabase();
      } else {
        console.log(`\n⚠️  WARNING: No articles were imported. Check server logs for details.`);
      }
    }
    
  } catch (error) {
    console.log(`❌ ${category} - Error Details:`);
    console.log(`   Message: ${error.message}`);
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Status Text: ${error.response?.statusText}`);
    
    if (error.response?.data) {
      console.log(`   Response Data:`, JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log(`\n💡 TIP: Make sure the Strapi server is running on ${BASE_URL}`);
    }
  }
}

// Function to verify articles were created in database
async function verifyArticlesInDatabase() {
  console.log('\n🔍 Verifying articles in database...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/articles?pagination[limit]=10&sort=createdAt:desc`, {
      timeout: 30000
    });
    
    const articles = response.data.data || [];
    console.log(`📊 Recent articles found: ${articles.length}`);
    
    if (articles.length > 0) {
      console.log('\n📰 Recent Articles:');
      articles.slice(0, 3).forEach((article, index) => {
        console.log(`   ${index + 1}. ${article.attributes.title}`);
        console.log(`      Category: ${article.attributes.category}`);
        console.log(`      Created: ${new Date(article.attributes.createdAt).toLocaleString()}`);
        console.log(`      Content Length: ${article.attributes.content?.length || 0} chars`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.log(`❌ Error verifying articles: ${error.message}`);
    if (error.response?.status === 403) {
      console.log(`💡 TIP: Articles endpoint might require authentication`);
    }
  }
}

// Run the test
testAIExtraction().then(() => {
  console.log('\n🏁 Test completed!');
}).catch((error) => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
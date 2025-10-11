const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:1337';
const CATEGORIES = [
  'Science',
  'Politics',
  'Sports',
  'World'
];

// Function to check if server is ready
async function waitForServer(maxAttempts = 10, delay = 3000) {
  console.log('🔍 Checking server readiness...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Try the health check endpoint first, then fallback to root
      const response = await axios.get(`${BASE_URL}/_health`, {
        timeout: 5000
      }).catch(() => axios.get(`${BASE_URL}/`, {
        timeout: 5000
      }));
      console.log(`✅ Server is ready! (attempt ${attempt}/${maxAttempts})`);
      return true;
    } catch (error) {
      console.log(`⏳ Server not ready yet (attempt ${attempt}/${maxAttempts}): ${error.message}`);
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error('Server is not ready after maximum attempts');
}

// Helper function to add delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to format results
const formatResults = (results) => {
  const summary = {
    totalCategories: results.length,
    totalArticlesProcessed: results.reduce((sum, r) => sum + r.articlesProcessed, 0),
    totalArticlesCreated: results.reduce((sum, r) => sum + r.articlesCreated, 0),
    totalErrors: results.reduce((sum, r) => sum + r.errors, 0),
    successRate: 0
  };
  
  if (summary.totalArticlesProcessed > 0) {
    summary.successRate = ((summary.totalArticlesCreated / summary.totalArticlesProcessed) * 100).toFixed(2);
  }
  
  return summary;
};

// Function to test AI extraction for a specific category
async function testCategoryAIExtraction(category) {
  console.log(`\n🔍 Testing AI extraction for category: ${category}`);
  console.log('=' .repeat(50));
  
  try {
    // Trigger manual import for the category
    console.log(`📥 Triggering manual import for ${category}...`);
    const response = await axios.post(`${BASE_URL}/api/news-feed/import`, {
      category: category,
      useAI: true,
      maxArticles: 5 // Limit to 5 articles per category for testing
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 600000 // 10 minute timeout for AI processing
    });

    console.log(`✅ ${category} - Status: ${response.status}`);
    console.log(`📊 ${category} - Response:`, JSON.stringify(response.data, null, 2));
    
    return {
      category,
      success: true,
      articlesProcessed: response.data.articlesProcessed || 0,
      articlesCreated: response.data.articlesImported || 0,
      articlesSkipped: response.data.articlesSkipped || 0,
      errors: response.data.errors || 0,
      details: response.data
    };
    
  } catch (error) {
    console.log(`❌ ${category} - Error Details:`);
    console.log(`   Message: ${error.message}`);
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Status Text: ${error.response?.statusText}`);
    console.log(`   Response Data:`, error.response?.data);
    console.log(`   Full Error:`, error);
    
    return {
      category,
      success: false,
      articlesProcessed: 0,
      articlesCreated: 0,
      articlesSkipped: 0,
      errors: 1,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data
    };
  }
}

// Function to verify articles were created in database
async function verifyArticlesInDatabase() {
  console.log('\n🔍 Verifying articles in database...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/articles?pagination[limit]=100&sort=createdAt:desc`, {
      timeout: 30000
    });
    
    const articles = response.data.data || [];
    console.log(`📊 Total articles in database: ${articles.length}`);
    
    // Group articles by category
    const articlesByCategory = {};
    articles.forEach(article => {
      const category = article.attributes.category?.data?.attributes?.name || 'Unknown';
      if (!articlesByCategory[category]) {
        articlesByCategory[category] = [];
      }
      articlesByCategory[category].push(article);
    });
    
    console.log('\n📈 Articles by category:');
    Object.entries(articlesByCategory).forEach(([category, categoryArticles]) => {
      console.log(`  ${category}: ${categoryArticles.length} articles`);
      
      // Show sample article details
      if (categoryArticles.length > 0) {
        const sampleArticle = categoryArticles[0];
        const attrs = sampleArticle.attributes;
        console.log(`    Sample: "${attrs.title?.substring(0, 60)}..."`);
        console.log(`    Content length: ${attrs.content?.length || 0} characters`);
        console.log(`    AI Enhanced: ${attrs.aiEnhanced ? 'Yes' : 'No'}`);
        console.log(`    Created: ${new Date(attrs.createdAt).toLocaleString()}`);
      }
    });
    
    return {
      totalArticles: articles.length,
      articlesByCategory,
      recentArticles: articles.slice(0, 5).map(a => ({
        title: a.attributes.title,
        category: a.attributes.category?.data?.attributes?.name,
        aiEnhanced: a.attributes.aiEnhanced,
        contentLength: a.attributes.content?.length || 0,
        createdAt: a.attributes.createdAt
      }))
    };
    
  } catch (error) {
    console.error('❌ Error verifying articles:', error.message);
    return null;
  }
}

// Main test function
async function runComprehensiveAITest() {
  console.log('🚀 Starting Comprehensive AI Extraction Test');
  console.log('=' .repeat(60));
  console.log(`📅 Test started at: ${new Date().toLocaleString()}`);
  console.log(`🎯 Testing ${CATEGORIES.length} categories with AI extraction`);
  console.log(`⏱️  Estimated time: ${CATEGORIES.length * 2} minutes`);
  
  // Wait for server to be ready
  try {
    await waitForServer();
  } catch (error) {
    console.error('❌ Server is not ready:', error.message);
    process.exit(1);
  }
  
  const results = [];
  
  // Test each category
  for (let i = 0; i < CATEGORIES.length; i++) {
    const category = CATEGORIES[i];
    console.log(`\n📍 Progress: ${i + 1}/${CATEGORIES.length}`);
    
    const result = await testCategoryAIExtraction(category);
    results.push(result);
    
    // Add delay between categories to avoid overwhelming the server
    if (i < CATEGORIES.length - 1) {
      console.log('⏳ Waiting 30 seconds before next category...');
      await delay(30000);
    }
  }
  
  // Generate summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 COMPREHENSIVE TEST SUMMARY');
  console.log('=' .repeat(60));
  
  const summary = formatResults(results);
  console.log(`✅ Categories tested: ${summary.totalCategories}`);
  console.log(`📝 Total articles processed: ${summary.totalArticlesProcessed}`);
  console.log(`✨ Total articles created: ${summary.totalArticlesCreated}`);
  console.log(`❌ Total errors: ${summary.totalErrors}`);
  console.log(`📈 Success rate: ${summary.successRate}%`);
  
  // Show detailed results per category
  console.log('\n📋 Detailed Results by Category:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.category}:`);
    console.log(`   Processed: ${result.articlesProcessed}, Created: ${result.articlesCreated}, Errors: ${result.errors}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  // Verify database state
  console.log('\n' + '=' .repeat(60));
  console.log('🗄️  DATABASE VERIFICATION');
  console.log('=' .repeat(60));
  
  const dbVerification = await verifyArticlesInDatabase();
  
  if (dbVerification) {
    console.log(`\n✅ Database verification completed successfully`);
    console.log(`📊 Total articles in database: ${dbVerification.totalArticles}`);
    
    if (dbVerification.recentArticles.length > 0) {
      console.log('\n🆕 Most recent articles:');
      dbVerification.recentArticles.forEach((article, index) => {
        console.log(`${index + 1}. "${article.title?.substring(0, 50)}..."`);
        console.log(`   Category: ${article.category}, AI Enhanced: ${article.aiEnhanced}`);
        console.log(`   Content: ${article.contentLength} chars, Created: ${new Date(article.createdAt).toLocaleString()}`);
      });
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎉 COMPREHENSIVE AI EXTRACTION TEST COMPLETED');
  console.log('=' .repeat(60));
  console.log(`📅 Test completed at: ${new Date().toLocaleString()}`);
  
  return {
    summary,
    results,
    dbVerification
  };
}

// Run the test
if (require.main === module) {
  runComprehensiveAITest()
    .then(testResults => {
      console.log('\n✅ Test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { runComprehensiveAITest, testCategoryAIExtraction, verifyArticlesInDatabase };
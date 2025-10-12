/**
 * Test script to verify AI extraction is working with the updated Gemini model
 */

const axios = require('axios');

async function testAIExtraction() {
  try {
    console.log('🧪 Testing AI extraction with updated Gemini model...');
    
    // Test with a simple news import
    const response = await axios.post('http://localhost:1337/api/news-feed/import', {
      categories: ['Science'],
      maxArticles: 1
    });

    console.log('✅ Import response status:', response.status);
    console.log('📊 Import results:', response.data);

    // Check if articles were created successfully
    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      console.log('\n📰 Article creation results:');
      console.log(`   Category: ${result.category}`);
      console.log(`   Imported: ${result.imported}`);
      console.log(`   Skipped: ${result.skipped}`);
      console.log(`   Errors: ${result.errors}`);
      
      if (result.imported > 0) {
        console.log('✅ AI extraction appears to be working!');
        
        // Fetch the created article to verify fields
        const articlesResponse = await axios.get('http://localhost:1337/api/articles?pagination[limit]=1&sort=createdAt:desc');
        
        if (articlesResponse.data.data && articlesResponse.data.data.length > 0) {
          const article = articlesResponse.data.data[0];
          console.log('\n📝 Latest article details:');
          console.log(`   Title: "${article.attributes.title || 'MISSING'}"`);
          console.log(`   Slug: "${article.attributes.slug || 'MISSING'}"`);
          console.log(`   Content length: ${article.attributes.content ? article.attributes.content.length : 0} chars`);
          console.log(`   Location: "${article.attributes.location || 'MISSING'}"`);
          console.log(`   Source URL: "${article.attributes.sourceUrl || 'MISSING'}"`);
          console.log(`   SEO Title: "${article.attributes.seoTitle || 'MISSING'}"`);
          console.log(`   SEO Description: "${article.attributes.seoDescription || 'MISSING'}"`);
          console.log(`   Tags: ${article.attributes.tags ? article.attributes.tags.length : 0} tags`);
          
          // Check for missing fields
          const missingFields = [];
          if (!article.attributes.title) missingFields.push('title');
          if (!article.attributes.slug) missingFields.push('slug');
          if (!article.attributes.content || article.attributes.content.length < 100) missingFields.push('content');
          if (!article.attributes.location) missingFields.push('location');
          if (!article.attributes.sourceUrl) missingFields.push('sourceUrl');
          
          if (missingFields.length > 0) {
            console.log(`\n❌ Missing or insufficient fields: ${missingFields.join(', ')}`);
          } else {
            console.log('\n✅ All required fields are present!');
          }
        }
      } else {
        console.log('❌ No articles were imported');
      }
    } else {
      console.log('❌ No import results received');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testAIExtraction();
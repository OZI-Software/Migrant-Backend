const axios = require('axios');

async function checkLatestArticle() {
  try {
    console.log('🔍 Checking Latest Created Article\n');
    
    // Get the most recent article from Strapi API (without authentication for now)
    const response = await axios.get('http://localhost:1337/api/articles?sort=createdAt:desc&pagination[limit]=1');
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      const article = response.data.data[0];
      const attrs = article.attributes;
      
      console.log('📰 Latest Article Details:');
      console.log('========================');
      console.log(`📝 Title: ${attrs.title || 'No title'}`);
      console.log(`📅 Created: ${new Date(attrs.createdAt).toLocaleString()}`);
      console.log(`📊 Content Length: ${attrs.content ? attrs.content.length : 0} characters`);
      console.log(`🏷️  Tags: ${attrs.tags ? attrs.tags.length : 0} tags`);
      console.log(`🖼️  Featured Image: ${attrs.featuredImage ? 'Yes' : 'No'}`);
      console.log(`🔗 Source URL: ${attrs.sourceUrl || 'No source'}`);
      console.log(`📊 Quality: ${attrs.quality || 'Not set'}`);
      console.log(`🤖 Extraction Method: ${attrs.extractionMethod || 'Not set'}`);
      console.log(`⏱️  Processing Time: ${attrs.processingTime || 'Not set'}ms`);
      console.log('');
      
      if (attrs.content && attrs.content.length > 0) {
        console.log('📖 Content Preview (first 200 chars):');
        console.log('=====================================');
        console.log(attrs.content.substring(0, 200) + '...');
        console.log('');
      }
      
      if (attrs.tags && attrs.tags.length > 0) {
        console.log('🏷️  Tags:');
        console.log('========');
        console.log(attrs.tags.join(', '));
        console.log('');
      }
      
      console.log('✅ Article successfully created with content and metadata!');
      
    } else {
      console.log('❌ No articles found in the database');
    }
    
  } catch (error) {
    console.error('❌ Error checking latest article:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

checkLatestArticle();
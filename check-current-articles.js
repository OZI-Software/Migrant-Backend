const axios = require('axios');

async function checkCurrentArticles() {
  try {
    console.log('🔍 Checking Current Articles in Database\n');
    
    // Get articles from Strapi API
    const response = await axios.get('http://localhost:1337/api/articles?populate=*&sort=createdAt:desc&pagination[limit]=10');
    
    if (response.data && response.data.data) {
      const articles = response.data.data;
      console.log(`📊 Found ${articles.length} recent articles:\n`);
      
      articles.forEach((article, index) => {
        const attrs = article.attributes;
        console.log(`${index + 1}. 📰 ${attrs.title || 'No title'}`);
        console.log(`   📅 Created: ${new Date(attrs.createdAt).toLocaleString()}`);
        console.log(`   📝 Content: ${attrs.content ? attrs.content.length : 0} characters`);
        console.log(`   🏷️  Tags: ${attrs.tags ? attrs.tags.length : 0} tags`);
        console.log(`   🖼️  Featured Image: ${attrs.featuredImage ? 'Yes' : 'No'}`);
        console.log(`   🔗 Source: ${attrs.sourceUrl || 'No source'}`);
        console.log(`   📊 Quality: ${attrs.quality || 'Not set'}`);
        console.log(`   🤖 Extraction Method: ${attrs.extractionMethod || 'Not set'}`);
        
        if (attrs.content && attrs.content.length > 0) {
          console.log(`   📖 Content Preview: ${attrs.content.substring(0, 100)}...`);
        }
        
        if (attrs.tags && attrs.tags.length > 0) {
          console.log(`   🏷️  Tags: ${attrs.tags.join(', ')}`);
        }
        
        console.log('');
      });
    } else {
      console.log('❌ No articles found or unexpected response format');
    }
    
  } catch (error) {
    console.error('❌ Error checking articles:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

checkCurrentArticles();
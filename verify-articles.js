const axios = require('axios');

const BASE_URL = 'http://localhost:1337/api';

async function verifyArticles() {
  console.log('🔍 Verifying created articles...\n');

  try {
    // Get all articles with populated relations
    const response = await axios.get(`${BASE_URL}/articles?populate=*&pagination[pageSize]=20&sort=createdAt:desc`);
    const articles = response.data.data;

    console.log(`📰 Found ${articles.length} articles\n`);

    if (articles.length === 0) {
      console.log('❌ No articles found. The import might have failed.');
      return;
    }

    // Group articles by category
    const articlesByCategory = {};
    articles.forEach(article => {
      const categoryName = article.attributes.category?.data?.attributes?.name || 'Uncategorized';
      if (!articlesByCategory[categoryName]) {
        articlesByCategory[categoryName] = [];
      }
      articlesByCategory[categoryName].push(article);
    });

    console.log('📊 Articles by Category:');
    Object.keys(articlesByCategory).forEach(category => {
      console.log(`   ${category}: ${articlesByCategory[category].length} articles`);
    });
    console.log();

    // Analyze recent articles in detail
    console.log('🔍 Detailed Analysis of Recent Articles:\n');
    
    for (let i = 0; i < Math.min(5, articles.length); i++) {
      const article = articles[i];
      const attrs = article.attributes;
      
      console.log(`📄 Article ${i + 1}: ${attrs.title}`);
      console.log(`   📅 Created: ${new Date(attrs.createdAt).toLocaleString()}`);
      console.log(`   🏷️  Category: ${attrs.category?.data?.attributes?.name || 'None'}`);
      console.log(`   👤 Author: ${attrs.author?.data?.attributes?.name || 'None'}`);
      console.log(`   🔗 Source URL: ${attrs.sourceUrl ? attrs.sourceUrl.substring(0, 80) + '...' : 'None'}`);
      console.log(`   📝 Content Length: ${attrs.content ? attrs.content.length : 0} characters`);
      console.log(`   📖 Excerpt: ${attrs.excerpt ? attrs.excerpt.substring(0, 100) + '...' : 'None'}`);
      console.log(`   🖼️  Featured Image: ${attrs.featuredImage?.data ? 'Yes' : 'No'}`);
      
      if (attrs.featuredImage?.data) {
        const image = attrs.featuredImage.data.attributes;
        console.log(`      Image URL: ${image.url}`);
        console.log(`      Image Size: ${image.size} KB`);
      }
      
      console.log(`   🏷️  Tags: ${attrs.tags?.data?.length || 0} tags`);
      if (attrs.tags?.data?.length > 0) {
        const tagNames = attrs.tags.data.map(tag => tag.attributes.name).join(', ');
        console.log(`      Tag Names: ${tagNames}`);
      }
      
      console.log(`   📍 Location: ${attrs.location || 'None'}`);
      console.log(`   ⏱️  Read Time: ${attrs.readTime || 'Unknown'} minutes`);
      console.log(`   📊 SEO Score: ${attrs.seoScore || 'Not calculated'}`);
      console.log();
    }

    // Check for fetchFullContent functionality
    console.log('🌐 fetchFullContent Verification:');
    const articlesWithContent = articles.filter(article => 
      article.attributes.content && article.attributes.content.length > 500
    );
    console.log(`   Articles with substantial content (>500 chars): ${articlesWithContent.length}/${articles.length}`);
    
    const articlesWithImages = articles.filter(article => 
      article.attributes.featuredImage?.data
    );
    console.log(`   Articles with featured images: ${articlesWithImages.length}/${articles.length}`);
    
    const articlesWithTags = articles.filter(article => 
      article.attributes.tags?.data?.length > 0
    );
    console.log(`   Articles with tags: ${articlesWithTags.length}/${articles.length}`);
    
    console.log();

    // Check category distribution
    console.log('📊 Category Distribution Analysis:');
    const expectedCategories = ['World', 'Politics', 'Economy', 'Science', 'Culture'];
    expectedCategories.forEach(category => {
      const count = articlesByCategory[category] ? articlesByCategory[category].length : 0;
      console.log(`   ${category}: ${count} articles`);
    });
    
    console.log();

    // Verify content model compliance
    console.log('✅ Content Model Compliance Check:');
    let compliance = true;
    
    articles.forEach((article, index) => {
      const attrs = article.attributes;
      
      // Check required fields
      if (!attrs.title) {
        console.log(`   ❌ Article ${index + 1}: Missing title`);
        compliance = false;
      }
      if (!attrs.slug) {
        console.log(`   ❌ Article ${index + 1}: Missing slug`);
        compliance = false;
      }
      if (!attrs.content) {
        console.log(`   ❌ Article ${index + 1}: Missing content`);
        compliance = false;
      }
      if (!attrs.category?.data) {
        console.log(`   ❌ Article ${index + 1}: Missing category`);
        compliance = false;
      }
      if (!attrs.author?.data) {
        console.log(`   ❌ Article ${index + 1}: Missing author`);
        compliance = false;
      }
      
      // Check field length limits
      if (attrs.sourceUrl && attrs.sourceUrl.length > 500) {
        console.log(`   ❌ Article ${index + 1}: sourceUrl too long (${attrs.sourceUrl.length} chars)`);
        compliance = false;
      }
      if (attrs.excerpt && attrs.excerpt.length > 300) {
        console.log(`   ❌ Article ${index + 1}: excerpt too long (${attrs.excerpt.length} chars)`);
        compliance = false;
      }
    });
    
    if (compliance) {
      console.log('   ✅ All articles comply with content model requirements');
    }
    
    console.log('\n🎉 Article verification completed!');

  } catch (error) {
    console.error('❌ Error verifying articles:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

verifyArticles();
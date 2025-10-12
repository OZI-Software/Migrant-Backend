// Simple script to check article titles directly
const strapi = require('@strapi/strapi');

async function checkArticleTitles() {
  try {
    console.log('🚀 Starting Strapi instance...');
    
    const app = await strapi().load();
    
    console.log('📊 Fetching recent articles...');
    
    const articles = await strapi.entityService.findMany('api::article.article', {
      limit: 10,
      sort: { createdAt: 'desc' },
      fields: ['title', 'slug', 'author', 'sourceUrl', 'resolvedUrl', 'category', 'status', 'createdAt']
    });

    console.log(`\n📰 Found ${articles.length} recent articles:\n`);

    articles.forEach((article, index) => {
      console.log(`--- Article ${index + 1} ---`);
      console.log(`ID: ${article.id}`);
      console.log(`Title: "${article.title}"`);
      console.log(`Slug: "${article.slug}"`);
      console.log(`Author: "${article.author}"`);
      console.log(`Source URL: "${article.sourceUrl}"`);
      console.log(`Category: "${article.category}"`);
      console.log(`Status: "${article.status}"`);
      console.log(`Created: ${article.createdAt}`);
      console.log('');
    });

    // Check for articles with "Google News" in title
    const googleNewsArticles = articles.filter(article => 
      article.title && article.title.includes('Google News')
    );

    if (googleNewsArticles.length > 0) {
      console.log(`\n⚠️ Found ${googleNewsArticles.length} articles with "Google News" in title:`);
      googleNewsArticles.forEach((article, index) => {
        console.log(`${index + 1}. "${article.title}" (ID: ${article.id})`);
      });
    } else {
      console.log('\n✅ No articles found with "Google News" in title');
    }

    await app.destroy();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkArticleTitles();
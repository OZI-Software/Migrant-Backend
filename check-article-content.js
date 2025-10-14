/**
 * Check actual article content in the database
 */

async function checkArticleContent() {
  try {
    console.log('🔍 Checking article content in database...');
    
    // Get the most recent articles
    const articles = await strapi.entityService.findMany('api::article.article', {
      sort: { createdAt: 'desc' },
      limit: 3,
      populate: ['category', 'tags', 'author']
    });

    console.log(`📊 Found ${articles.length} articles`);

    articles.forEach((article, index) => {
      console.log(`\n📰 Article ${index + 1}:`);
      console.log(`Title: ${article.title}`);
      console.log(`Category: ${article.category?.name || 'No category'}`);
      console.log(`Created: ${article.createdAt}`);
      console.log(`Content length: ${article.content?.length || 0} characters`);
      
      if (article.content) {
        console.log(`First 200 chars of content:`);
        console.log(article.content.substring(0, 200));
        console.log('...');
        
        // Check if content contains links vs proper text
        const linkCount = (article.content.match(/<a\s+href/gi) || []).length;
        const paragraphCount = (article.content.match(/<p>/gi) || []).length;
        const textLength = article.content.replace(/<[^>]*>/g, '').trim().length;
        
        console.log(`📈 Content analysis:`);
        console.log(`  - Links: ${linkCount}`);
        console.log(`  - Paragraphs: ${paragraphCount}`);
        console.log(`  - Text content length: ${textLength} chars`);
        
        if (linkCount > paragraphCount && textLength < 500) {
          console.log(`⚠️  WARNING: This article appears to contain mostly links!`);
        } else {
          console.log(`✅ This article appears to have proper content.`);
        }
      } else {
        console.log(`❌ No content found for this article`);
      }
    });

  } catch (error) {
    console.error('❌ Error checking article content:', error);
  }
}

// Initialize Strapi and run the check
async function main() {
  try {
    console.log('🚀 Initializing Strapi...');
    const Strapi = require('@strapi/strapi');
    global.strapi = await Strapi().load();
    await checkArticleContent();
    process.exit(0);
  } catch (error) {
    console.error('💥 Failed to initialize:', error);
    process.exit(1);
  }
}

main();
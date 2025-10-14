const strapi = require('@strapi/strapi');

async function testImportPipeline() {
  console.log('🚀 Starting Strapi and testing import pipeline...\n');
  
  try {
    // Initialize Strapi
    const app = await strapi().load();
    
    // Get the Google News Feed service
    const googleNewsFeedService = app.service('api::google-news-feed.google-news-feed');
    
    console.log('✅ Strapi loaded and service retrieved\n');
    
    // Test categories
    const testCategories = ['Science', 'World'];
    
    for (const categoryName of testCategories) {
      console.log(`🧪 Testing ${categoryName} category import pipeline...\n`);
      
      try {
        // Step 1: Find the category
        console.log(`1️⃣ Finding category: ${categoryName}`);
        const categories = await strapi.entityService.findMany('api::category.category', {
          filters: { name: categoryName }
        });
        
        if (categories.length === 0) {
          console.log(`❌ Category '${categoryName}' not found in database`);
          continue;
        }
        
        const category = categories[0];
        console.log(`✅ Found category: ${category.name} (ID: ${category.id})`);
        
        // Step 2: Fetch RSS feed
        console.log(`2️⃣ Fetching RSS feed for ${categoryName}...`);
        const feedItems = await googleNewsFeedService.fetchFeed(categoryName);
        console.log(`✅ Fetched ${feedItems.length} items from RSS feed`);
        
        if (feedItems.length === 0) {
          console.log(`❌ No items in RSS feed for ${categoryName}`);
          continue;
        }
        
        // Step 3: Test first item transformation
        console.log(`3️⃣ Testing transformation of first item...`);
        const firstItem = feedItems[0];
        console.log(`📰 First item: "${firstItem.title}"`);
        console.log(`🔗 Link: ${firstItem.link}`);
        
        try {
          const transformedArticle = await googleNewsFeedService.transformToArticle(firstItem, category);
          console.log(`✅ Transformation successful`);
          console.log(`📝 Transformed title: "${transformedArticle.title}"`);
          console.log(`📝 Slug: "${transformedArticle.slug}"`);
          console.log(`📝 Has content: ${!!transformedArticle.content}`);
          console.log(`📝 Has excerpt: ${!!transformedArticle.excerpt}`);
          
          // Step 4: Test article creation
          console.log(`4️⃣ Testing article creation...`);
          
          // Check if article already exists
          const existingArticles = await strapi.entityService.findMany('api::article.article', {
            filters: {
              $or: [
                { slug: transformedArticle.slug },
                { sourceUrl: transformedArticle.sourceUrl }
              ]
            }
          });
          
          if (existingArticles.length > 0) {
            console.log(`⚠️ Article already exists (slug: ${transformedArticle.slug})`);
          } else {
            console.log(`✅ Article doesn't exist, ready for creation`);
            
            // Try to create the article (but don't actually save it)
            console.log(`📝 Article data prepared for creation:`);
            console.log(`   - Title: ${transformedArticle.title}`);
            console.log(`   - Category: ${transformedArticle.category}`);
            console.log(`   - Author: ${transformedArticle.author}`);
            console.log(`   - Content length: ${transformedArticle.content?.length || 0} chars`);
            console.log(`   - Tags: ${transformedArticle.tags?.length || 0} tags`);
          }
          
        } catch (transformError) {
          console.log(`❌ Transformation failed: ${transformError.message}`);
          console.log(`🔍 Error details:`, transformError);
        }
        
      } catch (categoryError) {
        console.log(`❌ Error processing ${categoryName}: ${categoryError.message}`);
        console.log(`🔍 Error details:`, categoryError);
      }
      
      console.log('---\n');
    }
    
  } catch (error) {
    console.log(`❌ Failed to initialize Strapi: ${error.message}`);
    console.log(`🔍 Error details:`, error);
  } finally {
    // Clean up
    if (strapi) {
      await strapi.destroy();
    }
  }
}

testImportPipeline().catch(console.error);
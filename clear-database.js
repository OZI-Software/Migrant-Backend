const strapi = require('@strapi/strapi');

async function clearDatabase() {
  console.log('🔧 Clearing Database to Fix Duplicate Detection\n');

  try {
    // Initialize Strapi
    console.log('🚀 Initializing Strapi...');
    const app = await strapi().load();
    
    console.log('✅ Strapi initialized successfully');

    // Step 1: Check current articles in database
    console.log('\n📊 Step 1: Checking current articles...');
    
    const articles = await strapi.entityService.findMany('api::article.article', {
      populate: ['category', 'author'],
      pagination: { page: 1, pageSize: 100 }
    });

    console.log(`   Found ${articles.length} articles in database`);
    
    if (articles.length > 0) {
      console.log('   Sample articles:');
      articles.slice(0, 5).forEach((article, index) => {
        console.log(`   ${index + 1}. ${article.title}`);
        console.log(`      Source: ${article.sourceUrl}`);
        console.log(`      Category: ${article.category?.name || 'No category'}`);
      });

      // Step 2: Clear all articles
      console.log('\n🧹 Step 2: Clearing all articles...');
      
      for (const article of articles) {
        try {
          await strapi.entityService.delete('api::article.article', article.id);
          console.log(`   ✅ Deleted: ${article.title}`);
        } catch (error) {
          console.log(`   ❌ Failed to delete: ${article.title} - ${error.message}`);
        }
      }
      
      console.log(`   ✅ Cleared ${articles.length} articles from database`);
    } else {
      console.log('   ℹ️  No articles found in database');
    }

    // Step 3: Check categories
    console.log('\n📂 Step 3: Checking categories...');
    
    const categories = await strapi.entityService.findMany('api::category.category');
    console.log(`   Found ${categories.length} categories`);
    
    categories.forEach((category, index) => {
      console.log(`   ${index + 1}. ${category.name} (slug: ${category.slug})`);
    });

    // Step 4: Check authors
    console.log('\n👥 Step 4: Checking authors...');
    
    const authors = await strapi.entityService.findMany('api::author.author');
    console.log(`   Found ${authors.length} authors`);
    
    authors.forEach((author, index) => {
      console.log(`   ${index + 1}. ${author.name} (${author.email})`);
    });

    // Step 5: Test import after clearing
    console.log('\n🚀 Step 5: Testing import after clearing...');
    
    // Get the news feed service
    const newsFeedService = strapi.service('api::news-feed.news-feed');
    
    if (newsFeedService) {
      console.log('   ✅ News feed service found');
      
      // Try importing Science articles
      const importResult = await newsFeedService.importNews(['Science'], 3);
      
      console.log('   Import results:');
      console.log(`   ✅ Success: ${importResult.success}`);
      console.log(`   📝 Message: ${importResult.message}`);
      console.log(`   📊 Data: ${JSON.stringify(importResult.data, null, 2)}`);
      
      if (importResult.data.imported > 0) {
        console.log('\n🎉 SUCCESS: Science articles imported successfully!');
        
        // Verify the imported articles
        const newArticles = await strapi.entityService.findMany('api::article.article', {
          populate: ['category'],
          pagination: { page: 1, pageSize: 10 }
        });
        
        console.log(`\n✅ Verification: ${newArticles.length} articles now in database`);
        newArticles.forEach((article, index) => {
          console.log(`   ${index + 1}. ${article.title}`);
          console.log(`      Category: ${article.category?.name || 'No category'}`);
          console.log(`      Source: ${article.sourceUrl}`);
        });
        
      } else if (importResult.data.skipped > 0) {
        console.log('\n⚠️  Articles still being skipped as duplicates');
        console.log('   This suggests there might be a caching issue or the URLs are being tracked elsewhere');
        
        // Try with a different approach - force import
        console.log('\n🔄 Trying force import...');
        
        try {
          // Get RSS feed directly and try to import first item manually
          const feedUrls = newsFeedService.getFeedUrls();
          const scienceFeedUrl = feedUrls.Science;
          
          console.log(`   Science feed URL: ${scienceFeedUrl}`);
          
          const feedItems = await newsFeedService.fetchFeed('Science');
          console.log(`   Fetched ${feedItems.length} items from Science feed`);
          
          if (feedItems.length > 0) {
            const firstItem = feedItems[0];
            console.log(`   First item: ${firstItem.title}`);
            console.log(`   Link: ${firstItem.link}`);
            
            // Check if this specific article exists
            const exists = await newsFeedService.articleExists(firstItem.link);
            console.log(`   Article exists check: ${exists}`);
            
            if (exists) {
              console.log('   🔍 Article marked as existing. Checking database directly...');
              
              const existingArticle = await strapi.entityService.findMany('api::article.article', {
                filters: { sourceUrl: firstItem.link }
              });
              
              console.log(`   Found ${existingArticle.length} articles with this source URL`);
              
              if (existingArticle.length === 0) {
                console.log('   🐛 BUG FOUND: articleExists returns true but no article in database!');
                console.log('   This indicates a bug in the articleExists function');
              }
            }
          }
          
        } catch (forceError) {
          console.log(`   ❌ Force import failed: ${forceError.message}`);
        }
      }
      
    } else {
      console.log('   ❌ News feed service not found');
    }

    console.log('\n✅ Database clearing completed');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    console.error(error.stack);
  } finally {
    // Close Strapi
    if (strapi) {
      await strapi.destroy();
    }
  }
}

// Run the clearing
clearDatabase().then(() => {
  console.log('\n🎉 Database clearing process finished');
  process.exit(0);
}).catch(error => {
  console.error('❌ Database clearing failed:', error.message);
  process.exit(1);
});
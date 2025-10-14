require('dotenv').config();

async function testStrapiArticleCreation() {
  console.log('🧪 Testing Strapi Article Creation...\n');
  
  try {
    // Import Strapi
    const Strapi = require('@strapi/strapi');
    
    console.log('🚀 Initializing Strapi...');
    const strapi = await Strapi().load();
    console.log('✅ Strapi initialized successfully\n');
    
    // Test data that should work
    const testArticleData = {
      title: "Test Science Article",
      excerpt: "This is a test excerpt for a science article to verify that the creation process works correctly.",
      content: "<p>This is the main content of the test science article. It contains enough text to be considered valid content for testing purposes.</p>",
      readTime: 2,
      location: "Global",
      seoTitle: "Test Science Article - SEO Title",
      seoDescription: "This is a test SEO description for the science article that should be under 160 characters to comply with schema requirements.",
      isBreaking: false,
      publishedDate: new Date(),
      sourceUrl: "https://example.com/test-article"
    };
    
    console.log('📝 Test article data:');
    console.log('   Title:', testArticleData.title);
    console.log('   Excerpt length:', testArticleData.excerpt.length);
    console.log('   Content length:', testArticleData.content.length);
    console.log('   Read time:', testArticleData.readTime);
    console.log('   Location:', testArticleData.location);
    console.log('   SEO title length:', testArticleData.seoTitle.length);
    console.log('   SEO description length:', testArticleData.seoDescription.length);
    console.log('');
    
    // Check if Science category exists
    console.log('🔍 Checking for Science category...');
    const categories = await strapi.entityService.findMany('api::category.category', {
      filters: { name: 'Science' }
    });
    
    if (categories.length === 0) {
      console.log('❌ Science category not found. Creating it...');
      const scienceCategory = await strapi.entityService.create('api::category.category', {
        data: {
          name: 'Science',
          slug: 'science',
          description: 'Science and technology news',
          publishedAt: new Date()
        }
      });
      console.log('✅ Science category created:', scienceCategory.id);
      testArticleData.category = scienceCategory.id;
    } else {
      console.log('✅ Science category found:', categories[0].id);
      testArticleData.category = categories[0].id;
    }
    
    // Check if default author exists
    console.log('🔍 Checking for default author...');
    const authors = await strapi.entityService.findMany('api::author.author', {
      filters: { name: 'News Team' }
    });
    
    if (authors.length === 0) {
      console.log('❌ Default author not found. Creating it...');
      const defaultAuthor = await strapi.entityService.create('api::author.author', {
        data: {
          name: 'News Team',
          slug: 'news-team',
          email: 'news@example.com',
          isActive: true,
          publishedAt: new Date()
        }
      });
      console.log('✅ Default author created:', defaultAuthor.id);
      testArticleData.author = defaultAuthor.id;
    } else {
      console.log('✅ Default author found:', authors[0].id);
      testArticleData.author = authors[0].id;
    }
    
    console.log('');
    
    // Try to create the article
    console.log('📰 Creating test article...');
    try {
      const article = await strapi.entityService.create('api::article.article', {
        data: {
          ...testArticleData,
          publishedAt: new Date()
        }
      });
      
      console.log('✅ Article created successfully!');
      console.log('   Article ID:', article.id);
      console.log('   Title:', article.title);
      console.log('   Slug:', article.slug);
      console.log('   Read time:', article.readTime);
      console.log('   Location:', article.location);
      
    } catch (createError) {
      console.log('❌ Article creation failed:');
      console.log('   Error message:', createError.message);
      console.log('   Error details:', createError.details || 'No details available');
      console.log('   Error stack:', createError.stack);
      
      // Check if it's a validation error
      if (createError.details && createError.details.errors) {
        console.log('   Validation errors:');
        createError.details.errors.forEach((error, index) => {
          console.log(`     ${index + 1}. ${error.path}: ${error.message}`);
        });
      }
    }
    
    await strapi.destroy();
    console.log('\n🏁 Test completed');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('🔍 Error details:', error);
  }
}

testStrapiArticleCreation().catch(console.error);
/**
 * Test script to verify basic Strapi entity operations
 * This will help identify if there are any issues with the Strapi instance
 */

console.log('🧪 Testing basic Strapi entity operations...');

async function testStrapiOperations() {
  try {
    // Test 1: Check if strapi instance exists
    console.log('1. Testing Strapi instance availability...');
    if (!strapi) {
      throw new Error('Strapi instance not available');
    }
    console.log('✅ Strapi instance is available');

    // Test 2: Check if entityService exists
    console.log('2. Testing entityService availability...');
    if (!strapi.entityService) {
      throw new Error('strapi.entityService not available');
    }
    console.log('✅ entityService is available');

    // Test 3: Try to find existing categories
    console.log('3. Testing category query...');
    const categories = await strapi.entityService.findMany('api::category.category', {
      limit: 5
    });
    console.log(`✅ Found ${categories.length} categories:`, categories.map(c => ({ id: c.id, name: c.name })));

    // Test 4: Try to find existing authors
    console.log('4. Testing author query...');
    const authors = await strapi.entityService.findMany('api::author.author', {
      limit: 5
    });
    console.log(`✅ Found ${authors.length} authors:`, authors.map(a => ({ id: a.id, name: a.name })));

    // Test 5: Check if Science category exists
    console.log('5. Testing Science category lookup...');
    const scienceCategories = await strapi.entityService.findMany('api::category.category', {
      filters: { name: 'Science' }
    });
    console.log(`✅ Found ${scienceCategories.length} Science categories:`, scienceCategories);

    // Test 6: Check if News Team author exists
    console.log('6. Testing News Team author lookup...');
    const newsTeamAuthors = await strapi.entityService.findMany('api::author.author', {
      filters: { name: 'News Team' }
    });
    console.log(`✅ Found ${newsTeamAuthors.length} News Team authors:`, newsTeamAuthors);

    // Test 7: Try to create a test article (minimal data)
    console.log('7. Testing minimal article creation...');
    const testArticleData = {
      title: 'Test Article - ' + Date.now(),
      slug: 'test-article-' + Date.now(),
      excerpt: 'This is a test article excerpt',
      content: 'This is test article content',
      readTime: 1,
      location: 'Test Location',
      seoTitle: 'Test SEO Title',
      seoDescription: 'Test SEO Description',
      isBreaking: false,
      publishedDate: new Date().toISOString(),
      sourceUrl: 'https://example.com/test-' + Date.now(),
      publishedAt: null
    };

    // Add author and category if they exist
    if (newsTeamAuthors.length > 0) {
      testArticleData.author = newsTeamAuthors[0].id;
    }
    if (scienceCategories.length > 0) {
      testArticleData.category = scienceCategories[0].id;
    }

    console.log('Creating test article with data:', testArticleData);

    const testArticle = await strapi.entityService.create('api::article.article', {
      data: testArticleData
    });

    console.log('✅ Test article created successfully:', {
      id: testArticle.id,
      title: testArticle.title,
      slug: testArticle.slug
    });

    // Clean up: delete the test article
    console.log('8. Cleaning up test article...');
    await strapi.entityService.delete('api::article.article', testArticle.id);
    console.log('✅ Test article deleted successfully');

    console.log('\n🎉 All Strapi entity operations completed successfully!');
    console.log('The Strapi instance is working correctly.');

  } catch (error) {
    console.error('\n❌ Strapi entity operation failed:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    
    if (error.details) {
      console.error('Error details:', error.details);
    }
    
    // Additional debugging info
    console.error('\nDebugging info:');
    console.error('- Strapi available:', !!strapi);
    console.error('- EntityService available:', !!(strapi && strapi.entityService));
    console.error('- DB available:', !!(strapi && strapi.db));
  }
}

// Run the test
testStrapiOperations();
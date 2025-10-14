import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Test basic Strapi entity operations
   */
  async testEntityOperations(ctx) {
    try {
      console.log('🧪 Testing basic Strapi entity operations...');
      const results = [];

      // Test 1: Check if strapi instance exists
      results.push('1. Testing Strapi instance availability...');
      if (!strapi) {
        throw new Error('Strapi instance not available');
      }
      results.push('✅ Strapi instance is available');

      // Test 2: Check if entityService exists
      results.push('2. Testing entityService availability...');
      if (!strapi.entityService) {
        throw new Error('strapi.entityService not available');
      }
      results.push('✅ entityService is available');

      // Test 3: Try to find existing categories
      results.push('3. Testing category query...');
      const categories = await strapi.entityService.findMany('api::category.category', {
        limit: 5
      });
      results.push(`✅ Found ${categories.length} categories: ${JSON.stringify(categories.map(c => ({ id: c.id, name: c.name })))}`);

      // Test 4: Try to find existing authors
      results.push('4. Testing author query...');
      const authors = await strapi.entityService.findMany('api::author.author', {
        limit: 5
      });
      results.push(`✅ Found ${authors.length} authors: ${JSON.stringify(authors.map(a => ({ id: a.id, name: a.name })))}`);

      // Test 5: Check if Science category exists
      results.push('5. Testing Science category lookup...');
      const scienceCategories = await strapi.entityService.findMany('api::category.category', {
        filters: { name: 'Science' }
      });
      results.push(`✅ Found ${scienceCategories.length} Science categories: ${JSON.stringify(scienceCategories)}`);

      // Test 6: Check if News Team author exists
      results.push('6. Testing News Team author lookup...');
      const newsTeamAuthors = await strapi.entityService.findMany('api::author.author', {
        filters: { name: 'News Team' }
      });
      results.push(`✅ Found ${newsTeamAuthors.length} News Team authors: ${JSON.stringify(newsTeamAuthors)}`);

      // Test 7: Try to create a test article (minimal data)
      results.push('7. Testing minimal article creation...');
      const testArticleData: any = {
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

      results.push(`Creating test article with data: ${JSON.stringify(testArticleData)}`);

      const testArticle = await strapi.entityService.create('api::article.article', {
        data: testArticleData
      });

      results.push(`✅ Test article created successfully: ${JSON.stringify({
        id: testArticle.id,
        title: testArticle.title,
        slug: testArticle.slug
      })}`);

      // Clean up: delete the test article
      results.push('8. Cleaning up test article...');
      await strapi.entityService.delete('api::article.article', testArticle.id);
      results.push('✅ Test article deleted successfully');

      results.push('\n🎉 All Strapi entity operations completed successfully!');
      results.push('The Strapi instance is working correctly.');

      ctx.body = {
        success: true,
        message: 'Strapi entity operations test completed successfully',
        results: results
      };

    } catch (error) {
      strapi.log.error('Strapi entity operation failed:', error);
      
      const errorInfo = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        details: error.details || null,
        debugInfo: {
          strapiAvailable: !!strapi,
          entityServiceAvailable: !!(strapi && strapi.entityService),
          dbAvailable: !!(strapi && strapi.db)
        }
      };

      ctx.body = {
        success: false,
        message: 'Strapi entity operations test failed',
        error: errorInfo
      };
    }
  },

  /**
   * Check existing Science articles
   */
  async checkScienceArticles(ctx) {
    try {
      console.log('🔍 Checking existing Science articles...');
      
      // Find Science category
      const scienceCategories = await strapi.entityService.findMany('api::category.category', {
        filters: { name: 'Science' }
      });

      if (scienceCategories.length === 0) {
        ctx.body = {
          success: false,
          message: 'Science category not found'
        };
        return;
      }

      const scienceCategoryId = scienceCategories[0].id;

      // Find all Science articles
      const scienceArticles = await strapi.entityService.findMany('api::article.article', {
        filters: {
          category: {
            id: scienceCategoryId
          }
        },
        populate: ['category', 'author'],
        limit: 20
      });

      const articleSummary = scienceArticles.map((article: any) => ({
        id: article.id,
        title: article.title,
        sourceUrl: article.sourceUrl,
        publishedAt: article.publishedAt,
        createdAt: article.createdAt,
        author: article.author?.name || 'No author'
      }));

      ctx.body = {
        success: true,
        message: `Found ${scienceArticles.length} Science articles`,
        data: {
          categoryId: scienceCategoryId,
          totalArticles: scienceArticles.length,
          articles: articleSummary
        }
      };

    } catch (error) {
      strapi.log.error('Error checking Science articles:', error);
      
      ctx.body = {
        success: false,
        message: 'Failed to check Science articles',
        error: {
          message: error.message,
          stack: error.stack
        }
      };
    }
  }
});
// Script to verify article content and images through Strapi's entity service
// This script runs within the Strapi context to access the database directly

async function verifyArticleContent() {
  console.log('🔍 Verifying Article Content and Images\n');
  
  try {
    // Get the most recent articles (last 5)
    const articles = await strapi.entityService.findMany('api::article.article', {
      sort: { createdAt: 'desc' },
      limit: 5,
      populate: ['featuredImage', 'author', 'category']
    });
    
    console.log(`📊 Found ${articles.length} recent articles\n`);
    
    if (articles.length === 0) {
      console.log('❌ No articles found in database');
      return;
    }
    
    // Analyze each article
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(`📰 Article ${i + 1}: ${article.title}`);
      console.log(`   📅 Created: ${new Date(article.createdAt).toLocaleString()}`);
      console.log(`   🔗 Source: ${article.sourceUrl || 'Not set'}`);
      console.log(`   📝 Excerpt length: ${article.excerpt ? article.excerpt.length : 0} chars`);
      console.log(`   📄 Content length: ${article.content ? article.content.length : 0} chars`);
      console.log(`   🖼️  Featured Image: ${article.featuredImage ? 'Yes' : 'No'}`);
      
      if (article.featuredImage) {
        console.log(`      - Image URL: ${article.featuredImage.url}`);
        console.log(`      - Image Alt: ${article.featuredImage.alternativeText || 'Not set'}`);
        console.log(`      - Image Size: ${article.featuredImage.size || 'Unknown'} KB`);
      }
      
      console.log(`   👤 Author: ${article.author ? article.author.name : 'Not set'}`);
      console.log(`   🏷️  Category: ${article.category ? article.category.name : 'Not set'}`);
      console.log(`   ⏱️  Read Time: ${article.readTime || 0} minutes`);
      console.log(`   📍 Location: ${article.location || 'Not set'}`);
      console.log(`   🚨 Breaking: ${article.isBreaking ? 'Yes' : 'No'}`);
      
      // Check content quality
      if (article.content) {
        const hasImages = article.content.includes('<img');
        const hasFormatting = article.content.includes('<p>') || article.content.includes('<h');
        const hasLinks = article.content.includes('<a');
        
        console.log(`   📋 Content Analysis:`);
        console.log(`      - Has HTML formatting: ${hasFormatting ? 'Yes' : 'No'}`);
        console.log(`      - Contains images: ${hasImages ? 'Yes' : 'No'}`);
        console.log(`      - Contains links: ${hasLinks ? 'Yes' : 'No'}`);
        
        // Show first 200 characters of content
        const contentPreview = article.content.replace(/<[^>]+>/g, '').substring(0, 200);
        console.log(`      - Preview: "${contentPreview}..."`);
      }
      
      console.log(''); // Empty line for readability
    }
    
    // Summary statistics
    const articlesWithImages = articles.filter(a => a.featuredImage).length;
    const articlesWithContent = articles.filter(a => a.content && a.content.length > 100).length;
    const articlesWithRichContent = articles.filter(a => a.content && a.content.includes('<')).length;
    
    console.log('📊 Summary Statistics:');
    console.log(`   📰 Total articles analyzed: ${articles.length}`);
    console.log(`   🖼️  Articles with featured images: ${articlesWithImages}/${articles.length} (${Math.round(articlesWithImages/articles.length*100)}%)`);
    console.log(`   📄 Articles with substantial content: ${articlesWithContent}/${articles.length} (${Math.round(articlesWithContent/articles.length*100)}%)`);
    console.log(`   🎨 Articles with rich HTML content: ${articlesWithRichContent}/${articles.length} (${Math.round(articlesWithRichContent/articles.length*100)}%)`);
    
    // Check for recent Science category articles specifically
    const scienceArticles = await strapi.entityService.findMany('api::article.article', {
      filters: {
        category: {
          name: 'Science'
        },
        createdAt: {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      populate: ['featuredImage', 'category'],
      sort: { createdAt: 'desc' }
    });
    
    console.log(`\n🔬 Recent Science Articles: ${scienceArticles.length}`);
    if (scienceArticles.length > 0) {
      console.log('   ✅ Science category import is working');
      scienceArticles.slice(0, 2).forEach((article, index) => {
        console.log(`   ${index + 1}. ${article.title}`);
        console.log(`      - Has image: ${article.featuredImage ? 'Yes' : 'No'}`);
        console.log(`      - Content length: ${article.content ? article.content.length : 0} chars`);
      });
    }
    
    console.log('\n🎉 Article content verification completed!');
    
  } catch (error) {
    console.error('❌ Error verifying article content:', error.message);
    console.error(error.stack);
  }
}

// Export for use in Strapi context
module.exports = { verifyArticleContent };
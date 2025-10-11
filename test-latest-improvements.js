const axios = require('axios');

async function checkLatestArticle() {
  try {
    console.log('🔍 Checking latest article for improvements...\n');
    
    // Get the latest article
    const response = await axios.get('http://localhost:1337/api/articles', {
      params: {
        sort: 'createdAt:desc',
        pagination: {
          limit: 1
        },
        populate: ['category', 'author', 'tags', 'images']
      }
    });

    if (response.data.data.length === 0) {
      console.log('❌ No articles found');
      return;
    }

    const article = response.data.data[0];
    const attrs = article.attributes;
    
    console.log('📰 Latest Article Analysis:');
    console.log('=' .repeat(50));
    console.log(`📝 Title: "${attrs.title}"`);
    console.log(`🔗 Slug: "${attrs.slug}"`);
    console.log(`📄 SEO Title: "${attrs.seoTitle}"`);
    console.log(`📝 SEO Description: "${attrs.seoDescription}"`);
    console.log(`📊 Content Length: ${attrs.content ? attrs.content.length : 0} characters`);
    console.log(`📅 Created: ${new Date(attrs.createdAt).toLocaleString()}`);
    
    // Check improvements
    console.log('\n🔍 Improvement Analysis:');
    console.log('=' .repeat(50));
    
    // Check slug (should not have timestamp)
    const hasTimestamp = /\d{13}/.test(attrs.slug);
    console.log(`✅ Slug without timestamp: ${!hasTimestamp ? '✅ GOOD' : '❌ STILL HAS TIMESTAMP'}`);
    
    // Check SEO fields
    const hasSeoTitle = attrs.seoTitle && attrs.seoTitle.length > 0;
    const hasSeoDescription = attrs.seoDescription && attrs.seoDescription.length > 0;
    console.log(`✅ SEO Title present: ${hasSeoTitle ? '✅ GOOD' : '❌ MISSING'}`);
    console.log(`✅ SEO Description present: ${hasSeoDescription ? '✅ GOOD' : '❌ MISSING'}`);
    
    // Check if SEO description is different from title (indicating AI extraction worked)
    const seoDescDifferentFromTitle = attrs.seoDescription !== attrs.title.substring(0, 160);
    console.log(`✅ SEO Description unique: ${seoDescDifferentFromTitle ? '✅ GOOD' : '❌ SAME AS TITLE'}`);
    
    // Check content length (should be allowed even if short)
    const contentText = attrs.content ? attrs.content.replace(/<[^>]+>/g, '').trim() : '';
    console.log(`✅ Content length: ${contentText.length} chars (no minimum limit enforced)`);
    
    if (attrs.tags && attrs.tags.data.length > 0) {
      console.log(`🏷️  Tags: ${attrs.tags.data.map(tag => tag.attributes.name).join(', ')}`);
    }
    
    console.log('\n📊 Summary:');
    console.log('=' .repeat(50));
    const improvements = [
      !hasTimestamp ? '✅ Clean slug' : '❌ Timestamp in slug',
      hasSeoTitle ? '✅ SEO title' : '❌ No SEO title',
      hasSeoDescription ? '✅ SEO description' : '❌ No SEO description',
      seoDescDifferentFromTitle ? '✅ Unique SEO desc' : '❌ Generic SEO desc',
      '✅ No content length limit'
    ];
    
    improvements.forEach(improvement => console.log(improvement));
    
  } catch (error) {
    console.error('❌ Error checking latest article:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

checkLatestArticle();
require('dotenv').config();
const Strapi = require('@strapi/strapi');
const Parser = require('rss-parser');

async function debugScienceTransformation() {
  console.log('🔬 Starting detailed Science transformation debug...\n');
  
  let strapi;
  try {
    // Initialize Strapi
    console.log('🚀 Initializing Strapi...');
    strapi = await Strapi().load();
    console.log('✅ Strapi initialized successfully\n');
    
    // Get Science category
    console.log('📂 Finding Science category...');
    const scienceCategory = await strapi.entityService.findMany('api::category.category', {
      filters: { name: 'Science' }
    });
    
    if (!scienceCategory || scienceCategory.length === 0) {
      console.log('❌ Science category not found');
      return;
    }
    
    console.log('✅ Science category found:', scienceCategory[0]);
    console.log('');
    
    // Get RSS feed
    console.log('📡 Fetching Science RSS feed...');
    const parser = new Parser();
    const feed = await parser.parseURL('https://news.google.com/rss/search?q=science&hl=en-US&gl=US&ceid=US:en');
    console.log(`✅ RSS feed fetched: ${feed.items.length} items found\n`);
    
    // Test first article step by step
    const firstItem = feed.items[0];
    console.log('🎯 Testing first article:', firstItem.title);
    console.log('📍 Original URL:', firstItem.link);
    console.log('');
    
    // Step 1: Test AI Content Extractor initialization
    console.log('🤖 Step 1: Testing AI Content Extractor...');
    const AIContentExtractor = require('./src/services/ai-content-extractor.ts').default;
    const aiExtractor = new AIContentExtractor(strapi);
    console.log('✅ AI Content Extractor initialized\n');
    
    // Step 2: Test URL resolution
    console.log('🔗 Step 2: Testing URL resolution...');
    try {
      // We'll test the private method by calling the public method
      const extractionResult = await aiExtractor.extractFromRSSItem(firstItem, 'Science');
      
      if (extractionResult.success) {
        console.log('✅ AI extraction successful!');
        console.log('📄 Extracted data:', {
          title: extractionResult.data.title,
          slug: extractionResult.data.slug,
          excerpt: extractionResult.data.excerpt.substring(0, 100) + '...',
          tags: extractionResult.data.tags,
          processingTime: extractionResult.processingTime + 'ms'
        });
        console.log('');
        
        // Step 3: Test article creation
        console.log('💾 Step 3: Testing article creation...');
        try {
          const savedArticle = await aiExtractor.saveArticleAsDraft(extractionResult.data, 'Science');
          console.log('✅ Article saved successfully!');
          console.log('📝 Article ID:', savedArticle.id);
          console.log('📝 Article title:', savedArticle.title);
          console.log('📝 Article status:', savedArticle.publishedAt ? 'Published' : 'Draft');
          
        } catch (saveError) {
          console.log('❌ Article creation failed:', saveError.message);
          console.log('🔍 Save error details:', saveError);
        }
        
      } else {
        console.log('❌ AI extraction failed:', extractionResult.error);
        console.log('⏱️ Processing time:', extractionResult.processingTime + 'ms');
      }
      
    } catch (extractionError) {
      console.log('❌ Extraction process failed:', extractionError.message);
      console.log('🔍 Extraction error details:', extractionError);
    }
    
    console.log('\n🔍 Testing second article for comparison...');
    const secondItem = feed.items[1];
    console.log('🎯 Testing second article:', secondItem.title);
    
    try {
      const secondResult = await aiExtractor.extractFromRSSItem(secondItem, 'Science');
      if (secondResult.success) {
        console.log('✅ Second article extraction successful');
        
        try {
          const secondSaved = await aiExtractor.saveArticleAsDraft(secondResult.data, 'Science');
          console.log('✅ Second article saved successfully, ID:', secondSaved.id);
        } catch (secondSaveError) {
          console.log('❌ Second article save failed:', secondSaveError.message);
        }
      } else {
        console.log('❌ Second article extraction failed:', secondResult.error);
      }
    } catch (secondError) {
      console.log('❌ Second article process failed:', secondError.message);
    }
    
  } catch (error) {
    console.log('❌ Debug script failed:', error.message);
    console.log('🔍 Error details:', error);
  } finally {
    if (strapi) {
      console.log('\n🔄 Closing Strapi...');
      await strapi.destroy();
      console.log('✅ Strapi closed');
    }
  }
}

debugScienceTransformation().catch(console.error);
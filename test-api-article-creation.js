require('dotenv').config();
const axios = require('axios');

async function testAPIArticleCreation() {
  console.log('🧪 Testing Article Creation via API...\n');
  
  const baseURL = 'http://localhost:1337/api';
  
  try {
    // First, check if Science category exists
    console.log('🔍 Checking for Science category...');
    const categoriesResponse = await axios.get(`${baseURL}/categories?filters[name][$eq]=Science`);
    
    let categoryId;
    if (categoriesResponse.data.data.length === 0) {
      console.log('❌ Science category not found. Creating it...');
      const createCategoryResponse = await axios.post(`${baseURL}/categories`, {
        data: {
          name: 'Science',
          slug: 'science',
          description: 'Science and technology news'
        }
      });
      categoryId = createCategoryResponse.data.data.id;
      console.log('✅ Science category created:', categoryId);
    } else {
      categoryId = categoriesResponse.data.data[0].id;
      console.log('✅ Science category found:', categoryId);
    }
    
    // Check if default author exists
    console.log('🔍 Checking for default author...');
    const authorsResponse = await axios.get(`${baseURL}/authors?filters[name][$eq]=News Team`);
    
    let authorId;
    if (authorsResponse.data.data.length === 0) {
      console.log('❌ Default author not found. Creating it...');
      const createAuthorResponse = await axios.post(`${baseURL}/authors`, {
        data: {
          name: 'News Team',
          slug: 'news-team',
          email: 'news@example.com',
          isActive: true
        }
      });
      authorId = createAuthorResponse.data.data.id;
      console.log('✅ Default author created:', authorId);
    } else {
      authorId = authorsResponse.data.data[0].id;
      console.log('✅ Default author found:', authorId);
    }
    
    console.log('');
    
    // Test article data
    const testArticleData = {
      title: "Test Science Article via API",
      excerpt: "This is a test excerpt for a science article to verify that the creation process works correctly via the API.",
      content: "<p>This is the main content of the test science article. It contains enough text to be considered valid content for testing purposes.</p>",
      readTime: 2,
      location: "Global",
      seoTitle: "Test Science Article - SEO Title",
      seoDescription: "This is a test SEO description for the science article that should be under 160 characters to comply with schema requirements.",
      isBreaking: false,
      publishedDate: new Date().toISOString(),
      sourceUrl: "https://example.com/test-article",
      category: categoryId,
      author: authorId
    };
    
    console.log('📝 Test article data:');
    console.log('   Title:', testArticleData.title);
    console.log('   Excerpt length:', testArticleData.excerpt.length);
    console.log('   Content length:', testArticleData.content.length);
    console.log('   Read time:', testArticleData.readTime);
    console.log('   Location:', testArticleData.location);
    console.log('   SEO title length:', testArticleData.seoTitle.length);
    console.log('   SEO description length:', testArticleData.seoDescription.length);
    console.log('   Category ID:', testArticleData.category);
    console.log('   Author ID:', testArticleData.author);
    console.log('');
    
    // Try to create the article
    console.log('📰 Creating test article via API...');
    try {
      const articleResponse = await axios.post(`${baseURL}/articles`, {
        data: testArticleData
      });
      
      console.log('✅ Article created successfully!');
      console.log('   Article ID:', articleResponse.data.data.id);
      console.log('   Title:', articleResponse.data.data.attributes.title);
      console.log('   Slug:', articleResponse.data.data.attributes.slug);
      console.log('   Read time:', articleResponse.data.data.attributes.readTime);
      console.log('   Location:', articleResponse.data.data.attributes.location);
      
    } catch (createError) {
      console.log('❌ Article creation failed:');
      console.log('   Status:', createError.response?.status);
      console.log('   Status text:', createError.response?.statusText);
      console.log('   Error message:', createError.message);
      
      if (createError.response?.data) {
        console.log('   Response data:', JSON.stringify(createError.response.data, null, 2));
      }
      
      if (createError.response?.data?.error?.details?.errors) {
        console.log('   Validation errors:');
        createError.response.data.error.details.errors.forEach((error, index) => {
          console.log(`     ${index + 1}. ${error.path}: ${error.message}`);
        });
      }
    }
    
    console.log('\n🏁 Test completed');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAPIArticleCreation().catch(console.error);
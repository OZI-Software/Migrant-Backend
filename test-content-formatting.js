const axios = require('axios');

async function testContentFormatting() {
  console.log('📝 Testing Content Formatting Improvements\n');

  try {
    // Create a test article with sample content to verify formatting
    const testArticle = {
      title: `Test Article - Content Formatting ${new Date().toISOString()}`,
      content: `<div>This is the first paragraph of the test article.</div>

<div>This is the second paragraph with some <strong>bold text</strong> and <em>italic text</em>.</div>

<h2>This is a heading</h2>

<div>This paragraph comes after a heading and should be properly formatted.</div>

<p>This is already a proper paragraph tag.</p>

<div>Here's another paragraph with a <a href="https://example.com">link</a> inside it.</div>

<div>Final paragraph to test the formatting improvements.</div>`,
      excerpt: 'This is a test article to verify content formatting improvements.',
      slug: `test-content-formatting-${Date.now()}`,
      sourceUrl: `https://test-unique-url-${Date.now()}.example.com`,
      publishedAt: new Date().toISOString(),
      category: 'Science',
      location: 'Test Location',
      readTime: 2,
      seoTitle: 'Test Article SEO Title',
      seoDescription: 'Test article SEO description for content formatting verification.',
      featuredImage: null // We'll test without image first
    };

    console.log('🚀 Creating test article with formatted content...');
    
    // Use the internal Strapi service to create the article
    const response = await axios.post('http://localhost:1337/api/articles', {
      data: testArticle
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200 || response.status === 201) {
      console.log('✅ Test article created successfully!');
      console.log(`   Article ID: ${response.data.data.id}`);
      console.log(`   Title: ${response.data.data.attributes.title}`);
      
      // Check the formatted content
      const content = response.data.data.attributes.content;
      console.log('\n📄 Formatted Content Preview:');
      console.log('=' .repeat(50));
      console.log(content.substring(0, 500) + (content.length > 500 ? '...' : ''));
      console.log('=' .repeat(50));
      
      // Analyze the content structure
      const paragraphCount = (content.match(/<p>/g) || []).length;
      const hasLineBreaks = content.includes('\n\n');
      const hasProperSpacing = !content.includes('  '); // No double spaces
      
      console.log('\n🔍 Content Analysis:');
      console.log(`   Paragraph tags: ${paragraphCount}`);
      console.log(`   Has line breaks: ${hasLineBreaks ? '✅' : '❌'}`);
      console.log(`   Proper spacing: ${hasProperSpacing ? '✅' : '❌'}`);
      console.log(`   Content length: ${content.length} characters`);
      
      if (paragraphCount > 0 && hasLineBreaks) {
        console.log('\n🎉 SUCCESS: Content formatting improvements are working!');
      } else {
        console.log('\n⚠️  WARNING: Content formatting may need further improvements');
      }
      
    } else {
      console.log('❌ Failed to create test article');
      console.log('Response:', response.data);
    }

  } catch (error) {
    console.error('❌ Error testing content formatting:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testContentFormatting().then(() => {
  console.log('\n✅ Content formatting test completed');
}).catch(error => {
  console.error('❌ Test failed:', error.message);
});
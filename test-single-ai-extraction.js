const axios = require('axios');

async function testSingleAIExtraction() {
  console.log('🧪 Testing Single AI Extraction');
  
  const testData = {
    title: "Revolutionary Solar Panel Technology Achieves 45% Efficiency",
    description: "Scientists announce major breakthrough in renewable energy",
    url: "https://example.com/solar-breakthrough",
    content: `
      <article>
        <h1>Revolutionary Solar Panel Technology Achieves 45% Efficiency</h1>
        <p>Scientists at MIT have developed a new type of solar panel that can convert 45% of sunlight into electricity, nearly doubling the efficiency of current commercial panels.</p>
        <p>The breakthrough uses a novel perovskite-silicon tandem design that captures both visible and infrared light more effectively than traditional silicon panels.</p>
        <p>"This could revolutionize the renewable energy industry," said Dr. Sarah Chen, lead researcher on the project.</p>
        <p>The technology is expected to be commercially available within the next three years, potentially reducing solar energy costs by 40%.</p>
        <p>The research team tested over 100 different configurations before achieving this breakthrough efficiency rate.</p>
        <p>Industry experts believe this advancement could accelerate the global transition to renewable energy sources.</p>
      </article>
    `
  };
  
  console.log(`📄 Content length: ${testData.content.length} characters`);
  console.log(`📰 Title: ${testData.title}`);
  
  try {
    const startTime = Date.now();
    
    console.log('📤 Sending request to AI extraction API...');
    const response = await axios.post(
      'http://localhost:1337/api/news-feed/test-ai-extraction',
      testData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 seconds
      }
    );
    
    const totalTime = Date.now() - startTime;
    
    console.log(`✅ Response received in ${totalTime}ms`);
    console.log(`📊 Status: ${response.status}`);
    
    if (response.data && response.data.success) {
      console.log(`💬 Server message: ${response.data.message}`);
      
      if (response.data.data) {
        const result = response.data.data;
        console.log('\n🎯 AI Extraction Results:');
        console.log(`   📰 Title: ${result.title}`);
        console.log(`   📝 Content: ${result.content ? result.content.substring(0, 200) + '...' : 'No content'}`);
        console.log(`   📏 Content length: ${result.content ? result.content.length : 0} characters`);
        console.log(`   🏷️  Tags: ${result.tags ? result.tags.length : 0} tags`);
        console.log(`   🖼️  Images: ${result.images ? result.images.length : 0} images`);
        console.log(`   ⭐ Quality: ${result.quality || 'unknown'}`);
        console.log(`   🔧 Method: ${result.method || 'unknown'}`);
        console.log(`   📊 Word count: ${result.wordCount || 0}`);
        console.log(`   ⏱️  Processing time: ${result.processingTime || 'unknown'}`);
        console.log(`   🕐 Total request time: ${totalTime}ms`);
        
        if (result.originalContent) {
          console.log('\n📋 Original Content Info:');
          console.log(`   📰 Original title: ${result.originalContent.title}`);
          console.log(`   🔗 Original URL: ${result.originalContent.url}`);
          console.log(`   📏 Original length: ${result.originalContent.contentLength} characters`);
        }
        
        console.log('\n🎉 AI Extraction Test: ✅ SUCCESS');
        return true;
      } else {
        console.log('❌ No data in response');
        return false;
      }
    } else {
      console.log('❌ Response indicates failure');
      console.log('📄 Response:', JSON.stringify(response.data, null, 2));
      return false;
    }
    
  } catch (error) {
    console.log('\n❌ AI Extraction Test: FAILED');
    console.log(`💥 Error: ${error.message}`);
    
    if (error.response) {
      console.log(`📊 Status: ${error.response.status}`);
      console.log(`📄 Response data:`, JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.code) {
      console.log(`🔧 Error code: ${error.code}`);
    }
    
    return false;
  }
}

// Run the test
testSingleAIExtraction()
  .then(success => {
    console.log(`\n📊 Final Result: ${success ? '✅ PASSED' : '❌ FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
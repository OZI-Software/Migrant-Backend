require('dotenv').config();
const Parser = require('rss-parser');

async function testScienceTransformation() {
  console.log('🔬 Testing Science article transformation directly...\n');
  
  try {
    // Fetch Science RSS feed
    console.log('📡 Fetching Science RSS feed...');
    const parser = new Parser();
    const feed = await parser.parseURL('https://news.google.com/rss/search?q=science&hl=en-US&gl=US&ceid=US:en');
    console.log(`✅ RSS feed fetched: ${feed.items.length} items found\n`);
    
    // Get first article
    const firstItem = feed.items[0];
    console.log('🎯 Testing first article:');
    console.log('   Title:', firstItem.title);
    console.log('   Link:', firstItem.link);
    console.log('   PubDate:', firstItem.pubDate);
    console.log('');
    
    // Test AI Content Extractor directly
    console.log('🤖 Testing AI Content Extractor...');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('❌ No GEMINI_API_KEY found');
      return;
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
    
    console.log('✅ AI model initialized');
    
    // Test basic AI functionality
    console.log('🧪 Testing basic AI functionality...');
    try {
      const testResult = await model.generateContent('Respond with "AI is working" if you can understand this.');
      const testResponse = await testResult.response;
      const testText = testResponse.text();
      console.log('✅ AI test successful:', testText);
    } catch (aiTestError) {
      console.log('❌ AI test failed:', aiTestError.message);
      return;
    }
    
    // Test URL fetching
    console.log('\n🔗 Testing URL fetching...');
    const axios = require('axios');
    
    try {
      const response = await axios.get(firstItem.link, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        maxRedirects: 5
      });
      
      console.log('✅ URL fetch successful');
      console.log('   Status:', response.status);
      console.log('   Content length:', response.data.length);
      console.log('   Content type:', response.headers['content-type']);
      
      // Test AI content extraction
      console.log('\n🧠 Testing AI content extraction...');
      
      const extractionPrompt = `
Please extract and structure the following news article content:

URL: ${firstItem.link}
RSS Title: ${firstItem.title}
Category: Science

HTML Content:
${response.data.substring(0, 10000)}...

Please provide a JSON response with:
{
  "title": "cleaned article title",
  "excerpt": "brief summary (100-150 words)",
  "content": "full article content in HTML format",
  "tags": ["tag1", "tag2", "tag3"],
  "location": "location if mentioned",
  "seoTitle": "SEO optimized title",
  "seoDescription": "SEO description"
}
`;

      const extractionResult = await model.generateContent(extractionPrompt);
      const extractionResponse = await extractionResult.response;
      const extractionText = extractionResponse.text();
      
      console.log('✅ AI extraction successful');
      console.log('   Response length:', extractionText.length);
      console.log('   Response preview:', extractionText.substring(0, 200) + '...');
      
      // Test JSON parsing
      console.log('\n📋 Testing JSON parsing...');
      try {
        // Clean the response to extract JSON
        let jsonText = extractionText;
        if (jsonText.includes('```json')) {
          jsonText = jsonText.split('```json')[1].split('```')[0];
        } else if (jsonText.includes('```')) {
          jsonText = jsonText.split('```')[1].split('```')[0];
        }
        
        const parsedData = JSON.parse(jsonText.trim());
        console.log('✅ JSON parsing successful');
        console.log('   Extracted title:', parsedData.title);
        console.log('   Extracted tags:', parsedData.tags);
        console.log('   Content length:', parsedData.content?.length || 0);
        
      } catch (parseError) {
        console.log('❌ JSON parsing failed:', parseError.message);
        console.log('   Raw response:', extractionText);
      }
      
    } catch (fetchError) {
      console.log('❌ URL fetch failed:', fetchError.message);
      console.log('   Error details:', {
        code: fetchError.code,
        status: fetchError.response?.status,
        statusText: fetchError.response?.statusText
      });
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('🔍 Error details:', error);
  }
}

testScienceTransformation().catch(console.error);
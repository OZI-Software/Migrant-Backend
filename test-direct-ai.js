/**
 * Direct test of AI content extractor with Gemini API
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiDirectly() {
  console.log('🧪 Testing Gemini AI directly...');
  
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }
    
    console.log('✅ API Key found');
    console.log('🔌 Initializing Gemini AI...');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    // Try different model names
    const modelNames = ['gemini-1.5-flash-latest', 'gemini-1.5-pro-latest', 'gemini-pro', 'gemini-1.0-pro'];
    let model = null;
    
    for (const modelName of modelNames) {
      try {
        console.log(`🔍 Trying model: ${modelName}`);
        model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
          }
        });
        console.log(`✅ Model ${modelName} initialized successfully`);
        break; // Exit loop if successful
      } catch (modelError) {
        console.log(`❌ Model ${modelName} failed: ${modelError.message.split(':')[0]}`);
        continue;
      }
    }
    
    if (!model) {
      throw new Error('No working Gemini model found');
    }
    
    // Test with sample RSS content
    const testContent = `
    Scientists at MIT have developed a new type of battery that could revolutionize electric vehicles. 
    The lithium-metal battery can charge to 80% capacity in just 10 minutes and has three times the 
    energy density of current lithium-ion batteries. The breakthrough could make electric cars more 
    practical for long-distance travel. The research team, led by Dr. Sarah Chen, published their 
    findings in Nature Energy journal. The new battery design uses a solid polymer electrolyte 
    that prevents the formation of dendrites, which can cause fires in traditional batteries.
    `;
    
    const prompt = `You are a professional news editor and SEO specialist. Transform the following article content into a well-structured news article for a modern CMS.

**ARTICLE INPUT:**
- Source URL: https://example.com/mit-battery-breakthrough
- Original Title: MIT Scientists Develop Revolutionary Battery
- Category: Technology
- Word Count: ${testContent.length} characters

**CONTENT:**
${testContent}

**INSTRUCTIONS:**
Create a comprehensive news article with the following requirements:

1. **Title**: Create an engaging, newsworthy headline (15-75 characters)
2. **Excerpt**: Write a compelling summary (140-200 characters) 
3. **Content**: Structure as clean HTML with proper paragraphs, minimum 300 words
4. **SEO**: Optimize title (45-65 chars) and description (140-160 chars)
5. **Tags**: Generate 4-7 specific, relevant keywords (NO generic terms like "news", "breaking")
6. **Location**: Extract specific geographic location if mentioned, otherwise use "Global"
7. **Slug**: Create SEO-friendly URL slug with timestamp: keywords-20241012-123456

**CRITICAL OUTPUT REQUIREMENTS:**
- Must return ONLY valid JSON (no markdown, no explanations)
- All fields are mandatory
- Use proper HTML tags in content: <p>, <h2>, <h3>, <strong>, <em>
- Ensure factual accuracy and professional tone
- Location must be specific (e.g., "Cambridge, USA" not just "USA")

**JSON OUTPUT FORMAT:**
{
  "title": "Compelling news headline",
  "excerpt": "Engaging article summary 140-200 characters",
  "content": "<p>Well-structured HTML content with multiple paragraphs...</p>",
  "slug": "mit-battery-breakthrough-20241012-123456",
  "seoTitle": "SEO optimized title 45-65 chars",
  "seoDescription": "Compelling meta description 140-160 chars",
  "tags": ["battery-technology", "mit-research", "electric-vehicles", "lithium-metal"],
  "location": "Cambridge, USA",
  "metadata": {
    "publishedDate": "${new Date().toISOString()}",
    "readingTime": 2,
    "language": "en",
    "category": "Technology",
    "sourceUrl": "https://example.com/mit-battery-breakthrough",
    "resolvedUrl": "https://example.com/mit-battery-breakthrough",
    "wordCount": 300
  }
}`;

    console.log('🚀 Sending request to Gemini AI...');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponse = response.text().trim();
    
    console.log('✅ AI Response received');
    console.log('📝 Raw response length:', aiResponse.length);
    console.log('📄 Raw response preview:', aiResponse.substring(0, 500) + '...');
    
    // Try to parse the JSON
    try {
      let jsonStr = aiResponse.trim();
      
      // Clean the response to extract JSON
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonStr);
      console.log('\n✅ JSON parsed successfully!');
      console.log('\n📊 EXTRACTED CONTENT:');
      console.log(`   Title: "${parsed.title}" (${parsed.title?.length || 0} chars)`);
      console.log(`   Excerpt: "${parsed.excerpt}" (${parsed.excerpt?.length || 0} chars)`);
      console.log(`   Content length: ${parsed.content?.length || 0} characters`);
      console.log(`   Location: "${parsed.location}"`);
      console.log(`   SEO Title: "${parsed.seoTitle}" (${parsed.seoTitle?.length || 0} chars)`);
      console.log(`   SEO Description: "${parsed.seoDescription}" (${parsed.seoDescription?.length || 0} chars)`);
      console.log(`   Tags: [${parsed.tags?.join(', ') || 'none'}]`);
      console.log(`   Slug: "${parsed.slug}"`);
      
      // Validate all required fields
      const requiredFields = ['title', 'excerpt', 'content', 'slug', 'seoTitle', 'seoDescription', 'tags', 'location'];
      const missingFields = requiredFields.filter(field => !parsed[field]);
      
      if (missingFields.length > 0) {
        console.log(`\n❌ Missing fields: ${missingFields.join(', ')}`);
      } else {
        console.log('\n🎉 All required fields are present!');
        
        // Check field quality
        const issues = [];
        if (parsed.title.length < 15 || parsed.title.length > 75) issues.push('title length');
        if (parsed.excerpt.length < 140 || parsed.excerpt.length > 200) issues.push('excerpt length');
        if (parsed.content.length < 300) issues.push('content too short');
        if (!Array.isArray(parsed.tags) || parsed.tags.length < 4) issues.push('insufficient tags');
        
        if (issues.length > 0) {
          console.log(`\n⚠️ Quality issues: ${issues.join(', ')}`);
        } else {
          console.log('\n🏆 All field quality checks passed!');
        }
      }
      
    } catch (parseError) {
      console.log('\n❌ Failed to parse JSON response:', parseError.message);
      console.log('Raw response causing error:', aiResponse);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testGeminiDirectly();
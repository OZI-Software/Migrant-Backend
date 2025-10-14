/**
 * Debug script to test AI content extraction and understand the links issue
 */

require('dotenv').config();
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

async function debugContentExtraction() {
  console.log('🔍 Debugging AI Content Extraction...');
  
  try {
    // Test with a sample Google News URL
    const testUrl = 'https://news.google.com/rss/articles/CBMiYWh0dHBzOi8vd3d3LnNjaWVuY2VuZXdzLm9yZy9hcnRpY2xlL2FydGlmaWNpYWwtaW50ZWxsaWdlbmNlLWNhbi1oZWxwLXNjaWVudGlzdHMtZmluZC1uZXctZHJ1Z3PSAQA?oc=5';
    
    console.log('📡 Step 1: Resolving URL...');
    console.log('Original URL:', testUrl);
    
    // Resolve the URL
    let resolvedUrl = testUrl;
    if (testUrl.includes('news.google.com')) {
      const urlMatch = testUrl.match(/url=([^&]+)/);
      if (urlMatch) {
        resolvedUrl = decodeURIComponent(urlMatch[1]);
        console.log('✅ Resolved URL:', resolvedUrl);
      }
    }
    
    console.log('\n📄 Step 2: Fetching HTML content...');
    const response = await axios.get(resolvedUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    console.log('✅ HTML fetched, length:', response.data.length);
    
    console.log('\n🔧 Step 3: Processing with Readability...');
    const dom = new JSDOM(response.data, { url: resolvedUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    
    if (article) {
      console.log('✅ Readability extraction successful');
      console.log('Title:', article.title);
      console.log('Content length:', article.content.length);
      console.log('Text content length:', article.textContent?.length || 0);
      
      // Show first 500 characters of content
      console.log('\n📝 First 500 chars of extracted content:');
      console.log('---');
      console.log(article.textContent?.substring(0, 500) || 'No text content');
      console.log('---');
      
      // Show first 500 characters of HTML content
      console.log('\n🏷️ First 500 chars of HTML content:');
      console.log('---');
      console.log(article.content.substring(0, 500));
      console.log('---');
      
    } else {
      console.log('❌ Readability extraction failed');
    }
    
    console.log('\n🤖 Step 4: Testing AI processing...');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('❌ GEMINI_API_KEY not found');
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
    
    const contentText = article?.textContent || '';
    const cleanContent = contentText.substring(0, 6000);
    
    const prompt = `You are a professional news editor. Transform this article content into a structured news article.

IMPORTANT: You must respond with ONLY a valid JSON object. No explanations, no markdown, no additional text.

**SOURCE INFORMATION:**
URL: ${resolvedUrl}
Original Title: ${article?.title || 'N/A'}
Category: Science

**ARTICLE CONTENT:**
${cleanContent}

**TASK:**
Create a news article with these exact fields:

1. title: Engaging headline (20-100 characters)
2. excerpt: Article summary (100-200 characters)
3. content: HTML formatted article content with <p> tags (minimum 200 words)
4. slug: URL-friendly slug
5. seoTitle: SEO optimized title (30-60 characters)
6. seoDescription: Meta description (120-160 characters)
7. tags: Array of 3-6 relevant keywords
8. location: Specific location mentioned in article or "Global" if none

**CRITICAL REQUIREMENTS:**
- Output ONLY the JSON object below
- No markdown code blocks
- No explanatory text before or after
- All string fields must be properly escaped
- Content must use proper HTML paragraph tags

{
  "title": "Your engaging headline here",
  "excerpt": "Your article summary here",
  "content": "<p>Your HTML formatted content here with multiple paragraphs</p><p>Second paragraph here</p>",
  "slug": "main-keywords-slug",
  "seoTitle": "SEO optimized title",
  "seoDescription": "Compelling meta description",
  "tags": ["keyword1", "keyword2", "keyword3", "keyword4"],
  "location": "City, Country or Global"
}`;

    console.log('🔄 Sending to Gemini AI...');
    console.log('Prompt length:', prompt.length);
    
    const result = await model.generateContent(prompt);
    const aiResult = await result.response;
    const aiResponse = aiResult.text();
    
    console.log('\n🎯 AI Response:');
    console.log('---');
    console.log(aiResponse);
    console.log('---');
    
    // Try to parse the JSON
    try {
      const parsed = JSON.parse(aiResponse);
      console.log('\n✅ JSON parsing successful');
      console.log('Generated title:', parsed.title);
      console.log('Content length:', parsed.content?.length || 0);
      console.log('First 200 chars of generated content:');
      console.log(parsed.content?.substring(0, 200) || 'No content');
    } catch (parseError) {
      console.log('\n❌ JSON parsing failed:', parseError.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugContentExtraction();
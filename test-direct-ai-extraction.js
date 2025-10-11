const axios = require('axios');
const cheerio = require('cheerio');

// Test configuration
const TEST_CONFIG = {
    STRAPI_URL: 'http://localhost:1337',
    TEST_ARTICLE_URL: 'https://httpbin.org/html', // Simple test URL that returns HTML
    TIMEOUT: 30000 // 30 seconds timeout
};

/**
 * Extract content from a web page
 */
async function extractWebContent(url) {
    try {
        console.log(`🔍 Extracting content from: ${url}`);
        
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        
        // Extract basic content
        const title = $('title').text() || $('h1').first().text() || 'No title found';
        const description = $('meta[name="description"]').attr('content') || 
                          $('meta[property="og:description"]').attr('content') || 
                          'No description found';
        
        // Extract main content (try multiple selectors)
        let content = '';
        const contentSelectors = [
            'article',
            '.article-content',
            '.post-content',
            '.entry-content',
            '.content',
            'main',
            '.main-content'
        ];
        
        for (const selector of contentSelectors) {
            const element = $(selector);
            if (element.length > 0) {
                content = element.text().trim();
                if (content.length > 200) break;
            }
        }
        
        // Fallback: get all paragraph text
        if (content.length < 200) {
            content = $('p').map((i, el) => $(el).text()).get().join(' ').trim();
        }
        
        const extractedData = {
            title: title.trim(),
            description: description.trim(),
            content: content.substring(0, 2000), // Limit content length
            url: url,
            extractedAt: new Date().toISOString()
        };
        
        console.log(`✅ Content extracted successfully:`);
        console.log(`   📰 Title: ${extractedData.title.substring(0, 100)}...`);
        console.log(`   📝 Description: ${extractedData.description.substring(0, 100)}...`);
        console.log(`   📄 Content length: ${extractedData.content.length} characters`);
        
        return extractedData;
        
    } catch (error) {
        console.error(`❌ Failed to extract content from ${url}:`, error.message);
        throw error;
    }
}

/**
 * Test AI extraction with extracted content
 */
async function testDirectAIExtraction(extractedContent) {
    try {
        console.log(`\n🤖 Testing AI extraction with extracted content...`);
        
        const response = await axios.post(
            `${TEST_CONFIG.STRAPI_URL}/api/news-feed/test-ai-extraction`,
            {
                url: extractedContent.url,
                title: extractedContent.title,
                description: extractedContent.description,
                content: extractedContent.content
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: TEST_CONFIG.TIMEOUT
            }
        );

        console.log(`✅ AI extraction completed successfully!`);
        console.log(`📊 Response status: ${response.status}`);
        
        if (response.data) {
            console.log(`📋 AI Response:`, JSON.stringify(response.data, null, 2));
            
            // Analyze the response
            const aiData = response.data;
            console.log(`\n📈 AI Extraction Analysis:`);
            console.log(`   🎯 Title: ${aiData.title || 'Not provided'}`);
            console.log(`   📝 Content length: ${aiData.content ? aiData.content.length : 0} characters`);
            console.log(`   🏷️  Tags: ${aiData.tags ? aiData.tags.length : 0} tags`);
            console.log(`   🖼️  Images: ${aiData.images ? aiData.images.length : 0} images`);
            console.log(`   ⭐ Quality: ${aiData.quality || 'Not assessed'}`);
            console.log(`   ⏱️  Processing time: ${aiData.processingTime || 'Not provided'}`);
        }
        
        return response.data;
        
    } catch (error) {
        console.error(`❌ AI extraction failed:`, error.message);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data:`, error.response.data);
        }
        throw error;
    }
}

/**
 * Main test function
 */
async function runDirectAITest() {
    console.log(`🚀 Starting Direct AI Extraction Test`);
    console.log(`⚙️  Configuration:`);
    console.log(`   🌐 Strapi URL: ${TEST_CONFIG.STRAPI_URL}`);
    console.log(`   📰 Test URL: ${TEST_CONFIG.TEST_ARTICLE_URL}`);
    console.log(`   ⏱️  Timeout: ${TEST_CONFIG.TIMEOUT}ms`);
    
    try {
        // Step 1: Extract content from web page
        console.log(`\n📥 Step 1: Extracting web content...`);
        const extractedContent = await extractWebContent(TEST_CONFIG.TEST_ARTICLE_URL);
        
        // Step 2: Pass extracted content to AI service
        console.log(`\n🧠 Step 2: Processing with AI service...`);
        const aiResult = await testDirectAIExtraction(extractedContent);
        
        console.log(`\n🎉 Test completed successfully!`);
        console.log(`✅ Both content extraction and AI processing worked correctly.`);
        
        return {
            success: true,
            extractedContent,
            aiResult
        };
        
    } catch (error) {
        console.error(`\n💥 Test failed:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Test with mock content (no external web scraping required)
async function testWithMockContent() {
    console.log(`\n🔄 Testing with mock content...`);
    
    const mockContent = {
        title: "Breakthrough in Quantum Computing: Scientists Achieve 99% Fidelity in Quantum Gates",
        description: "Researchers at leading universities have made significant progress in quantum computing technology, achieving unprecedented accuracy in quantum gate operations.",
        content: `Scientists have announced a major breakthrough in quantum computing technology, achieving 99% fidelity in quantum gate operations. This advancement brings us significantly closer to practical quantum computers that could revolutionize fields from cryptography to drug discovery.

The research team, led by Dr. Sarah Chen at the Institute for Advanced Physics, developed a new error correction technique that dramatically reduces quantum decoherence. "This is a game-changer for the field," said Dr. Chen. "We've been working on this problem for over a decade, and these results exceed our most optimistic projections."

The breakthrough involves a novel approach to quantum error correction using topological qubits, which are inherently more stable than traditional qubits. The team's method combines advanced materials science with sophisticated control algorithms to maintain quantum coherence for extended periods.

Industry experts believe this development could accelerate the timeline for practical quantum computers by several years. Major technology companies have already expressed interest in licensing the technology for their quantum computing initiatives.

The research has implications beyond computing, potentially advancing quantum sensing, quantum communication, and fundamental physics research. The team plans to publish their findings in the journal Nature Quantum Information next month.`,
        url: "https://example.com/quantum-breakthrough-2024",
        extractedAt: new Date().toISOString()
    };
    
    try {
        const aiResult = await testDirectAIExtraction(mockContent);
        
        console.log(`✅ Mock content test completed successfully!`);
        return { success: true, extractedContent: mockContent, aiResult };
        
    } catch (error) {
        console.error(`❌ Mock content test failed:`, error.message);
        return { success: false, error: error.message };
    }
}

// Alternative test with a simple news URL
async function testWithSimpleNewsURL() {
    console.log(`\n🔄 Testing with a simple news URL...`);
    
    // Use a more accessible news URL
    const simpleURL = 'https://httpbin.org/html';
    
    try {
        const extractedContent = await extractWebContent(simpleURL);
        const aiResult = await testDirectAIExtraction(extractedContent);
        
        console.log(`✅ Simple URL test completed successfully!`);
        return { success: true, extractedContent, aiResult };
        
    } catch (error) {
        console.error(`❌ Simple URL test failed:`, error.message);
        return { success: false, error: error.message };
    }
}

// Run the test
if (require.main === module) {
    // Start with mock content test (most reliable)
    testWithMockContent()
        .then(result => {
            if (result.success) {
                console.log(`\n🎉 Mock content test successful! Now trying with real web content...`);
                return runDirectAITest();
            } else {
                console.log(`\n⚠️ Mock content test failed, trying with simple URL...`);
                return testWithSimpleNewsURL();
            }
        })
        .then(result => {
            if (!result.success) {
                console.log(`\n🔄 Trying with alternative URL...`);
                return testWithSimpleNewsURL();
            }
            return result;
        })
        .then(finalResult => {
            console.log(`\n📊 Final Test Result:`, finalResult.success ? '✅ SUCCESS' : '❌ FAILED');
            process.exit(finalResult.success ? 0 : 1);
        })
        .catch(error => {
            console.error(`💥 Unexpected error:`, error);
            process.exit(1);
        });
}

module.exports = {
    extractWebContent,
    testDirectAIExtraction,
    runDirectAITest,
    testWithMockContent
};
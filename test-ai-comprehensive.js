const axios = require('axios');

const STRAPI_URL = 'http://localhost:1337';
const TIMEOUT = 60000; // 60 seconds for AI processing

// Test scenarios with different content types
const testScenarios = [
  {
    name: "Short News Article",
    content: {
      title: "Breaking: New Technology Breakthrough",
      description: "Scientists announce major discovery in renewable energy",
      url: "https://example.com/tech-breakthrough",
      content: `
        <article>
          <h1>Revolutionary Solar Panel Technology Achieves 45% Efficiency</h1>
          <p>Scientists at MIT have developed a new type of solar panel that can convert 45% of sunlight into electricity, nearly doubling the efficiency of current commercial panels.</p>
          <p>The breakthrough uses a novel perovskite-silicon tandem design that captures both visible and infrared light more effectively than traditional silicon panels.</p>
          <p>"This could revolutionize the renewable energy industry," said Dr. Sarah Chen, lead researcher on the project.</p>
          <p>The technology is expected to be commercially available within the next three years, potentially reducing solar energy costs by 40%.</p>
        </article>
      `
    }
  },
  {
    name: "Long Technical Article",
    content: {
      title: "Comprehensive Guide to Quantum Computing",
      description: "An in-depth look at quantum computing principles and applications",
      url: "https://example.com/quantum-guide",
      content: `
        <article>
          <h1>Understanding Quantum Computing: From Theory to Practice</h1>
          <h2>Introduction</h2>
          <p>Quantum computing represents a fundamental shift in how we process information. Unlike classical computers that use bits (0 or 1), quantum computers use quantum bits or qubits that can exist in multiple states simultaneously.</p>
          
          <h2>Key Principles</h2>
          <p>The power of quantum computing comes from three key quantum mechanical phenomena:</p>
          <ul>
            <li><strong>Superposition:</strong> Qubits can exist in multiple states at once</li>
            <li><strong>Entanglement:</strong> Qubits can be correlated in ways that classical physics cannot explain</li>
            <li><strong>Interference:</strong> Quantum states can be manipulated to amplify correct answers and cancel wrong ones</li>
          </ul>
          
          <h2>Current Applications</h2>
          <p>Today's quantum computers are being used for:</p>
          <ul>
            <li>Cryptography and security</li>
            <li>Drug discovery and molecular modeling</li>
            <li>Financial modeling and risk analysis</li>
            <li>Optimization problems in logistics</li>
            <li>Machine learning and AI enhancement</li>
          </ul>
          
          <h2>Challenges and Limitations</h2>
          <p>Despite their potential, quantum computers face significant challenges including quantum decoherence, error rates, and the need for extremely low temperatures. Current quantum computers require sophisticated error correction and can only maintain quantum states for microseconds.</p>
          
          <h2>Future Outlook</h2>
          <p>Experts predict that quantum computers will achieve "quantum advantage" in specific applications within the next decade. Companies like IBM, Google, and Microsoft are investing billions in quantum research, while startups are exploring novel approaches to quantum hardware and software.</p>
          
          <p>The quantum computing market is expected to reach $65 billion by 2030, driven by advances in quantum hardware, software, and cloud-based quantum services.</p>
        </article>
      `
    }
  },
  {
    name: "News with Mixed Content",
    content: {
      title: "Global Climate Summit Reaches Historic Agreement",
      description: "World leaders agree on ambitious climate targets",
      url: "https://example.com/climate-summit",
      content: `
        <article>
          <h1>Historic Climate Agreement Reached at COP30</h1>
          <div class="metadata">
            <span class="author">By Environmental Reporter</span>
            <span class="date">October 11, 2025</span>
            <span class="location">Dubai, UAE</span>
          </div>
          
          <p class="lead">World leaders have reached a groundbreaking agreement at the COP30 climate summit, committing to unprecedented action on climate change.</p>
          
          <h2>Key Commitments</h2>
          <p>The agreement includes several major commitments:</p>
          <blockquote>
            "This is the most ambitious climate agreement in history. We are finally taking the action our planet desperately needs."
            <cite>- UN Secretary-General</cite>
          </blockquote>
          
          <ul>
            <li>Net-zero emissions by 2040 for developed nations</li>
            <li>$500 billion climate fund for developing countries</li>
            <li>Mandatory renewable energy targets</li>
            <li>Phase-out of fossil fuel subsidies by 2030</li>
          </ul>
          
          <h2>Implementation Timeline</h2>
          <table>
            <tr><th>Year</th><th>Target</th></tr>
            <tr><td>2026</td><td>50% reduction in fossil fuel subsidies</td></tr>
            <tr><td>2028</td><td>30% renewable energy globally</td></tr>
            <tr><td>2030</td><td>Complete fossil fuel subsidy phase-out</td></tr>
            <tr><td>2040</td><td>Net-zero emissions for developed nations</td></tr>
          </table>
          
          <p>Environmental groups have praised the agreement while noting that implementation will be crucial for its success.</p>
        </article>
      `
    }
  }
];

async function testAIExtraction(scenario) {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log(`📄 Content length: ${scenario.content.content.length} characters`);
  
  try {
    const startTime = Date.now();
    
    const response = await axios.post(
      `${STRAPI_URL}/api/news-feed/test-ai-extraction`,
      scenario.content,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: TIMEOUT
      }
    );
    
    const processingTime = Date.now() - startTime;
    
    if (response.data && response.data.success && response.data.data) {
      const result = response.data.data; // The actual extraction data is nested under 'data'
      console.log(`✅ AI extraction successful!`);
      console.log(`   📝 Extracted content: ${result.content ? result.content.length : 0} characters`);
      console.log(`   🏷️  Tags: ${result.tags ? result.tags.length : 0} tags`);
      console.log(`   🖼️  Images: ${result.images ? result.images.length : 0} images`);
      console.log(`   ⭐ Quality: ${result.quality || 'unknown'}`);
      console.log(`   🔧 Method: ${result.method || 'unknown'}`);
      console.log(`   📊 Word count: ${result.wordCount || 0}`);
      console.log(`   ⏱️  Processing time: ${result.processingTime || 'unknown'}`);
      console.log(`   🕐 Total time: ${processingTime}ms`);
      console.log(`   💬 Server message: ${response.data.message}`);
      
      return {
        success: true,
        scenario: scenario.name,
        result: result,
        totalTime: processingTime
      };
    } else {
      console.log(`❌ AI extraction failed: Invalid response format`);
      return {
        success: false,
        scenario: scenario.name,
        error: 'Invalid response format'
      };
    }
  } catch (error) {
    console.log(`❌ AI extraction failed: ${error.message}`);
    return {
      success: false,
      scenario: scenario.name,
      error: error.message
    };
  }
}

async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive AI Extraction Test');
  console.log(`⚙️  Configuration:`);
  console.log(`   🌐 Strapi URL: ${STRAPI_URL}`);
  console.log(`   ⏱️  Timeout: ${TIMEOUT}ms`);
  console.log(`   🧪 Test scenarios: ${testScenarios.length}`);
  
  const results = [];
  
  for (const scenario of testScenarios) {
    const result = await testAIExtraction(scenario);
    results.push(result);
    
    // Wait a bit between tests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful tests: ${successful.length}/${results.length}`);
  console.log(`❌ Failed tests: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n🎯 Successful Tests:');
    successful.forEach(result => {
      console.log(`   ✅ ${result.scenario}: ${result.result.quality} quality, ${result.totalTime}ms`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n💥 Failed Tests:');
    failed.forEach(result => {
      console.log(`   ❌ ${result.scenario}: ${result.error}`);
    });
  }
  
  // Performance analysis
  if (successful.length > 0) {
    const avgTime = successful.reduce((sum, r) => sum + r.totalTime, 0) / successful.length;
    console.log(`\n⚡ Performance:`);
    console.log(`   📈 Average processing time: ${Math.round(avgTime)}ms`);
    console.log(`   🏃 Fastest: ${Math.min(...successful.map(r => r.totalTime))}ms`);
    console.log(`   🐌 Slowest: ${Math.max(...successful.map(r => r.totalTime))}ms`);
  }
  
  const overallSuccess = successful.length === results.length;
  console.log(`\n🎉 Overall Result: ${overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  return overallSuccess;
}

// Run the test
runComprehensiveTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
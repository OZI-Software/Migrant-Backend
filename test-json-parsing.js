/**
 * Test JSON parsing logic with the actual AI response format
 */

// Simulate the AI response that's causing issues
const aiResponse = `\`\`\`json
{
  "title": "AI Revolutionizes Drug Discovery Process",
  "excerpt": "Artificial intelligence is transforming how scientists discover new drugs, significantly reducing the time and cost involved in bringing new treatments to market.",
  "content": "<p>Artificial intelligence is revolutionizing the field of drug discovery, offering new hope for faster and more efficient development of life-saving medications. Traditional drug discovery is a lengthy and expensive process, often taking 10-15 years and requiring extensive laboratory testing.</p><p>AI algorithms can analyze massive datasets of chemical compounds, biological pathways, and clinical trial results to identify potential drug candidates. These algorithms can predict how a drug will interact with the body, its potential side effects, and its likelihood of success in clinical trials. This allows scientists to prioritize the most promising candidates and avoid wasting time and resources on those that are unlikely to succeed.</p><p>Furthermore, AI can help scientists design new drugs with specific properties. By analyzing the structure of existing drugs and their interactions with target molecules, AI can suggest modifications that could improve their effectiveness or reduce their side effects. This can lead to the development of more targeted and personalized therapies.</p><p>The use of AI in drug discovery is still in its early stages, but the potential benefits are enormous. As AI algorithms become more sophisticated and more data becomes available, we can expect to see even greater advances in this field. AI has the potential to revolutionize the way drugs are discovered and developed, leading to faster, cheaper, and more effective treatments for a wide range of diseases.</p>",
  "slug": "ai-drug-discovery-science",
  "seoTitle": "AI in Drug Discovery: Accelerating Scientific Breakthroughs",
  "seoDescription": "Explore how artificial intelligence is revolutionizing drug discovery, speeding up the process, and leading to more effective treatments for diseases. Learn about the latest advancements.",
  "tags": ["artificial intelligence", "drug discovery", "AI", "science", "research", "pharmaceuticals"],
  "location": "Global"
}
\`\`\``;

function testJSONParsing(response) {
  console.log('🧪 Testing JSON parsing logic...');
  console.log('Original response length:', response.length);
  console.log('First 100 chars:', response.substring(0, 100));
  
  try {
    // Clean the response to extract JSON
    let jsonStr = response.trim();
    console.log('\n📝 Step 1: Initial trim');
    console.log('Length after trim:', jsonStr.length);
    
    // Multiple cleaning strategies for different response formats
    // Remove markdown code blocks if present
    if (jsonStr.includes('```json')) {
      console.log('\n🔍 Found ```json blocks');
      const match = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonStr = match[1].trim();
        console.log('✅ Extracted JSON from markdown blocks');
        console.log('Length after extraction:', jsonStr.length);
      }
    } else if (jsonStr.includes('```')) {
      console.log('\n🔍 Found generic ``` blocks');
      const match = jsonStr.match(/```\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonStr = match[1].trim();
        console.log('✅ Extracted content from generic markdown blocks');
        console.log('Length after extraction:', jsonStr.length);
      }
    }

    // Find JSON object in the response (more robust)
    let jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
      console.log('\n🎯 Extracted JSON object from response');
      console.log('Length after JSON extraction:', jsonStr.length);
    } else {
      console.log('\n⚠️ No JSON object found with regex');
      // If no JSON found, try to find it after any text
      const lines = jsonStr.split('\n');
      const jsonStartIndex = lines.findIndex(line => line.trim().startsWith('{'));
      if (jsonStartIndex >= 0) {
        jsonStr = lines.slice(jsonStartIndex).join('\n');
        console.log(`🎯 Found JSON starting at line ${jsonStartIndex}`);
        console.log('Length after line extraction:', jsonStr.length);
      }
    }

    // Additional cleaning for common issues
    jsonStr = jsonStr
      .replace(/^\s*Here's the JSON.*?:\s*/i, '') // Remove explanatory text
      .replace(/^\s*The JSON output.*?:\s*/i, '') // Remove explanatory text
      .replace(/^\s*JSON:\s*/i, '') // Remove "JSON:" prefix
      .trim();

    console.log('\n🧹 Final cleaned JSON length:', jsonStr.length);
    console.log('First 200 chars of cleaned JSON:', jsonStr.substring(0, 200));
    console.log('Last 100 chars of cleaned JSON:', jsonStr.substring(jsonStr.length - 100));

    const parsed = JSON.parse(jsonStr);
    console.log('\n✅ JSON parsing successful!');
    console.log('Title:', parsed.title);
    console.log('Content length:', parsed.content?.length || 0);
    console.log('First 100 chars of content:', parsed.content?.substring(0, 100) || 'No content');
    
    return parsed;
    
  } catch (error) {
    console.log('\n❌ JSON parsing failed:', error.message);
    console.log('Error details:', error);
    return null;
  }
}

// Test with the problematic response
testJSONParsing(aiResponse);
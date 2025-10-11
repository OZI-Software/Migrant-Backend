// Test the breaking news logic specifically
function isBreakingNews(title, content, category = '') {
  // For Top Stories, always mark as breaking news
  if (category === 'topStories') {
    return true;
  }

  const breakingKeywords = [
    'breaking', 'urgent', 'alert', 'developing', 'just in',
    'live updates', 'emergency', 'crisis', 'major'
  ];

  const text = `${title} ${content}`.toLowerCase();
  return breakingKeywords.some(keyword => text.includes(keyword));
}

console.log('=== Testing Breaking News Logic ===\n');

// Test cases
const testCases = [
  {
    title: 'Regular News Article',
    content: 'This is a normal news article about politics.',
    category: 'topStories',
    expected: true,
    reason: 'Top Stories should always be breaking'
  },
  {
    title: 'Regular News Article',
    content: 'This is a normal news article about politics.',
    category: 'world',
    expected: false,
    reason: 'World news without breaking keywords should not be breaking'
  },
  {
    title: 'Breaking News: Major Event',
    content: 'This is breaking news about a major event.',
    category: 'world',
    expected: true,
    reason: 'World news with breaking keywords should be breaking'
  },
  {
    title: 'White House Signals Federal Layoffs Have Begun Amid Government Shutdown',
    content: 'Government shutdown continues...',
    category: 'world',
    expected: false,
    reason: 'No breaking keywords in this title/content'
  },
  {
    title: 'URGENT: Emergency Alert Issued',
    content: 'Emergency services respond to crisis.',
    category: 'politics',
    expected: true,
    reason: 'Contains urgent, emergency, and crisis keywords'
  }
];

testCases.forEach((testCase, index) => {
  const result = isBreakingNews(testCase.title, testCase.content, testCase.category);
  const status = result === testCase.expected ? '✓ PASS' : '❌ FAIL';
  
  console.log(`Test ${index + 1}: ${status}`);
  console.log(`  Title: ${testCase.title}`);
  console.log(`  Category: ${testCase.category}`);
  console.log(`  Expected: ${testCase.expected}, Got: ${result}`);
  console.log(`  Reason: ${testCase.reason}`);
  
  if (result !== testCase.expected) {
    console.log(`  ❌ FAILURE DETAILS:`);
    const text = `${testCase.title} ${testCase.content}`.toLowerCase();
    const breakingKeywords = ['breaking', 'urgent', 'alert', 'developing', 'just in', 'live updates', 'emergency', 'crisis', 'major'];
    const foundKeywords = breakingKeywords.filter(keyword => text.includes(keyword));
    console.log(`  Found keywords: ${foundKeywords.length > 0 ? foundKeywords.join(', ') : 'none'}`);
    console.log(`  Full text: ${text}`);
  }
  console.log('');
});

console.log('=== Breaking News Logic Test Complete ===');
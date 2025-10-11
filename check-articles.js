const http = require('http');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function checkArticles() {
  try {
    console.log('Checking articles in database...');
    
    // Check articles via API
    const data = await makeRequest('http://localhost:1337/api/articles?pagination[pageSize]=10');
    
    console.log(`Total articles found: ${data.meta?.pagination?.total || 0}`);
    console.log(`Articles on this page: ${data.data?.length || 0}`);
    
    if (data.data && data.data.length > 0) {
      console.log('\nRecent articles:');
      data.data.forEach((article, index) => {
        console.log(`${index + 1}. ${article.attributes.title}`);
        console.log(`   - Published: ${article.attributes.publishedDate || 'Not set'}`);
        console.log(`   - Breaking: ${article.attributes.isBreaking || false}`);
        console.log(`   - Source: ${article.attributes.sourceUrl || 'Not set'}`);
        console.log('');
      });
    } else {
      console.log('No articles found in database.');
    }
    
    // Also check authors and categories
    console.log('\n--- Checking Authors ---');
    const authorsData = await makeRequest('http://localhost:1337/api/authors');
    console.log(`Total authors: ${authorsData.meta?.pagination?.total || 0}`);
    
    console.log('\n--- Checking Categories ---');
    const categoriesData = await makeRequest('http://localhost:1337/api/categories');
    console.log(`Total categories: ${categoriesData.meta?.pagination?.total || 0}`);
    
  } catch (error) {
    console.error('Error checking database:', error.message);
  }
}

checkArticles();
const axios = require('axios');

async function traceScienceImport() {
  console.log('🔬 Tracing Science category import process...\n');

  try {
    // Test 1: Import Science with detailed response
    console.log('Test 1: Importing Science category with 1 article...');
    const response1 = await axios.post('http://localhost:1337/api/news-feed/import', {
      categories: ['Science'],
      maxArticlesPerCategory: 1
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Science import result:', response1.data);
    console.log('');

    // Test 2: Compare with World category
    console.log('Test 2: Importing World category with 1 article for comparison...');
    const response2 = await axios.post('http://localhost:1337/api/news-feed/import', {
      categories: ['World'],
      maxArticlesPerCategory: 1
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ World import result:', response2.data);
    console.log('');

    // Test 3: Check if articles exist in database
    console.log('Test 3: Checking recent articles in database...');
    const articlesResponse = await axios.get('http://localhost:1337/api/articles?pagination[limit]=10&sort=createdAt:desc&populate=category');
    
    console.log(`✅ Found ${articlesResponse.data.data.length} recent articles:`);
    articlesResponse.data.data.forEach((article, index) => {
      console.log(`  ${index + 1}. "${article.attributes.title}" (Category: ${article.attributes.category?.data?.attributes?.name || 'None'})`);
    });
    console.log('');

    // Test 4: Check Science category specifically
    console.log('Test 4: Checking Science category articles...');
    const scienceArticlesResponse = await axios.get('http://localhost:1337/api/articles?filters[category][name][$eq]=Science&populate=category');
    
    console.log(`✅ Found ${scienceArticlesResponse.data.data.length} Science articles:`);
    scienceArticlesResponse.data.data.forEach((article, index) => {
      console.log(`  ${index + 1}. "${article.attributes.title}" (Created: ${article.attributes.createdAt})`);
    });
    console.log('');

    // Test 5: Check categories
    console.log('Test 5: Checking available categories...');
    const categoriesResponse = await axios.get('http://localhost:1337/api/categories');
    
    console.log(`✅ Found ${categoriesResponse.data.data.length} categories:`);
    categoriesResponse.data.data.forEach((category, index) => {
      console.log(`  ${index + 1}. "${category.attributes.name}" (ID: ${category.id})`);
    });
    console.log('');

    // Test 6: Try importing multiple categories
    console.log('Test 6: Testing multiple categories at once...');
    const response6 = await axios.post('http://localhost:1337/api/news-feed/import', {
      categories: ['Science', 'World', 'Sport'],
      maxArticlesPerCategory: 1
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Multiple categories import result:', response6.data);

  } catch (error) {
    console.log(`❌ Error during tracing: ${error.message}`);
    if (error.response) {
      console.log(`Response status: ${error.response.status}`);
      console.log(`Response data:`, error.response.data);
    }
  }
}

traceScienceImport().catch(console.error);
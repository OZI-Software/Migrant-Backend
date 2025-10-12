const axios = require('axios');

const BASE_URL = 'http://localhost:1337/api';

async function debugArticleTitles() {
  try {
    console.log('🔍 Fetching articles from Strapi API...');
    
    const response = await axios.get(`${BASE_URL}/articles?populate=*&pagination[pageSize]=15&sort=createdAt:desc`);
    const articles = response.data.data;
    console.log(`\n📰 Found ${articles.length} recent articles:\n`);

    articles.forEach((article, index) => {
      const attrs = article.attributes;
      console.log(`--- Article ${index + 1} ---`);
      console.log(`ID: ${article.id}`);
      console.log(`Title: "${attrs.title}"`);
      console.log(`Slug: "${attrs.slug}"`);
      console.log(`Author: "${attrs.author?.data?.attributes?.name || attrs.author || 'None'}"`);
      console.log(`Source URL: "${attrs.sourceUrl}"`);
      console.log(`Resolved URL: "${attrs.resolvedUrl}"`);
      console.log(`Category: "${attrs.category?.data?.attributes?.name || attrs.category || 'None'}"`);
      console.log(`Status: "${attrs.status}"`);
      console.log(`Created: ${attrs.createdAt}`);
      console.log(`Content Length: ${attrs.content ? attrs.content.length : 0} chars`);
      console.log(`Excerpt: "${attrs.excerpt ? attrs.excerpt.substring(0, 100) + '...' : 'None'}"`);
      console.log('');
    });

    // Check for articles with "Google News" in title
    const googleNewsArticles = articles.filter(article => 
      article.attributes.title && article.attributes.title.includes('Google News')
    );

    if (googleNewsArticles.length > 0) {
      console.log(`\n⚠️ Found ${googleNewsArticles.length} articles with "Google News" in title:`);
      googleNewsArticles.forEach((article, index) => {
        console.log(`${index + 1}. "${article.attributes.title}" (ID: ${article.id})`);
      });
    } else {
      console.log('\n✅ No articles found with "Google News" in title');
    }

    // Also check for articles with "Google News" as author
    const googleNewsAuthors = articles.filter(article => {
      const author = article.attributes.author?.data?.attributes?.name || article.attributes.author || '';
      return author.includes('Google News');
    });

    if (googleNewsAuthors.length > 0) {
      console.log(`\n⚠️ Found ${googleNewsAuthors.length} articles with "Google News" as author:`);
      googleNewsAuthors.forEach((article, index) => {
        const author = article.attributes.author?.data?.attributes?.name || article.attributes.author || '';
        console.log(`${index + 1}. "${article.attributes.title}" - Author: "${author}" (ID: ${article.id})`);
      });
    } else {
      console.log('\n✅ No articles found with "Google News" as author');
    }

  } catch (error) {
    console.error('❌ Error fetching articles:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

debugArticleTitles();
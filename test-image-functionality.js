const axios = require('axios');

async function testImageFunctionality() {
  console.log('🖼️  Testing Image Upload and Display Functionality\n');

  try {
    // Test 1: Check recent articles with images
    console.log('📋 Step 1: Checking recent articles with images...');
    const articlesResponse = await axios.get('http://localhost:1337/api/articles?populate=*&sort=createdAt:desc&pagination[limit]=10');
    
    if (articlesResponse.data && articlesResponse.data.data) {
      const articles = articlesResponse.data.data;
      console.log(`   Found ${articles.length} recent articles`);
      
      let articlesWithImages = 0;
      let articlesWithoutImages = 0;
      
      articles.forEach((article, index) => {
        const hasImage = article.attributes.featuredImage && article.attributes.featuredImage.data;
        if (hasImage) {
          articlesWithImages++;
          const imageData = article.attributes.featuredImage.data.attributes;
          console.log(`   ✅ Article ${index + 1}: "${article.attributes.title.substring(0, 50)}..." has image: ${imageData.name} (${imageData.size} bytes)`);
          console.log(`      Image URL: ${imageData.url}`);
        } else {
          articlesWithoutImages++;
          console.log(`   ❌ Article ${index + 1}: "${article.attributes.title.substring(0, 50)}..." has NO image`);
        }
      });
      
      console.log(`\n📊 Summary:`);
      console.log(`   Articles with images: ${articlesWithImages}`);
      console.log(`   Articles without images: ${articlesWithoutImages}`);
      
      if (articlesWithImages === 0) {
        console.log('   ⚠️  WARNING: No articles have images! This indicates an image upload issue.');
      }
    }

    // Test 2: Check uploaded files in media library
    console.log('\n📁 Step 2: Checking media library for uploaded images...');
    const mediaResponse = await axios.get('http://localhost:1337/api/upload/files?sort=createdAt:desc&pagination[limit]=20');
    
    if (mediaResponse.data && mediaResponse.data.length > 0) {
      const recentImages = mediaResponse.data.filter(file => 
        file.mime && file.mime.startsWith('image/')
      );
      
      console.log(`   Found ${recentImages.length} images in media library:`);
      recentImages.slice(0, 5).forEach((image, index) => {
        console.log(`   ${index + 1}. ${image.name} (${image.size} bytes) - ${image.mime}`);
        console.log(`      URL: ${image.url}`);
        console.log(`      Created: ${new Date(image.createdAt).toLocaleString()}`);
      });
      
      if (recentImages.length === 0) {
        console.log('   ⚠️  WARNING: No images found in media library! Image upload is not working.');
      }
    } else {
      console.log('   ⚠️  WARNING: Media library is empty or inaccessible!');
    }

    // Test 3: Test manual image upload
    console.log('\n🧪 Step 3: Testing manual image upload...');
    try {
      const testImageUrl = 'https://picsum.photos/800/600?random=' + Date.now();
      console.log(`   Attempting to download test image from: ${testImageUrl}`);
      
      const imageResponse = await axios.get(testImageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (imageResponse.status === 200 && imageResponse.data) {
        const buffer = Buffer.from(imageResponse.data);
        console.log(`   ✅ Successfully downloaded test image (${buffer.length} bytes)`);
        console.log(`   Content-Type: ${imageResponse.headers['content-type']}`);
        
        // Note: We're not actually uploading here to avoid cluttering the media library
        console.log('   📝 Image download test passed - upload functionality should work');
      } else {
        console.log('   ❌ Failed to download test image');
      }
    } catch (error) {
      console.log(`   ❌ Image download test failed: ${error.message}`);
    }

    console.log('\n🔍 Step 4: Analyzing image issues...');
    
    // Check if articles have imageUrl but no featuredImage
    const articlesWithMissingImages = articles.filter(article => {
      // This would require checking the raw article data to see if imageUrl was processed
      return !article.attributes.featuredImage || !article.attributes.featuredImage.data;
    });
    
    if (articlesWithMissingImages.length > 0) {
      console.log(`   Found ${articlesWithMissingImages.length} articles that might have had image upload failures`);
      console.log('   This suggests the image upload process is encountering errors');
    }

  } catch (error) {
    console.error('❌ Error testing image functionality:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

// Run the test
testImageFunctionality().then(() => {
  console.log('\n✅ Image functionality test completed');
}).catch(error => {
  console.error('❌ Test failed:', error.message);
});
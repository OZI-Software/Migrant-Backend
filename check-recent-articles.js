// Simple script to check recent articles and their content
const { execSync } = require('child_process');

// Function to run Strapi command and capture output
function runStrapiCommand(command) {
  try {
    const output = execSync(`npx strapi console`, {
      input: command,
      encoding: 'utf8',
      timeout: 10000,
      cwd: process.cwd()
    });
    return output;
  } catch (error) {
    console.error('Error running Strapi command:', error.message);
    return null;
  }
}

// Alternative approach: Use direct database query
async function checkArticlesDirectly() {
  console.log('🔍 Checking Recent Articles\n');
  
  try {
    // Check if we can access the database file
    const fs = require('fs');
    const path = require('path');
    
    const dbPath = path.join(process.cwd(), '.tmp', 'data.db');
    
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      console.log(`📊 Database file exists: ${dbPath}`);
      console.log(`   Size: ${Math.round(stats.size / 1024)} KB`);
      console.log(`   Last modified: ${stats.mtime.toLocaleString()}`);
      
      // Check if database was recently modified (indicating new articles)
      const timeDiff = Date.now() - stats.mtime.getTime();
      const minutesAgo = Math.round(timeDiff / (1000 * 60));
      
      if (minutesAgo < 10) {
        console.log(`   ✅ Database was modified ${minutesAgo} minutes ago (recent activity)`);
      } else {
        console.log(`   ⚠️  Database was modified ${minutesAgo} minutes ago`);
      }
    } else {
      console.log('❌ Database file not found');
    }
    
    // Try to read the uploads directory to check for images
    const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
    
    if (fs.existsSync(uploadsPath)) {
      const files = fs.readdirSync(uploadsPath);
      const imageFiles = files.filter(file => 
        file.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i)
      );
      
      console.log(`\n🖼️  Upload Directory: ${uploadsPath}`);
      console.log(`   Total files: ${files.length}`);
      console.log(`   Image files: ${imageFiles.length}`);
      
      if (imageFiles.length > 0) {
        console.log('   Recent images:');
        imageFiles.slice(-5).forEach((file, index) => {
          const filePath = path.join(uploadsPath, file);
          const stats = fs.statSync(filePath);
          const minutesAgo = Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60));
          console.log(`   ${index + 1}. ${file} (${Math.round(stats.size / 1024)} KB, ${minutesAgo}m ago)`);
        });
      }
    } else {
      console.log('\n📁 Uploads directory not found');
    }
    
    console.log('\n💡 To verify article content in detail, you can:');
    console.log('   1. Access the Strapi admin panel at http://localhost:1337/admin');
    console.log('   2. Navigate to Content Manager > Articles');
    console.log('   3. Check the recently created articles');
    console.log('   4. Verify they have proper content and featured images');
    
  } catch (error) {
    console.error('❌ Error checking articles:', error.message);
  }
}

// Run the check
checkArticlesDirectly();
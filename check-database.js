const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path (adjust if needed)
const dbPath = path.join(__dirname, '.tmp', 'data.db');

console.log('🗄️  Checking database for articles...');
console.log(`📍 Database path: ${dbPath}`);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to SQLite database');
});

// Check if articles table exists and get article count
db.serialize(() => {
  // Check tables
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      console.error('❌ Error getting tables:', err.message);
      return;
    }
    
    console.log('\n📋 Available tables:');
    tables.forEach(table => {
      console.log(`   - ${table.name}`);
    });
    
    // Check for articles
    const articleTables = tables.filter(t => t.name.includes('article'));
    if (articleTables.length === 0) {
      console.log('\n⚠️  No article tables found');
      db.close();
      return;
    }
    
    // Get article count from the main articles table
    const articlesTable = articleTables.find(t => t.name === 'articles') || articleTables[0];
    console.log(`\n📊 Checking ${articlesTable.name} table...`);
    
    db.get(`SELECT COUNT(*) as count FROM ${articlesTable.name}`, (err, row) => {
      if (err) {
        console.error('❌ Error counting articles:', err.message);
        db.close();
        return;
      }
      
      console.log(`📄 Total articles in database: ${row.count}`);
      
      if (row.count > 0) {
        // Get recent articles
        db.all(`SELECT * FROM ${articlesTable.name} ORDER BY created_at DESC LIMIT 5`, (err, articles) => {
          if (err) {
            console.error('❌ Error getting recent articles:', err.message);
          } else {
            console.log('\n📰 Recent articles:');
            articles.forEach((article, index) => {
              console.log(`\n${index + 1}. ${article.title || 'No title'}`);
              console.log(`   ID: ${article.id}`);
              console.log(`   Created: ${article.created_at}`);
              console.log(`   Source URL: ${article.source_url || 'No source URL'}`);
            });
          }
          
          db.close((err) => {
            if (err) {
              console.error('❌ Error closing database:', err.message);
            } else {
              console.log('\n✅ Database connection closed');
            }
          });
        });
      } else {
        console.log('\n📭 No articles found in database');
        console.log('💡 This could mean:');
        console.log('   - Cron jobs haven\'t run yet');
        console.log('   - Articles are being created in a different table');
        console.log('   - There\'s an issue with the article creation process');
        
        db.close();
      }
    });
  });
});
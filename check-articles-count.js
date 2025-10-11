const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '.tmp', 'data.db');

console.log('🔍 Checking Articles in Database\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to SQLite database');
});

// Check total articles count
db.get("SELECT COUNT(*) as count FROM articles", (err, row) => {
  if (err) {
    console.error('❌ Error counting articles:', err.message);
    return;
  }
  console.log(`📊 Total Articles: ${row.count}`);
});

// Check articles by category
db.all(`
  SELECT 
    category, 
    COUNT(*) as count,
    MAX(created_at) as latest_created
  FROM articles 
  GROUP BY category 
  ORDER BY count DESC
`, (err, rows) => {
  if (err) {
    console.error('❌ Error getting category stats:', err.message);
    return;
  }
  
  console.log('\n📈 Articles by Category:');
  rows.forEach(row => {
    const latestDate = new Date(row.latest_created).toLocaleString();
    console.log(`  ${row.category}: ${row.count} articles (Latest: ${latestDate})`);
  });
});

// Check recent articles
db.all(`
  SELECT 
    title, 
    category, 
    created_at,
    published_at
  FROM articles 
  ORDER BY created_at DESC 
  LIMIT 10
`, (err, rows) => {
  if (err) {
    console.error('❌ Error getting recent articles:', err.message);
    return;
  }
  
  console.log('\n📰 Recent Articles:');
  rows.forEach((row, index) => {
    const createdDate = new Date(row.created_at).toLocaleString();
    console.log(`  ${index + 1}. ${row.title}`);
    console.log(`     Category: ${row.category} | Created: ${createdDate}`);
  });
  
  // Close database connection
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err.message);
    } else {
      console.log('\n✅ Database connection closed');
    }
  });
});
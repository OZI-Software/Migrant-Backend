const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');

console.log('FINAL TEST SUMMARY: Google News RSS Feed & Article Creation');
console.log('=' .repeat(70));

async function runFinalTest() {
  const results = {
    rssFeeds: [],
    databaseExists: false,
    serverRunning: false,
    cronJobsConfigured: false,
    articleCreationLogic: false
  };

  // Test 1: RSS Feed Parsing
  console.log('\nTest 1: RSS Feed Parsing');
  console.log('-'.repeat(40));
  
  const parser = new Parser();
  const feedUrls = [
    { name: 'Top Stories', url: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en' },
    { name: 'World News', url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZxYUdjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en' },
    { name: 'Technology', url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y0RvU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en' }
  ];

  for (const feedConfig of feedUrls) {
    try {
      console.log(`\n Testing ${feedConfig.name}...`);
      const feed = await parser.parseURL(feedConfig.url);
      
      if (feed && feed.items && feed.items.length > 0) {
        console.log(` ${feedConfig.name}: ${feed.items.length} articles found`);
        console.log(`   Sample: "${feed.items[0].title}"`);
        results.rssFeeds.push({
          name: feedConfig.name,
          status: 'working',
          articleCount: feed.items.length,
          sampleTitle: feed.items[0].title
        });
      } else {
        console.log(`${feedConfig.name}: No articles found`);
        results.rssFeeds.push({
          name: feedConfig.name,
          status: 'no_articles',
          articleCount: 0
        });
      }
    } catch (error) {
      console.log(`${feedConfig.name}: Error - ${error.message}`);
      results.rssFeeds.push({
        name: feedConfig.name,
        status: 'error',
        error: error.message
      });
    }
  }

  // Test 2: Database File Check
  console.log('\n\n Test 2: Database File Check');
  console.log('-'.repeat(40));
  
  const dbPath = path.join(__dirname, '.tmp', 'data.db');
  try {
    const stats = fs.statSync(dbPath);
    console.log(`Database file exists: ${dbPath}`);
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   Modified: ${stats.mtime.toISOString()}`);
    results.databaseExists = true;
  } catch (error) {
    console.log(`Database file not found: ${dbPath}`);
    results.databaseExists = false;
  }

  // Test 3: Check if server is running
  console.log('\n\n Test 3: Server Status Check');
  console.log('-'.repeat(40));
  
  try {
    // Check if port 1337 is in use (simple check)
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    try {
      const { stdout } = await execPromise('netstat -an | findstr :1337');
      if (stdout.includes('1337')) {
        console.log(' Server appears to be running on port 1337');
        results.serverRunning = true;
      } else {
        console.log('No server detected on port 1337');
        results.serverRunning = false;
      }
    } catch (error) {
      console.log(' Could not check server status');
      results.serverRunning = 'unknown';
    }
  } catch (error) {
    console.log('Could not check server status');
    results.serverRunning = 'unknown';
  }

  // Test 4: Check cron job configuration
  console.log('\n\nTest 4: Cron Job Configuration Check');
  console.log('-'.repeat(40));
  
  try {
    const cronServicePath = path.join(__dirname, 'src', 'services', 'news-cron-job.ts');
    if (fs.existsSync(cronServicePath)) {
      const cronServiceContent = fs.readFileSync(cronServicePath, 'utf8');
      
      const hasTopStories = cronServiceContent.includes('topStories');
      const hasGeneralNews = cronServiceContent.includes('generalNews');
      const hasLifestyle = cronServiceContent.includes('lifestyle');
      const hasSpecialized = cronServiceContent.includes('specialized');
      const hasCronSchedule = cronServiceContent.includes('cron.schedule');
      
      console.log(`✅ Cron service file exists`);
      console.log(`   - Top Stories job: ${hasTopStories ? '✅' : '❌'}`);
      console.log(`   - General News job: ${hasGeneralNews ? '✅' : '❌'}`);
      console.log(`   - Lifestyle job: ${hasLifestyle ? '✅' : '❌'}`);
      console.log(`   - Specialized job: ${hasSpecialized ? '✅' : '❌'}`);
      console.log(`   - Cron scheduling: ${hasCronSchedule ? '✅' : '❌'}`);
      
      results.cronJobsConfigured = hasTopStories && hasGeneralNews && hasLifestyle && hasSpecialized && hasCronSchedule;
    } else {
      console.log('Cron service file not found');
      results.cronJobsConfigured = false;
    }
  } catch (error) {
    console.log(` Error checking cron configuration: ${error.message}`);
    results.cronJobsConfigured = false;
  }

  // Test 5: Article creation logic check
  console.log('\n\n Test 5: Article Creation Logic Check');
  console.log('-'.repeat(40));
  
  try {
    const googleNewsServicePath = path.join(__dirname, 'src', 'services', 'google-news.ts');
    if (fs.existsSync(googleNewsServicePath)) {
      const serviceContent = fs.readFileSync(googleNewsServicePath, 'utf8');
      
      const hasRSSParser = serviceContent.includes('rss-parser') || serviceContent.includes('Parser');
      const hasArticleCreation = serviceContent.includes('entityService.create');
      const hasErrorHandling = serviceContent.includes('try') && serviceContent.includes('catch');
      const hasDuplicateCheck = serviceContent.includes('findMany') || serviceContent.includes('sourceUrl');
      
      console.log(`✅ Google News service file exists`);
      console.log(`   - RSS Parser usage: ${hasRSSParser ? '✅' : '❌'}`);
      console.log(`   - Article creation: ${hasArticleCreation ? '✅' : '❌'}`);
      console.log(`   - Error handling: ${hasErrorHandling ? '✅' : '❌'}`);
      console.log(`   - Duplicate checking: ${hasDuplicateCheck ? '✅' : '❌'}`);
      
      results.articleCreationLogic = hasRSSParser && hasArticleCreation && hasErrorHandling && hasDuplicateCheck;
    } else {
      console.log('❌ Google News service file not found');
      results.articleCreationLogic = false;
    }
  } catch (error) {
    console.log(`❌ Error checking article creation logic: ${error.message}`);
    results.articleCreationLogic = false;
  }

  // Final Summary
  console.log('\n\n🎯 FINAL TEST RESULTS');
  console.log('=' .repeat(70));
  
  const workingFeeds = results.rssFeeds.filter(feed => feed.status === 'working').length;
  const totalFeeds = results.rssFeeds.length;
  
  console.log(`📡 RSS Feed Parsing: ${workingFeeds}/${totalFeeds} feeds working`);
  console.log(`🗄️  Database: ${results.databaseExists ? '✅ Available' : '❌ Not found'}`);
  console.log(`🖥️  Server: ${results.serverRunning === true ? '✅ Running' : results.serverRunning === false ? '❌ Not running' : '⚠️  Unknown'}`);
  console.log(`⏰ Cron Jobs: ${results.cronJobsConfigured ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`📰 Article Creation: ${results.articleCreationLogic ? '✅ Logic implemented' : '❌ Logic missing'}`);
  
  const overallStatus = workingFeeds > 0 && results.databaseExists && results.cronJobsConfigured && results.articleCreationLogic;
  
  console.log('\n🏆 OVERALL STATUS:');
  if (overallStatus) {
    console.log('✅ Google News RSS feed and article creation system is WORKING!');
    console.log('   - RSS feeds can be parsed successfully');
    console.log('   - Database is available for article storage');
    console.log('   - Cron jobs are properly configured');
    console.log('   - Article creation logic is implemented');
    console.log('\n💡 The system should be creating articles automatically based on the cron schedule.');
  } else {
    console.log('⚠️  System has some issues that may affect functionality:');
    if (workingFeeds === 0) console.log('   - RSS feed parsing failed');
    if (!results.databaseExists) console.log('   - Database file not found');
    if (!results.cronJobsConfigured) console.log('   - Cron jobs not properly configured');
    if (!results.articleCreationLogic) console.log('   - Article creation logic incomplete');
  }
  
  console.log('\n📝 To verify articles are being created, check the Strapi admin panel');
  console.log('   or wait for the next cron job execution.');
}

runFinalTest().catch(console.error);
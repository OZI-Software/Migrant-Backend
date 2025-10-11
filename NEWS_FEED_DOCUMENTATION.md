# Google News Feed Integration Documentation

## Overview

This system automatically collects news articles from Google News RSS feeds and publishes them to your Strapi CMS using scheduled cron jobs. The implementation follows Strapi best practices and includes comprehensive error handling, logging, and monitoring capabilities.

## Features

- **Automated News Collection**: Scheduled cron jobs fetch news from multiple Google News categories
- **Duplicate Prevention**: Tracks source URLs to prevent duplicate articles
- **Multiple Categories**: Supports various news categories (world, business, technology, etc.)
- **Manual Control**: API endpoints for manual import and job management
- **Comprehensive Logging**: Detailed logging and error tracking
- **Graceful Shutdown**: Proper cleanup when the application stops

## Architecture

### Services

1. **GoogleNewsFeedService** (`src/services/google-news-feed.ts`)

   - Fetches and parses Google News RSS feeds
   - Transforms news items to Strapi article format
   - Creates articles in the database
   - Handles duplicate detection

2. **NewsCronJobService** (`src/services/news-cron-job.ts`)

   - Manages scheduled cron jobs
   - Configures different import schedules for different categories
   - Provides manual job control

3. **NewsFeedLogger** (`src/services/news-feed-logger.ts`)
   - Comprehensive logging system
   - Job statistics tracking
   - Error monitoring and reporting

### API Endpoints

- `POST /api/news-feed/import` - Manually trigger news import
- `GET /api/news-feed/status` - Get job status and statistics
- `POST /api/news-feed/start` - Start all cron jobs
- `POST /api/news-feed/stop` - Stop all cron jobs

## Configuration

### Cron Job Schedules

The system uses the following default schedules:

- **Top Stories**: Every 30 minutes (`*/30 * * * *`)
- **General News** (world, business, technology): Every 2 hours (`0 */2 * * *`)
- **Lifestyle** (entertainment, sports): Every 4 hours (`0 */4 * * *`)
- **Specialized** (science, health): Every 6 hours (`0 */6 * * *`)

### Supported Categories

- `politics` - Poltical News
- `Econonmy` - Economy news
- `World` - World news
- `Science` - Science news
- `Society` - Society news
- `Law` - Law news
- `Culture` - Culture news
- `Security` - Security news
- `Health` - Health news
- `Sport` - Sport news

## Installation and Setup

### 1. Dependencies

The following packages are automatically installed:

```bash
npm install rss-parser node-cron axios
```

### 2. Database Schema

The article content type has been updated with:

- `sourceUrl` field to track original news sources
- Optional `featuredImage` and `imageAlt` fields

### 3. Automatic Startup

The system automatically starts when Strapi boots up through the bootstrap function in `src/index.ts`.

## Usage

### Manual Import

To manually import news articles:

```bash
curl -X POST http://localhost:1337/api/news-feed/import \
  -H "Content-Type: application/json" \
  -d '{
    "categories": ["topStories", "technology"],
    "maxArticlesPerCategory": 5
  }'
```

### Check Status

To check the status of cron jobs:

```bash
curl http://localhost:1337/api/news-feed/status
```

### Start/Stop Jobs

```bash
# Start all jobs
curl -X POST http://localhost:1337/api/news-feed/start

# Stop all jobs
curl -X POST http://localhost:1337/api/news-feed/stop
```

## Monitoring and Logging

### Log Levels

- **INFO**: Normal operations, job completions
- **WARN**: Non-critical issues, skipped articles
- **ERROR**: Failed operations, parsing errors
- **DEBUG**: Detailed operation information

### Job Statistics

The system tracks:

- Number of articles imported
- Number of articles skipped (duplicates)
- Number of errors encountered
- Job execution duration
- Success/failure rates

### Error Handling

The system includes comprehensive error handling for:

- Network failures when fetching RSS feeds
- Parsing errors for malformed RSS data
- Database connection issues
- Invalid article data
- Duplicate article detection

## Customization

### Modifying Schedules

To change cron schedules, edit the `getDefaultConfigs()` method in `NewsCronJobService`:

```typescript
topStories: {
  schedule: '*/15 * * * *', // Every 15 minutes instead of 30
  categories: ['topStories'],
  maxArticlesPerCategory: 10,
  enabled: true
}
```

### Adding New Categories

To add new Google News categories:

1. Find the RSS feed URL for the category
2. Add it to the `getFeedUrls()` method in `GoogleNewsFeedService`
3. Update the cron job configuration

### Custom Article Processing

To customize how articles are processed, modify the `transformToArticle()` method in `GoogleNewsFeedService`.

## Troubleshooting

### Common Issues

1. **No articles being imported**

   - Check if cron jobs are running: `GET /api/news-feed/status`
   - Verify network connectivity to Google News
   - Check Strapi logs for errors

2. **Duplicate articles**

   - The system should automatically prevent duplicates using `sourceUrl`
   - Check if the `sourceUrl` field exists in the article schema

3. **High memory usage**

   - Adjust `maxArticlesPerCategory` in job configurations
   - Implement log rotation by calling `clearOldLogs()` periodically

4. **RSS parsing errors**
   - Google News may change their RSS format
   - Check the `GoogleNewsFeedService` for parsing logic updates

### Debug Mode

To enable debug logging, set the Strapi log level to debug in your configuration.

## Performance Considerations

- **Rate Limiting**: The system includes small delays between article processing
- **Memory Management**: Logs are automatically rotated to prevent memory issues
- **Database Load**: Articles are created one at a time to avoid overwhelming the database
- **Network Efficiency**: RSS feeds are fetched once per category per job run

## Security

- **Input Validation**: All user inputs are validated
- **Error Sanitization**: Error messages don't expose sensitive information
- **Source Tracking**: All articles include source URLs for transparency

## Maintenance

### Regular Tasks

1. **Monitor Logs**: Check for recurring errors
2. **Database Cleanup**: Remove old articles if needed
3. **Performance Monitoring**: Watch for memory and CPU usage
4. **Update Dependencies**: Keep RSS parser and other dependencies updated

### Backup Considerations

- The system doesn't modify existing articles
- Source URLs allow for re-importing if needed
- Job statistics are kept in memory (consider persisting if needed)

## Support

For issues or questions:

1. Check the Strapi logs for detailed error information
2. Use the status endpoint to monitor job health
3. Review the error summary from the logging service
4. Consult the Strapi documentation for general CMS issues

## Version History

- **v1.0**: Initial implementation with basic RSS parsing and cron jobs
- **v1.1**: Added comprehensive logging and error handling
- **v1.2**: Added manual control API endpoints
- **v1.3**: Enhanced duplicate detection and article processing

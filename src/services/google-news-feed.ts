import Parser = require('rss-parser');
import axios from 'axios';
import { EnhancedArticleExtractor } from './enhanced-article-extractor';
import { ImageOptimizer } from './image-optimizer';
import { ContentFallbackService } from './content-fallback';
import AIContentExtractor from './ai-content-extractor';

interface GoogleNewsItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  guid: string;
  source?: string;
  description?: string;
}

interface OptimizedImage {
  url: string;
  alt: string;
  score: number;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
}

interface ExtractionResult {
  content: string;
  images: OptimizedImage[];
  extractionMethod: string;
  wordCount: number;
  contentQuality: 'excellent' | 'good' | 'fair' | 'poor';
  processingTime: number;
}

interface ParsedNewsItem {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  publishedDate: string;
  sourceUrl: string;
  location: string;
  readTime: number;
  seoTitle: string;
  seoDescription: string;
  isBreaking: boolean;
  imageUrl?: string;
  images?: OptimizedImage[];
  tags?: string[];
  extractionResult?: ExtractionResult;
}

class GoogleNewsFeedService {
  private parser: Parser;
  private readonly baseUrl = 'https://news.google.com/rss';
  private articleExtractor: EnhancedArticleExtractor;
  private imageOptimizer: ImageOptimizer;
  private fallbackService: ContentFallbackService;
  private aiContentExtractor: AIContentExtractor;
  private strapi: any;
  private processingStats: {
    totalProcessed: number;
    successfulExtractions: number;
    failedExtractions: number;
    averageProcessingTime: number;
    totalProcessingTime: number;
    totalImages: number;
    articlesWithImages: number;
    averageImageScore: number;
    imageExtractionStats: {
      totalImages: number;
      optimizedImages: number;
      averageScore: number;
    };
  };

  constructor(strapiInstance?: any) {
    // Set strapi instance - use provided instance or global strapi
    this.strapi = strapiInstance || (global as any).strapi;
    
    this.parser = new Parser({
      customFields: {
        item: ['source']
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    this.articleExtractor = new EnhancedArticleExtractor(this.strapi);
    this.imageOptimizer = new ImageOptimizer(this.strapi);
    this.fallbackService = new ContentFallbackService(this.strapi);
    this.aiContentExtractor = new AIContentExtractor(this.strapi);
    
    // Initialize processing statistics
    this.processingStats = {
      totalProcessed: 0,
      successfulExtractions: 0,
      failedExtractions: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0,
      totalImages: 0,
      articlesWithImages: 0,
      averageImageScore: 0,
      imageExtractionStats: {
        totalImages: 0,
        optimizedImages: 0,
        averageScore: 0
      }
    };
    
    this.strapi.log.info('🚀 Enhanced Google News Feed Service initialized with advanced extraction capabilities');
  }

  /**
   * Enhanced RSS processing with comprehensive logging and improved synchronization
   */
  async processRSSItemsWithEnhancedAI(category: string = 'World', maxArticles: number = 5): Promise<any[]> {
    const startTime = Date.now();
    
    try {
      this.strapi.log.info(`🚀 [ENHANCED-PIPELINE] Starting enhanced AI processing for category: ${category}, maxArticles: ${maxArticles}`);
      this.strapi.log.info(`🔧 [ENHANCED-PIPELINE] Pipeline configuration: URL resolution enabled, AI extraction enabled, Draft saving enabled`);

      // Step 1: Fetch RSS feed with enhanced logging
      this.strapi.log.info(`📡 [ENHANCED-PIPELINE] Step 1: Fetching RSS feed for category: ${category}`);
      const rssItems = await this.fetchFeed(category);
      this.strapi.log.info(`📊 [ENHANCED-PIPELINE] RSS feed fetched successfully: ${rssItems.length} items found`);

      // Step 2: Limit and validate items
      const limitedItems = rssItems.slice(0, maxArticles);
      this.strapi.log.info(`🎯 [ENHANCED-PIPELINE] Step 2: Limited to ${limitedItems.length} items for processing`);

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      // Step 3: Process each item with enhanced logging and error handling
      for (let i = 0; i < limitedItems.length; i++) {
        const rssItem = limitedItems[i];
        const itemStartTime = Date.now();
        
        try {
          this.strapi.log.info(`🔄 [ENHANCED-PIPELINE] Processing item ${i + 1}/${limitedItems.length}: "${rssItem.title}"`);
          this.strapi.log.info(`🔗 [ENHANCED-PIPELINE] Original URL: ${rssItem.link}`);

          // Step 3a: Pre-validate RSS item
          if (!rssItem.link || !rssItem.title) {
            throw new Error('Invalid RSS item: missing required link or title');
          }

          // Step 3b: Enhanced URL resolution with detailed logging
          this.strapi.log.info(`🔍 [ENHANCED-PIPELINE] Step 3b: Resolving URL for better content extraction`);
          const resolvedUrl = await this.resolveUrlWithRetry(rssItem.link);
          this.strapi.log.info(`✅ [ENHANCED-PIPELINE] URL resolved successfully: ${resolvedUrl}`);

          // Update RSS item with resolved URL for AI processing
          const enhancedRssItem = {
            ...rssItem,
            link: resolvedUrl,
            originalLink: rssItem.link
          };

          // Step 3c: AI content extraction with enhanced logging
          this.strapi.log.info(`🤖 [ENHANCED-PIPELINE] Step 3c: Starting AI content extraction`);
          const result = await this.aiContentExtractor.processRSSItemToArticle(enhancedRssItem, category);

          if (result.success) {
            const processingTime = Date.now() - itemStartTime;
            successCount++;
            
            results.push({
              success: true,
              article: result.article,
              title: result.extractedContent.title,
              slug: result.extractedContent.slug,
              processingTime: processingTime,
              aiProcessingTime: result.processingTime,
              originalUrl: rssItem.link,
              resolvedUrl: resolvedUrl,
              category: category
            });
            
            this.strapi.log.info(`✅ [ENHANCED-PIPELINE] Item ${i + 1} processed successfully in ${processingTime}ms`);
            this.strapi.log.info(`📝 [ENHANCED-PIPELINE] Article created: "${result.extractedContent.title}" (ID: ${result.article.id})`);
            this.strapi.log.info(`🏷️ [ENHANCED-PIPELINE] Generated slug: ${result.extractedContent.slug}`);
            this.strapi.log.info(`📍 [ENHANCED-PIPELINE] Location: ${result.extractedContent.location || 'Not specified'}`);
            this.strapi.log.info(`🏷️ [ENHANCED-PIPELINE] Tags: ${result.extractedContent.tags.join(', ')}`);
          } else {
            failureCount++;
            results.push({
              success: false,
              error: result.error,
              originalTitle: rssItem.title,
              originalUrl: rssItem.link,
              resolvedUrl: resolvedUrl,
              processingTime: Date.now() - itemStartTime
            });
            this.strapi.log.error(`❌ [ENHANCED-PIPELINE] Item ${i + 1} failed: ${rssItem.title} - ${result.error}`);
          }

          // Step 3d: Rate limiting to avoid overwhelming services
          if (i < limitedItems.length - 1) {
            this.strapi.log.info(`⏱️ [ENHANCED-PIPELINE] Applying rate limit: 2 second delay before next item`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

        } catch (error) {
          failureCount++;
          const processingTime = Date.now() - itemStartTime;
          
          this.strapi.log.error(`💥 [ENHANCED-PIPELINE] Critical error processing item ${i + 1}: ${rssItem.title}`, error);
          this.strapi.log.error(`🔍 [ENHANCED-PIPELINE] Error details: ${error.message}`);
          this.strapi.log.error(`⏱️ [ENHANCED-PIPELINE] Failed after ${processingTime}ms`);
          
          results.push({
            success: false,
            error: error.message,
            originalTitle: rssItem.title,
            originalUrl: rssItem.link,
            processingTime: processingTime
          });
        }
      }

      // Step 4: Final pipeline summary
      const totalTime = Date.now() - startTime;
      this.strapi.log.info(`🎉 [ENHANCED-PIPELINE] Processing complete!`);
      this.strapi.log.info(`📊 [ENHANCED-PIPELINE] Summary: ${successCount} successful, ${failureCount} failed out of ${limitedItems.length} total`);
      this.strapi.log.info(`⏱️ [ENHANCED-PIPELINE] Total processing time: ${totalTime}ms (avg: ${Math.round(totalTime / limitedItems.length)}ms per item)`);
      this.strapi.log.info(`📈 [ENHANCED-PIPELINE] Success rate: ${Math.round((successCount / limitedItems.length) * 100)}%`);

      // Update processing statistics
      this.updateBatchProcessingStats(successCount, failureCount, totalTime);

      return results;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.strapi.log.error(`💥 [ENHANCED-PIPELINE] Pipeline failed catastrophically after ${totalTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Get Google News RSS feed URLs for different topics
   * Using proper Google News category feeds instead of search queries for better category separation
   */
  private getFeedUrls() {
    const feedUrls = {
      // Using Google News topic feeds for better category separation
      Politics: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZxYUdjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`, // Politics
      Economy: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`, // Business
      World: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`, // World
      Security: `${this.baseUrl}/search?q=security+defense+military+terrorism+national+security&hl=en-US&gl=US&ceid=US:en&tbm=nws&tbs=qdr:d`, // Security (specific search with recent filter)
      Law: `${this.baseUrl}/search?q=law+legal+court+justice+supreme+court+lawsuit&hl=en-US&gl=US&ceid=US:en&tbm=nws&tbs=qdr:d`, // Law (specific search with recent filter)
      Science: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1RjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`, // Science
      Society: `${this.baseUrl}/search?q=society+social+community+culture+education+family&hl=en-US&gl=US&ceid=US:en&tbm=nws&tbs=qdr:d`, // Society (specific search with recent filter)
      Culture: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNREpxYW5RU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`, // Entertainment
      Sport: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1ZEdvU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en` // Sports
    };

    this.strapi.log.debug(`📡 [RSS-FEEDS] Generated category-specific RSS URLs:`, Object.keys(feedUrls));
    return feedUrls;
  }

  /**
   * Fetch and parse RSS feed from Google News
   */
  async fetchFeed(category: string = 'World'): Promise<GoogleNewsItem[]> {
    const feedUrls = this.getFeedUrls();
    
    const feedUrl = feedUrls[category] || feedUrls['World'];

    try {
      this.strapi.log.info(`Fetching Google News feed for category: ${category}`);
      
      const feed = await this.parser.parseURL(feedUrl);
      
      // Map RSS items to GoogleNewsItem format
      const allItems = feed.items.map(item => ({
        title: item.title || '',
        link: item.link || '',
        pubDate: item.pubDate || '',
        content: item.content || item.contentSnippet || '',
        contentSnippet: item.contentSnippet || '',
        guid: item.guid || item.link || '',
        source: item.source || 'Google News',
        description: item.contentSnippet || item.content || ''
      }));

      // Filter out low-quality content and PDFs
      const qualityItems = allItems.filter(item => this.isQualityContent(item));
      
      this.strapi.log.info(`Filtered ${allItems.length - qualityItems.length} low-quality items from ${allItems.length} total items for category: ${category}`);
      
      return qualityItems;
    } catch (error) {
      this.strapi.log.error('Error fetching Google News feed:', error);
      throw new Error(`Failed to fetch Google News feed: ${error.message}`);
    }
  }

  /**
   * Remove publisher names from article titles
   */
  private cleanTitle(title: string): string {
    // Common publisher patterns to remove
    const publisherPatterns = [
      /- (The )?New York Times?$/i,
      /- (The )?Washington Post$/i,
      /- CNN$/i,
      /- BBC$/i,
      /- Reuters$/i,
      /- Associated Press$/i,
      /- AP News$/i,
      /- Fox News$/i,
      /- NBC News$/i,
      /- CBS News$/i,
      /- ABC News$/i,
      /- USA Today$/i,
      /- Wall Street Journal$/i,
      /- (The )?Guardian$/i,
      /- Bloomberg$/i,
      /- NPR$/i,
      /- Politico$/i,
      /- Time$/i,
      /- Newsweek$/i,
      /- Forbes$/i,
      /- Business Insider$/i,
      /- Axios$/i,
      /- Vox$/i,
      /- CNBC$/i,
      /- ESPN$/i,
      /- Sky News$/i,
      /- Daily Mail$/i,
      /- Independent$/i,
      /- Telegraph$/i,
      /- Financial Times$/i,
      /- Al Jazeera$/i,
      /- Deutsche Welle$/i,
      /- France 24$/i,
      /- RT$/i,
      /- Sputnik$/i,
      /- Yahoo News$/i,
      /- Google News$/i,
      /- MSN$/i,
      /- HuffPost$/i,
      /- BuzzFeed$/i,
      /- Vice$/i,
      /- Slate$/i,
      /- The Hill$/i,
      /- The Atlantic$/i,
      /- The Economist$/i,
      /- New Yorker$/i,
      /- ProPublica$/i,
      /- Mother Jones$/i,
      /- The Nation$/i,
      /- National Review$/i,
      /- Weekly Standard$/i,
      /- Breitbart$/i,
      /- Daily Beast$/i,
      /- Daily Caller$/i,
      /- Daily Wire$/i,
      /- Townhall$/i,
      /- RedState$/i,
      /- Hot Air$/i,
      /- Twitchy$/i,
      /- The Blaze$/i,
      /- InfoWars$/i,
      /- Zero Hedge$/i,
      /- Gateway Pundit$/i,
      /- Natural News$/i,
      /- World Net Daily$/i,
      /- News Max$/i,
      /- One America News$/i,
      /- RT America$/i,
      /- Press TV$/i,
      /- TeleSUR$/i,
      /- CGTN$/i,
      /- Xinhua$/i,
      /- TASS$/i,
      /- Interfax$/i,
      /- RIA Novosti$/i,
      /- ITAR-TASS$/i,
      /- Pravda$/i,
      /- Russia Today$/i,
      /- Iran Press$/i,
      /- Al Manar$/i,
      /- Al Mayadeen$/i,
      /- Middle East Eye$/i,
      /- Middle East Monitor$/i,
      /- Times of Israel$/i,
      /- Jerusalem Post$/i,
      /- Haaretz$/i,
      /- Ynet$/i,
      /- Channel 12$/i,
      /- Channel 13$/i,
      /- i24NEWS$/i,
      /- Arutz Sheva$/i,
      /- Breaking Israel News$/i,
      /- United with Israel$/i,
      /- Jewish News Syndicate$/i,
      /- Jewish Telegraphic Agency$/i,
      /- Forward$/i,
      /- Tablet$/i,
      /- Jewish Journal$/i,
      /- Jewish Chronicle$/i,
      /- Jewish News$/i,
      /- The Jewish Week$/i,
      /- J Weekly$/i,
      /- Atlanta Jewish Times$/i,
      /- Chicago Jewish News$/i,
      /- Detroit Jewish News$/i,
      /- Jewish Exponent$/i,
      /- Jewish Press$/i,
      /- Jewish Voice$/i,
      /- Jewish World Review$/i,
      /- Algemeiner$/i,
      
      // US Regional newspapers
      /- (The )?Los Angeles Times$/i,
      /- Chicago Tribune$/i,
      /- Boston Globe$/i,
      /- Miami Herald$/i,
      /- Philadelphia Inquirer$/i,
      /- San Francisco Chronicle$/i,
      /- Seattle Times$/i,
      /- Denver Post$/i,
      /- Dallas Morning News$/i,
      /- Houston Chronicle$/i,
      /- Atlanta Journal-Constitution$/i,
      /- Tampa Bay Times$/i,
      /- Orlando Sentinel$/i,
      /- Sacramento Bee$/i,
      /- San Diego Union-Tribune$/i,
      /- Arizona Republic$/i,
      /- Las Vegas Review-Journal$/i,
      /- Detroit Free Press$/i,
      /- Cleveland Plain Dealer$/i,
      /- Pittsburgh Post-Gazette$/i,
      /- Baltimore Sun$/i,
      /- Richmond Times-Dispatch$/i,
      /- Charlotte Observer$/i,
      /- Raleigh News & Observer$/i,
      /- Kansas City Star$/i,
      /- St. Louis Post-Dispatch$/i,
      /- Milwaukee Journal Sentinel$/i,
      /- Minneapolis Star Tribune$/i,
      /- Cincinnati Enquirer$/i,
      /- Columbus Dispatch$/i,
      /- Indianapolis Star$/i,
      /- Louisville Courier-Journal$/i,
      /- Nashville Tennessean$/i,
      /- Memphis Commercial Appeal$/i,
      /- New Orleans Times-Picayune$/i,
      /- Oklahoma City Oklahoman$/i,
      /- Tulsa World$/i,
      /- Arkansas Democrat-Gazette$/i,
      /- Jackson Clarion-Ledger$/i,
      /- Birmingham News$/i,
      /- Mobile Press-Register$/i,
      /- Huntsville Times$/i,
      /- Knoxville News Sentinel$/i,
      /- Chattanooga Times Free Press$/i,
      /- Greenville News$/i,
      /- Charleston Post and Courier$/i,
      /- Columbia State$/i,
      /- Savannah Morning News$/i,
      /- Augusta Chronicle$/i,
      /- Macon Telegraph$/i,
      /- Columbus Ledger-Enquirer$/i,
      /- Albany Herald$/i,
      /- Valdosta Daily Times$/i,
      /- Tallahassee Democrat$/i,
      /- Gainesville Sun$/i,
      /- Ocala Star-Banner$/i,
      /- Lakeland Ledger$/i,
      /- Sarasota Herald-Tribune$/i,
      /- Fort Myers News-Press$/i,
      /- Naples Daily News$/i,
      /- Palm Beach Post$/i,
      /- Sun Sentinel$/i,
      /- Florida Today$/i,
      /- Daytona Beach News-Journal$/i,
      /- St. Augustine Record$/i,
      /- Jacksonville Times-Union$/i,
      /- Pensacola News Journal$/i,
      /- Panama City News Herald$/i,
      
      // UK and Ireland
      /- BBC News$/i,
      /- Sky News$/i,
      /- ITV News$/i,
      /- Channel 4 News$/i,
      /- Daily Telegraph$/i,
      /- The Times$/i,
      /- The Sun$/i,
      /- Daily Mirror$/i,
      /- Daily Express$/i,
      /- Daily Star$/i,
      /- Metro$/i,
      /- Evening Standard$/i,
      /- The Scotsman$/i,
      /- Herald Scotland$/i,
      /- Wales Online$/i,
      /- Belfast Telegraph$/i,
      /- Irish Times$/i,
      /- Irish Independent$/i,
      /- Irish Examiner$/i,
      /- RTE News$/i,
      /- CBC News$/i,
      /- CTV News$/i,
      /- Global News$/i,
      /- Toronto Star$/i,
      /- Globe and Mail$/i,
      /- National Post$/i,
      /- Montreal Gazette$/i,
      /- Vancouver Sun$/i,
      /- Calgary Herald$/i,
      /- Edmonton Journal$/i,
      /- Winnipeg Free Press$/i,
      /- Ottawa Citizen$/i,
      /- Hamilton Spectator$/i,
      /- London Free Press$/i,
      /- Windsor Star$/i,
      /- Regina Leader-Post$/i,
      /- Saskatoon StarPhoenix$/i,
      /- Prince Albert Daily Herald$/i,
      /- Brandon Sun$/i,
      /- Thunder Bay Chronicle-Journal$/i,
      /- Sudbury Star$/i,
      /- Sault Star$/i,
      /- North Bay Nugget$/i,
      /- Kirkland Lake Northern News$/i,
      /- Timmins Daily Press$/i,
      /- Cochrane Times-Post$/i,
      /- Kapuskasing Northern Times$/i,
      /- Hearst Le Nord$/i,
      /- Smooth Rock Falls Post$/i,
      /- Iroquois Falls Enterprise$/i,
      /- Matheson Dispatch$/i,
      /- New Liskeard Temiskaming Speaker$/i,
      /- Englehart Prospect$/i,
      /- Cobalt Nugget$/i,
      /- Haileybury Herald$/i,
      /- Temagami Times$/i,
      /- Latchford Herald$/i,
      /- Elk Lake Beaver$/i,
      /- Gowganda Nugget$/i,
      /- Shining Tree Beacon$/i,
      /- Gogama Gazette$/i,
      /- Chapleau Sentinel$/i,
      /- Foleyet Flyer$/i,
      /- Hornepayne Herald$/i,
      /- Dubreuilville Dispatch$/i,
      /- White River Recorder$/i,
      /- Marathon Mercury$/i,
      /- Terrace Bay Tribune$/i,
      /- Schreiber Sentinel$/i,
      /- Rossport Register$/i,
      /- Pearl Prospector$/i,
      
      // Generic patterns for any remaining publisher names
      /- [A-Z][a-zA-Z\s&]+(?:News|Times|Post|Herald|Tribune|Journal|Gazette|Chronicle|Star|Sun|Globe|Mail|Press|Record|Dispatch|Sentinel|Observer|Examiner|Register|Bulletin|Telegraph|Express|Mirror|Standard|Independent|Guardian|Economist|Review|Report|Today|Daily|Weekly|Monthly|Magazine|Network|Channel|Broadcasting|Media|Online|Digital|Web|Blog|Site)$/i,
      
      // Remove common suffixes that indicate source
      /\| [A-Z][a-zA-Z\s&]+$/i,
      /\- [A-Z][a-zA-Z\s&]+$/i,
      /\([A-Z][a-zA-Z\s&]+\)$/i,
      /via [A-Z][a-zA-Z\s&]+$/i,
      /from [A-Z][a-zA-Z\s&]+$/i,
      /by [A-Z][a-zA-Z\s&]+$/i,
      /on [A-Z][a-zA-Z\s&]+$/i,
      /at [A-Z][a-zA-Z\s&]+$/i,
      /in [A-Z][a-zA-Z\s&]+$/i,
      /for [A-Z][a-zA-Z\s&]+$/i,
      /with [A-Z][a-zA-Z\s&]+$/i,
      /to [A-Z][a-zA-Z\s&]+$/i,
      /of [A-Z][a-zA-Z\s&]+$/i,
      /as [A-Z][a-zA-Z\s&]+$/i,
      /per [A-Z][a-zA-Z\s&]+$/i,
      /says [A-Z][a-zA-Z\s&]+$/i,
      /reports [A-Z][a-zA-Z\s&]+$/i,
      /according to [A-Z][a-zA-Z\s&]+$/i,
      /sources [A-Z][a-zA-Z\s&]+$/i,
      /officials [A-Z][a-zA-Z\s&]+$/i,
      /spokesperson [A-Z][a-zA-Z\s&]+$/i,
      /representative [A-Z][a-zA-Z\s&]+$/i,
      /statement [A-Z][a-zA-Z\s&]+$/i,
      /exclusive [A-Z][a-zA-Z\s&]+$/i,
      /breaking [A-Z][a-zA-Z\s&]+$/i,
      /live [A-Z][a-zA-Z\s&]+$/i,
      /update [A-Z][a-zA-Z\s&]+$/i,
      /alert [A-Z][a-zA-Z\s&]+$/i,
      /urgent [A-Z][a-zA-Z\s&]+$/i,
      /developing [A-Z][a-zA-Z\s&]+$/i,
      /just in [A-Z][a-zA-Z\s&]+$/i,
      /latest [A-Z][a-zA-Z\s&]+$/i,
      /current [A-Z][a-zA-Z\s&]+$/i,
      /recent [A-Z][a-zA-Z\s&]+$/i,
      /today [A-Z][a-zA-Z\s&]+$/i,
      /yesterday [A-Z][a-zA-Z\s&]+$/i,
      /this week [A-Z][a-zA-Z\s&]+$/i,
      /this month [A-Z][a-zA-Z\s&]+$/i,
      /this year [A-Z][a-zA-Z\s&]+$/i
    ];

    let cleanedTitle = title;
    
    // Remove publisher patterns
    for (const pattern of publisherPatterns) {
      cleanedTitle = cleanedTitle.replace(pattern, '');
    }

    // Remove any trailing dashes, pipes, or spaces
    cleanedTitle = cleanedTitle
      .replace(/\s*[-|–—]\s*$/, '')
      .replace(/\s*\|\s*$/, '')
      .replace(/\s*:\s*$/, '')
      .replace(/\s*;\s*$/, '')
      .replace(/\s*,\s*$/, '')
      .replace(/\s*\.\s*$/, '')
      .trim();
    
    return cleanedTitle;
  }

  /**
   * Extract and fetch article image from content or use a placeholder
   */
  private async extractImageUrl(content: string, title: string): Promise<string | null> {
    try {
      // Try to extract image from content with multiple patterns
      const imgPatterns = [
        /<img[^>]+src="([^">]+)"/i,
        /<img[^>]+src='([^'>]+)'/i,
        /src="([^"]*\.(jpg|jpeg|png|gif|webp)[^"]*)"/i,
        /src='([^']*\.(jpg|jpeg|png|gif|webp)[^']*)'/i
      ];
      
      for (const pattern of imgPatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          const imageUrl = match[1];
          // Validate if it's a proper image URL
          if (imageUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i) && 
              imageUrl.startsWith('http')) {
            this.strapi.log.debug(`Found image URL: ${imageUrl}`);
            return imageUrl;
          }
        }
      }

      // If no image found in content, return null to skip image upload
      // This avoids network issues with external placeholder services
      this.strapi.log.debug(`No image found in content for article: ${title}, skipping image`);
      return null;
    } catch (error) {
      this.strapi.log.warn('Error extracting image URL:', error);
      return null;
    }
  }

  /**
   * Extract keywords from title for image search
   */
  private extractKeywordsForImage(title: string): string {
    // Remove common words and extract meaningful keywords
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'];
    
    const words = title.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 3); // Take first 3 meaningful words
    
    return words.join(',') || 'news';
  }

  /**
   * Remove author names from text (titles and excerpts)
   */
  private removeAuthorFromText(text: string): string {
    if (!text) return text;
    
    // Common patterns for author attribution
    const authorPatterns = [
      /^By\s+[A-Z][a-z]+\s+[A-Z][a-z]+\s*[-|–—]\s*/i,  // "By John Smith - "
      /^By\s+[A-Z][a-z]+\s+[A-Z][a-z]+\s*:\s*/i,       // "By John Smith: "
      /^[A-Z][a-z]+\s+[A-Z][a-z]+\s*[-|–—]\s*/,        // "John Smith - "
      /^[A-Z][a-z]+\s+[A-Z][a-z]+\s*:\s*/,             // "John Smith: "
      /\s*[-|–—]\s*By\s+[A-Z][a-z]+\s+[A-Z][a-z]+$/i,  // " - By John Smith"
      /\s*\|\s*By\s+[A-Z][a-z]+\s+[A-Z][a-z]+$/i,      // " | By John Smith"
      /\s*,\s*By\s+[A-Z][a-z]+\s+[A-Z][a-z]+$/i,       // ", By John Smith"
      /\s*\(\s*By\s+[A-Z][a-z]+\s+[A-Z][a-z]+\s*\)$/i, // " (By John Smith)"
    ];
    
    let cleanedText = text;
    
    for (const pattern of authorPatterns) {
      cleanedText = cleanedText.replace(pattern, '').trim();
    }
    
    return cleanedText;
  }

  /**
   * Extract location information from article content
   */
  private extractLocationFromContent(content: string): string {
    if (!content) return '';
    
    try {
      // Remove HTML tags for text analysis
      const textContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Common location patterns
      const locationPatterns = [
        // City, State/Country patterns
        /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
        // Dateline patterns (CITY - content)
        /^([A-Z][A-Z\s]+)\s*[-–—]\s*/,
        // Location mentions with prepositions
        /\bin\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z][a-z]+)*)\b/g,
        /\bfrom\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z][a-z]+)*)\b/g,
        /\bat\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z][a-z]+)*)\b/g,
      ];
      
      const locations = new Set<string>();
      
      for (const pattern of locationPatterns) {
        let match;
        while ((match = pattern.exec(textContent)) !== null) {
          const location = match[1]?.trim();
          if (location && location.length > 2 && location.length < 50) {
            // Filter out common non-location words
            const nonLocations = ['United States', 'America', 'Europe', 'Asia', 'Africa', 'North', 'South', 'East', 'West', 'News', 'Report', 'Today', 'Yesterday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            if (!nonLocations.some(nl => location.toLowerCase().includes(nl.toLowerCase()))) {
              locations.add(location);
            }
          }
        }
      }
      
      // Return the first valid location found
      const locationArray = Array.from(locations);
      if (locationArray.length > 0) {
        this.strapi.log.debug(`Extracted location: ${locationArray[0]}`);
        return locationArray[0];
      }
      
      this.strapi.log.debug('No location found in content');
      return '';
      
    } catch (error) {
      this.strapi.log.warn('Error extracting location:', error);
      return '';
    }
  }

  /**
   * Remove publisher names from content
   */
  private removePublisherFromContent(content: string): string {
    const publisherPatterns = [
      /\b(CNN|BBC|Reuters|Associated Press|AP|Fox News|NBC|CBS|ABC|MSNBC)\b/gi,
      /\b(Sky News|The Guardian|The Times|New York Times|Washington Post)\b/gi,
      /\b(Wall Street Journal|USA Today|NPR|PBS|Bloomberg|CNBC|ESPN)\b/gi,
      /\b(Yahoo|Google|Microsoft|Apple|Amazon|Facebook|Twitter)\b/gi,
      /\b(Instagram|YouTube|TikTok|Snapchat|LinkedIn|Reddit|Pinterest)\b/gi
    ];

    let cleanedContent = content;
    
    publisherPatterns.forEach(pattern => {
      cleanedContent = cleanedContent.replace(pattern, '');
    });

    // Clean up extra whitespace and punctuation left behind
    cleanedContent = cleanedContent
      .replace(/\s+/g, ' ')
      .replace(/\s*[,;:]\s*/g, ' ')
      .replace(/\s*\.\s*\./g, '.')
      .replace(/^\s*[,;:.\-–—]\s*/g, '')
      .trim();

    return cleanedContent;
  }

  /**
   * Calculate estimated read time based on content length
   */
  private calculateReadTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  /**
   * Extract location from content
   */
  private extractLocation(content: string): string {
    // Common location patterns
    const locationPatterns = [
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2}|[A-Z][a-z]+)\b/g, // City, State/Country
      /\b(Washington|New York|Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|San Jose|Austin|Jacksonville|Fort Worth|Columbus|Charlotte|San Francisco|Indianapolis|Seattle|Denver|Boston|El Paso|Nashville|Detroit|Oklahoma City|Portland|Las Vegas|Memphis|Louisville|Baltimore|Milwaukee|Albuquerque|Tucson|Fresno|Sacramento|Mesa|Kansas City|Atlanta|Long Beach|Colorado Springs|Raleigh|Miami|Virginia Beach|Omaha|Oakland|Minneapolis|Tulsa|Arlington|Tampa|New Orleans|Wichita|Cleveland|Bakersfield|Aurora|Anaheim|Honolulu|Santa Ana|Riverside|Corpus Christi|Lexington|Stockton|Henderson|St. Paul|St. Paul|Cincinnati|St. Louis|Pittsburgh|Greensboro|Lincoln|Plano|Anchorage|Durham|Jersey City|Chula Vista|Fort Wayne|Orlando|St. Petersburg|Chandler|Toledo|Reno|Laredo|Scottsdale|North Las Vegas|Lubbock|Madison|Gilbert|Glendale|Norfolk|Garland|Irving|Hialeah|Fremont|Chesapeake|Birmingham|Washington D\.?C\.?|NYC|LA)\b/gi
    ];

    for (const pattern of locationPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0].replace(/^(Washington)$/, 'Washington, DC');
      }
    }

    return 'United States'; // Default location
  }

  /**
   * Check if article is breaking news
   */
  private isBreakingNews(title: string, content: string, category: string = ''): boolean {
    const breakingKeywords = [
      'breaking', 'urgent', 'just in', 'developing', 'live', 'update', 'alert', 'emergency'
    ];

    const text = `${title} ${content}`.toLowerCase();
    return breakingKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Clean HTML entities and unwanted characters from text
   */
  private cleanHtmlEntities(text: string): string {
    if (!text) return '';

    return text
      // Decode common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&ldquo;/g, '"')
      .replace(/&rdquo;/g, '"')
      .replace(/&lsquo;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&hellip;/g, '…')
      // Decode numeric entities
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
      .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Fetch full article content from source URL with comprehensive extraction and optimization
   */
  private async fetchFullContent(sourceUrl: string, rssItem?: GoogleNewsItem): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    try {
      this.strapi.log.info(`🔍 Starting enhanced content extraction from: ${sourceUrl}`);
      
      // Extract article content using enhanced extractor
      const extractedData = await this.articleExtractor.extractArticleContentWithRSS(sourceUrl, rssItem);
      
      let optimizedImages: OptimizedImage[] = [];
      let contentQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
      
      if (extractedData.success && extractedData.content.length > 200) {
        this.strapi.log.info(`✅ Content extraction successful using ${extractedData.extractionMethod}`);
        this.strapi.log.info(`📊 Content stats: ${extractedData.wordCount} words, ${extractedData.images.length} raw images`);
        
        // Optimize and score images
        if (extractedData.images && extractedData.images.length > 0) {
          this.strapi.log.info(`🖼️  Processing ${extractedData.images.length} images for optimization...`);
          
          // Optimize all images at once
          const optimizedImageResults = await this.imageOptimizer.optimizeImages(extractedData.images, extractedData.content);
          
          // Convert quality to score and collect valid images
          const validImages = [];
          for (const optimizedImage of optimizedImageResults) {
            if (optimizedImage && optimizedImage.metadata.isValid) {
              // Convert quality to numeric score
              const qualityScore = optimizedImage.metadata.quality === 'high' ? 90 : 
                                 optimizedImage.metadata.quality === 'medium' ? 60 : 30;
              
              validImages.push({
                url: optimizedImage.originalUrl,
                alt: optimizedImage.metadata.alt || '',
                score: qualityScore,
                width: optimizedImage.metadata.width,
                height: optimizedImage.metadata.height,
                format: optimizedImage.metadata.format || 'webp',
                size: optimizedImage.metadata.size || 0
              });
              
              this.strapi.log.debug(`   ✅ Image optimized: ${optimizedImage.originalUrl} (quality: ${optimizedImage.metadata.quality})`);
            }
          }
          
          // Sort images by score and take only the best one for article creation
          validImages.sort((a, b) => b.score - a.score);
          if (validImages.length > 0) {
            optimizedImages.push(validImages[0]); // Take only the best image
          }
          
          this.strapi.log.info(`🎯 Image optimization complete: ${optimizedImages.length} optimized images`);
          if (optimizedImages.length > 0) {
            const avgScore = optimizedImages.reduce((sum, img) => sum + img.score, 0) / optimizedImages.length;
            this.strapi.log.info(`📈 Average image score: ${avgScore.toFixed(1)}`);
          }
        }
        
        // Assess content quality
        contentQuality = this.assessContentQuality(extractedData.content, optimizedImages.length);
        
        // Update processing statistics
        this.updateProcessingStats(true, Date.now() - startTime, optimizedImages);
        
        this.strapi.log.info(`🏆 Content quality assessment: ${contentQuality.toUpperCase()}`);
        
        return {
          content: extractedData.content,
          images: optimizedImages,
          extractionMethod: extractedData.extractionMethod,
          wordCount: extractedData.wordCount,
          contentQuality,
          processingTime: Date.now() - startTime
        };
      } else {
        this.strapi.log.warn(`❌ Content extraction failed or insufficient content: ${extractedData.extractionMethod}`);
        
        // Try fallback service
        this.strapi.log.info(`🔄 Attempting fallback content recovery...`);
        const fallbackResult = await this.fallbackService.recoverContent(sourceUrl, rssItem);
        
        if (fallbackResult.content && fallbackResult.content.length > 100) {
          this.strapi.log.info(`✅ Fallback recovery successful: ${fallbackResult.content.length} characters`);
          contentQuality = 'fair';
        } else {
          this.strapi.log.warn(`❌ Fallback recovery also failed`);
          contentQuality = 'poor';
        }
        
        this.updateProcessingStats(false, Date.now() - startTime, []);
        
        return {
          content: fallbackResult.content || extractedData.content || '',
          images: [],
          extractionMethod: fallbackResult.content ? 'fallback' : extractedData.extractionMethod,
          wordCount: fallbackResult.content ? fallbackResult.content.split(' ').length : 0,
          contentQuality,
          processingTime: Date.now() - startTime
        };
      }
    } catch (error) {
      this.strapi.log.error(`💥 Error extracting content from ${sourceUrl}:`, error);
      this.updateProcessingStats(false, Date.now() - startTime, []);
      
      return {
        content: '',
        images: [],
        extractionMethod: 'error',
        wordCount: 0,
        contentQuality: 'poor',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * AI-powered content extraction with fallback to enhanced extraction
   */
  private async fetchContentWithAI(sourceUrl: string, rssItem?: GoogleNewsItem): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    try {
      this.strapi.log.info(`🤖 Starting AI-powered content extraction from: ${sourceUrl}`);
      
      // First, get the raw HTML content
      let rawHtml = '';
      try {
        const response = await axios.get(sourceUrl, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          }
        });
        rawHtml = response.data;
      } catch (fetchError) {
        this.strapi.log.warn(`❌ Failed to fetch raw HTML: ${fetchError.message}`);
        // Fallback to enhanced extraction if we can't get raw HTML
        return await this.fetchFullContent(sourceUrl, rssItem);
      }

      // Use AI to extract structured content
      const aiResult = await this.aiContentExtractor.extractWithFallback(rawHtml, sourceUrl);
      
      if (aiResult.success && aiResult.data) {
        this.strapi.log.info(`✅ AI extraction successful in ${aiResult.processingTime}ms`);
        this.strapi.log.info(`📊 AI extracted: ${aiResult.data.title}`);
        this.strapi.log.info(`📝 Content: ${aiResult.data.content.length} chars`);
        this.strapi.log.info(`🏷️  Tags: ${aiResult.data.tags.length} tags`);
        this.strapi.log.info(`🖼️  Images: ${aiResult.data.images.length} images`);
        
        // Convert AI extracted images to OptimizedImage format
        const optimizedImages: OptimizedImage[] = aiResult.data.images.map((img, index) => ({
          url: img.url,
          alt: img.alt || `Image ${index + 1}`,
          score: 0.8, // AI-extracted images get a good score
          width: undefined,
          height: undefined,
          format: undefined,
          size: undefined
        }));

        // Assess content quality based on AI extraction
        const contentQuality = this.assessAIContentQuality(aiResult.data);
        
        this.updateProcessingStats(true, aiResult.processingTime, optimizedImages);
        
        return {
          content: aiResult.data.content,
          images: optimizedImages,
          extractionMethod: 'AI (Gemini)',
          wordCount: aiResult.data.content.replace(/<[^>]*>/g, '').split(' ').length,
          contentQuality,
          processingTime: aiResult.processingTime
        };
      } else {
        this.strapi.log.warn(`❌ AI extraction failed: ${aiResult.error}`);
        this.strapi.log.info(`🔄 Falling back to enhanced extraction...`);
        
        // Fallback to the existing enhanced extraction method
        return await this.fetchFullContent(sourceUrl, rssItem);
      }
      
    } catch (error) {
      this.strapi.log.error(`💥 Error in AI content extraction from ${sourceUrl}:`, error);
      this.strapi.log.info(`🔄 Falling back to enhanced extraction...`);
      
      // Fallback to the existing enhanced extraction method
      return await this.fetchFullContent(sourceUrl, rssItem);
    }
  }

  /**
   * Assess content quality for AI-extracted content
   */
  private assessAIContentQuality(aiData: any): 'excellent' | 'good' | 'fair' | 'poor' {
    const wordCount = aiData.content.replace(/<[^>]*>/g, '').split(' ').length;
    const hasImages = aiData.images && aiData.images.length > 0;
    const hasTags = aiData.tags && aiData.tags.length > 0;
    const hasLocation = aiData.location && aiData.location.length > 0;
    const hasMetadata = aiData.metadata && Object.keys(aiData.metadata).length > 0;
    
    // AI extraction provides more structured data, so we can be more sophisticated
    if (wordCount >= 500 && hasImages && hasTags && (hasLocation || hasMetadata)) return 'excellent';
    if (wordCount >= 300 && (hasImages || hasTags)) return 'good';
    if (wordCount >= 150) return 'fair';
    return 'poor';
  }

  /**
   * Assess content quality based on length and image count
   */
  private assessContentQuality(content: string, imageCount: number): 'excellent' | 'good' | 'fair' | 'poor' {
    const wordCount = content.split(' ').length;
    
    if (wordCount >= 500 && imageCount >= 3) return 'excellent';
    if (wordCount >= 300 && imageCount >= 1) return 'good';
    if (wordCount >= 150) return 'fair';
    return 'poor';
  }

  /**
   * Update processing statistics for monitoring
   */
  private updateProcessingStats(success: boolean, processingTime: number, images: OptimizedImage[]) {
    this.processingStats.totalProcessed++;
    
    if (success) {
      this.processingStats.successfulExtractions++;
      this.processingStats.totalImages += images.length;
      this.processingStats.totalProcessingTime += processingTime;
      
      if (images.length > 0) {
        this.processingStats.articlesWithImages++;
        const avgScore = images.reduce((sum, img) => sum + img.score, 0) / images.length;
        this.processingStats.averageImageScore = 
          (this.processingStats.averageImageScore * (this.processingStats.articlesWithImages - 1) + avgScore) / 
          this.processingStats.articlesWithImages;
      }
    } else {
      this.processingStats.failedExtractions++;
    }
  }

  /**
   * Get processing statistics for monitoring
   */
  public getProcessingStats() {
    return {
      ...this.processingStats,
      successRate: this.processingStats.totalProcessed > 0 
        ? (this.processingStats.successfulExtractions / this.processingStats.totalProcessed * 100).toFixed(2) + '%'
        : '0%',
      averageProcessingTime: this.processingStats.successfulExtractions > 0
        ? Math.round(this.processingStats.totalProcessingTime / this.processingStats.successfulExtractions)
        : 0
    };
  }

  /**
   * Clean extracted content by removing all unwanted HTML tags and preserving only text content
   */
  private cleanExtractedContent(content: string): string {
    if (!content) return '';

    let cleanedContent = content;

    // First, remove all unwanted elements completely (including their content)
    const unwantedElements = [
      'script', 'style', 'noscript', 'meta', 'link', 'head', 'title',
      'nav', 'header', 'footer', 'aside', 'menu',
      'img', 'picture', 'figure', 'svg', 'video', 'audio', 'iframe', 'embed', 'object',
      'form', 'input', 'button', 'select', 'textarea',
      'canvas', 'map', 'area'
    ];

    unwantedElements.forEach(tag => {
      // Remove self-closing tags
      cleanedContent = cleanedContent.replace(new RegExp(`<${tag}[^>]*\/?>`, 'gis'), '');
      // Remove paired tags with content
      cleanedContent = cleanedContent.replace(new RegExp(`<${tag}[^>]*>.*?<\/${tag}>`, 'gis'), '');
    });

    // Remove all links (a tags) but preserve their text content
    cleanedContent = cleanedContent.replace(/<a[^>]*>(.*?)<\/a>/gis, '$1');
    
    // Remove all span tags but preserve their text content
    cleanedContent = cleanedContent.replace(/<span[^>]*>(.*?)<\/span>/gis, '$1');
    
    // Remove all div tags but preserve their text content (convert to paragraphs if they contain substantial text)
    cleanedContent = cleanedContent.replace(/<div[^>]*>(.*?)<\/div>/gis, (match, content) => {
      const textContent = content.replace(/<[^>]*>/g, '').trim();
      return textContent.length > 20 ? `<p>${content}</p>` : content;
    });

    // Remove elements with specific classes/attributes that indicate unwanted content
    const unwantedPatterns = [
      /<[^>]*class[^>]*(?:subscribe|signup|newsletter|promotion|cta|call-to-action|advertisement|ad-|social|share|comment|related|recommended|sidebar|footer|nav|menu|breadcrumb|widget|popup|modal|overlay)[^>]*>.*?<\/[^>]*>/gis,
      /<[^>]*(?:data-track|data-analytics|data-ad|onclick|onload)[^>]*>.*?<\/[^>]*>/gis,
      /<[^>]*id[^>]*(?:ad|advertisement|social|share|comment|sidebar|footer|nav|menu)[^>]*>.*?<\/[^>]*>/gis
    ];

    unwantedPatterns.forEach(pattern => {
      cleanedContent = cleanedContent.replace(pattern, '');
    });

    // Remove HTML comments
    cleanedContent = cleanedContent.replace(/<!--.*?-->/gs, '');

    // Clean up attributes from allowed tags, keeping only essential semantic tags
    const allowedTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'br'];
    
    // Remove all attributes from allowed tags to keep them clean
    allowedTags.forEach(tag => {
      cleanedContent = cleanedContent.replace(new RegExp(`<${tag}[^>]*>`, 'gis'), `<${tag}>`);
    });

    // Remove any remaining HTML tags that are not in our allowed list
    // This regex matches any HTML tag that's not in our allowed list
    const allowedTagsPattern = allowedTags.join('|');
    cleanedContent = cleanedContent.replace(
      new RegExp(`<(?!\/?(?:${allowedTagsPattern})(?:\s|>))[^>]*>`, 'gis'), 
      ''
    );

    // Convert multiple br tags to paragraph breaks
    cleanedContent = cleanedContent.replace(/<br>\s*<br>/gi, '</p><p>');
    cleanedContent = cleanedContent.replace(/<br>/gi, ' ');

    // Clean up empty tags
    cleanedContent = cleanedContent.replace(/<(p|h[1-6]|blockquote|li)>\s*<\/\1>/gi, '');
    
    // Ensure content is wrapped in paragraphs if it's not already structured
    if (cleanedContent && !cleanedContent.match(/<(p|h[1-6]|blockquote|ul|ol)/i)) {
      cleanedContent = `<p>${cleanedContent}</p>`;
    }

    // Clean up excessive whitespace while preserving paragraph structure
    cleanedContent = cleanedContent
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/>\s+</g, '><') // Remove spaces between tags
      .replace(/\s+>/g, '>') // Remove spaces before closing brackets
      .replace(/<\s+/g, '<') // Remove spaces after opening brackets
      .trim();

    // Final cleanup: remove any remaining empty paragraphs or headers
    cleanedContent = cleanedContent.replace(/<(p|h[1-6]|blockquote)>\s*<\/\1>/gi, '');
    
    return cleanedContent;
  }

  /**
   * Extract images from content and return array of image URLs
   */
   private extractImagesFromContent(content: string): string[] {
     if (!content) return [];

     const imageUrls: string[] = [];
     const imgRegex = /<img[^>]+src\s*=\s*["\']([^"\']+)["\'][^>]*>/gi;
     let match;

     while ((match = imgRegex.exec(content)) !== null) {
       const imageUrl = match[1];
       const fullMatch = match[0];
       
       // Extract width and height if available
       const widthMatch = fullMatch.match(/width\s*=\s*["\']?(\d+)/i);
       const heightMatch = fullMatch.match(/height\s*=\s*["\']?(\d+)/i);
       const width = widthMatch ? parseInt(widthMatch[1]) : 0;
       const height = heightMatch ? parseInt(heightMatch[1]) : 0;
       
       // Filter out small icons, tracking pixels, and invalid URLs
       if (imageUrl && 
           !imageUrl.includes('1x1') && 
           !imageUrl.includes('pixel') && 
           !imageUrl.includes('icon') &&
           !imageUrl.includes('logo') &&
           !imageUrl.includes('avatar') &&
           !imageUrl.includes('profile') &&
           !imageUrl.includes('thumbnail') &&
           !imageUrl.includes('badge') &&
           !imageUrl.includes('button') &&
           imageUrl.startsWith('http') &&
           !imageUrls.includes(imageUrl) &&
           // Filter by size if dimensions are available
           (width === 0 || width >= 300) &&
           (height === 0 || height >= 200)) {
         
         // Prioritize high-quality images
         const isHighQuality = this.isHighQualityImage(imageUrl, width, height);
         if (isHighQuality) {
           imageUrls.unshift(imageUrl); // Add to beginning for priority
         } else {
           imageUrls.push(imageUrl);
         }
       }
     }

     return imageUrls;
   }

   /**
    * Check if an image is high quality based on URL patterns and dimensions
    */
   private isHighQualityImage(imageUrl: string, width: number, height: number): boolean {
     // High quality indicators in URL
     const highQualityPatterns = [
       /large/i,
       /hero/i,
       /featured/i,
       /main/i,
       /article/i,
       /story/i,
       /\d{3,4}x\d{3,4}/i, // Contains dimensions like 800x600
       /w_\d{3,}/i, // Cloudinary width parameter
       /h_\d{3,}/i  // Cloudinary height parameter
     ];

     // Check for high quality patterns
     const hasQualityPattern = highQualityPatterns.some(pattern => pattern.test(imageUrl));
     
     // Check dimensions
     const hasGoodDimensions = (width >= 600 && height >= 400) || (width === 0 && height === 0);
     
     // Prefer images from reputable sources
     const isFromGoodSource = imageUrl.includes('unsplash') || 
                             imageUrl.includes('pexels') || 
                             imageUrl.includes('shutterstock') ||
                             imageUrl.includes('gettyimages') ||
                             imageUrl.includes('reuters') ||
                             imageUrl.includes('ap.org') ||
                             imageUrl.includes('cnn.com') ||
                             imageUrl.includes('bbc.') ||
                             imageUrl.includes('nytimes.com');

     return hasQualityPattern || hasGoodDimensions || isFromGoodSource;
   }

   /**
   * Check if content is of good quality and not a PDF or low-quality article
   */
  private isQualityContent(item: GoogleNewsItem): boolean {
    const title = item.title?.toLowerCase() || '';
    const link = item.link?.toLowerCase() || '';
    const description = item.description?.toLowerCase() || '';
    
    // Exclude PDFs
    if (link.includes('.pdf') || title.includes('.pdf') || description.includes('pdf')) {
      this.strapi.log.debug(`Excluding PDF content: ${item.title}`);
      return false;
    }
    
    // Exclude very short titles (likely not substantial articles)
    if (title.length < 20) {
      this.strapi.log.debug(`Excluding short title: ${item.title}`);
      return false;
    }
    
    // Exclude common low-quality indicators
    const lowQualityIndicators = [
      'live blog',
      'live updates',
      'photo gallery',
      'slideshow',
      'video only',
      'watch:',
      'listen:',
      'podcast:',
      'advertisement',
      'sponsored content',
      'press release',
      'job posting',
      'obituary',
      'weather forecast',
      'stock prices',
      'market data'
    ];
    
    for (const indicator of lowQualityIndicators) {
      if (title.includes(indicator) || description.includes(indicator)) {
        this.strapi.log.debug(`Excluding low-quality content (${indicator}): ${item.title}`);
        return false;
      }
    }
    
    // Exclude articles with very short descriptions
    if (description && description.length < 50) {
      this.strapi.log.debug(`Excluding article with short description: ${item.title}`);
      return false;
    }
    
    // Exclude social media posts and forum links
    const socialMediaDomains = [
      'twitter.com',
      'facebook.com',
      'instagram.com',
      'reddit.com',
      'linkedin.com',
      'youtube.com',
      'tiktok.com'
    ];
    
    for (const domain of socialMediaDomains) {
      if (link.includes(domain)) {
        this.strapi.log.debug(`Excluding social media content: ${item.title}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Extract tags from article title and content
   */
  private extractTags(title: string, content: string, category: string): string[] {
     const text = `${title} ${content}`.toLowerCase();
     const tags: Set<string> = new Set();

     // Add category as a tag
     if (category && category !== 'News') {
       tags.add(category);
     }

     // Common news keywords and entities
     const tagPatterns = [
       // Political terms
       { pattern: /\b(election|vote|voting|campaign|candidate|president|minister|government|parliament|congress|senate|democracy|republican|democrat|conservative|liberal|policy|legislation|bill|law|court|supreme court|judge|justice)\b/g, category: 'Politics' },
       
       // Economic terms
       { pattern: /\b(economy|economic|finance|financial|market|stock|trading|investment|bank|banking|inflation|recession|gdp|unemployment|jobs|employment|business|company|corporation|startup|entrepreneur|revenue|profit|loss|budget|tax|taxes|cryptocurrency|bitcoin|ethereum)\b/g, category: 'Economy' },
       
       // Technology terms
       { pattern: /\b(technology|tech|ai|artificial intelligence|machine learning|software|hardware|computer|internet|digital|cyber|data|algorithm|programming|coding|app|application|smartphone|iphone|android|google|apple|microsoft|facebook|meta|twitter|tesla|spacex)\b/g, category: 'Technology' },
       
       // Health terms
       { pattern: /\b(health|medical|medicine|doctor|hospital|patient|disease|virus|vaccine|covid|pandemic|treatment|therapy|drug|pharmaceutical|healthcare|mental health|fitness|nutrition|diet)\b/g, category: 'Health' },
       
       // Sports terms
       { pattern: /\b(sport|sports|football|soccer|basketball|baseball|tennis|golf|olympics|championship|tournament|team|player|coach|game|match|season|league|nfl|nba|mlb|fifa|uefa)\b/g, category: 'Sports' },
       
       // Science terms
       { pattern: /\b(science|scientific|research|study|university|professor|climate|environment|space|nasa|mars|earth|ocean|energy|renewable|solar|nuclear|physics|chemistry|biology|genetics|dna)\b/g, category: 'Science' },
       
       // International/World terms
       { pattern: /\b(international|global|world|country|nation|border|immigration|refugee|war|conflict|peace|treaty|alliance|nato|un|united nations|europe|asia|africa|america|china|russia|ukraine|israel|palestine)\b/g, category: 'World' },
       
       // Legal terms
       { pattern: /\b(legal|law|court|judge|jury|trial|lawsuit|attorney|lawyer|crime|criminal|police|arrest|investigation|evidence|guilty|innocent|sentence|prison|jail|rights|constitution)\b/g, category: 'Law' },
       
       // Cultural terms
       { pattern: /\b(culture|cultural|art|artist|music|musician|film|movie|actor|actress|director|book|author|writer|museum|gallery|festival|entertainment|celebrity|fashion|style)\b/g, category: 'Culture' },
       
       // Social terms
       { pattern: /\b(social|society|community|family|education|school|student|teacher|religion|religious|church|mosque|temple|protest|demonstration|activism|rights|equality|diversity|inclusion)\b/g, category: 'Society' }
     ];

     // Extract tags based on patterns
     tagPatterns.forEach(({ pattern, category: tagCategory }) => {
       const matches = text.match(pattern);
       if (matches) {
         matches.forEach(match => {
           const cleanTag = match.trim();
           if (cleanTag.length > 2 && cleanTag.length <= 50) {
             // Capitalize first letter
             const formattedTag = cleanTag.charAt(0).toUpperCase() + cleanTag.slice(1);
             tags.add(formattedTag);
           }
         });
       }
     });

     // Extract proper nouns (potential entities)
     const properNounPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
     const properNouns = text.match(properNounPattern) || [];
     
     properNouns.forEach(noun => {
       const cleanNoun = (noun as string).trim();
       // Filter out common words and ensure reasonable length
       if (cleanNoun.length > 2 && 
           cleanNoun.length <= 50 && 
           !['The', 'This', 'That', 'These', 'Those', 'And', 'But', 'Or', 'For', 'With', 'By', 'From', 'To', 'In', 'On', 'At', 'As', 'Of', 'About', 'Over', 'Under', 'Through', 'During', 'Before', 'After', 'Above', 'Below', 'Up', 'Down', 'Out', 'Off', 'Into', 'Onto', 'Upon', 'Within', 'Without', 'Between', 'Among', 'Across', 'Behind', 'Beyond', 'Beside', 'Besides', 'Except', 'Instead', 'Rather', 'Whether', 'Either', 'Neither', 'Both', 'All', 'Any', 'Some', 'Many', 'Much', 'Few', 'Little', 'More', 'Most', 'Less', 'Least', 'Several', 'Various', 'Different', 'Same', 'Other', 'Another', 'Each', 'Every', 'Such', 'What', 'Which', 'Who', 'Whom', 'Whose', 'When', 'Where', 'Why', 'How'].includes(cleanNoun)) {
         tags.add(cleanNoun);
       }
     });

     // Limit to reasonable number of tags (max 10)
     return Array.from(tags).slice(0, 10);
   }

   /**
    * Get or create tags and return their IDs
    */
   private async getOrCreateTags(tagNames: string[]): Promise<number[]> {
     const tagIds: number[] = [];

     for (const tagName of tagNames) {
       try {
         // Check if tag already exists
         let existingTags = await this.strapi.entityService.findMany('api::tag.tag', {
           filters: { name: tagName },
           limit: 1
         }) as any[];

         let tag: any;
         if (!existingTags || existingTags.length === 0) {
           // Create new tag
           const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
           tag = await this.strapi.entityService.create('api::tag.tag', {
             data: {
               name: tagName,
               slug: slug,
               description: `Articles tagged with ${tagName}`
             }
           });
           this.strapi.log.debug(`Created new tag: ${tagName}`);
         } else {
           tag = existingTags[0];
         }

         if (tag && tag.id) {
           tagIds.push(tag.id);
         }
       } catch (error) {
         this.strapi.log.warn(`Failed to create/get tag ${tagName}: ${error.message}`);
       }
     }

     return tagIds;
   }

   /**
    * Format HTML content for rich text display
    */
   private formatHtmlContent(content: string): string {
     if (!content) return '';

     let formattedContent = content;

     // Preserve important HTML tags for rich text
     const allowedTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'u', 
                         'ul', 'ol', 'li', 'blockquote', 'img', 'a', 'br', 'hr', 'div', 'span'];

     // Clean up malformed HTML and normalize tags
     formattedContent = formattedContent
       .replace(/<\/?\w+[^>]*>/g, (tag) => {
         const tagName = tag.match(/<\/?(\w+)/)?.[1]?.toLowerCase();
         if (tagName && allowedTags.includes(tagName)) {
           return tag;
         }
         return '';
       });

     // Convert div tags to paragraphs for better structure
     formattedContent = formattedContent.replace(/<div([^>]*)>/gi, '<p$1>');
     formattedContent = formattedContent.replace(/<\/div>/gi, '</p>');

     // Ensure proper paragraph structure
     formattedContent = formattedContent.replace(/(<\/p>\s*<p[^>]*>)/gi, '$1\n\n');

     // Add emphasis to important content
     formattedContent = this.enhanceContentWithRichText(formattedContent);

     // Clean up excessive whitespace while preserving structure
     formattedContent = formattedContent
       .replace(/\n\s*\n\s*\n/g, '\n\n')
       .replace(/\s+/g, ' ')
       .trim();

     return formattedContent;
   }

  /**
   * Format content for better readability and structure with rich text elements
   */
  private formatContent(content: string, preserveHtml: boolean = true): string {
    if (!content) return '';

    let formattedContent = content;

    // If we have HTML content (from full article extraction), preserve it better
    if (preserveHtml && content.includes('<')) {
      return this.formatHtmlContent(formattedContent);
    }

    // Apply comprehensive HTML cleaning using the same logic as cleanExtractedContent
    formattedContent = this.cleanExtractedContent(formattedContent);

    if (preserveHtml) {
      // Enhance content with rich text formatting
      formattedContent = this.enhanceContentWithRichText(formattedContent);

      // Ensure proper paragraph structure if content exists but isn't wrapped
      if (formattedContent && !formattedContent.match(/<(p|h[1-6]|blockquote|ul|ol)/i)) {
        formattedContent = `<p>${formattedContent}</p>`;
      }

      return formattedContent;
    } else {
      // Remove all HTML tags for plain text processing
      formattedContent = formattedContent
        .replace(/<[^>]+>/g, ' ') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize all whitespace
        .trim();

      // Split into sentences and create richer content structure
      const sentences = formattedContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
      
      if (sentences.length === 0) return '<p>Content not available.</p>';

      // Create richer content structure
      const richContent = this.createRichContentStructure(sentences);
      return richContent;
    }
  }

  /**
   * Enhance content with rich text formatting elements
   */
  private enhanceContentWithRichText(content: string): string {
    // Add emphasis to important phrases
    content = content
      .replace(/\b(breaking|urgent|important|significant|major|critical)\b/gi, '<strong>$1</strong>')
      .replace(/\b(according to|sources say|reports indicate|officials state)\b/gi, '<em>$1</em>')
      .replace(/\b(\d{1,2}:\d{2}\s?(AM|PM|am|pm))\b/gi, '<strong>$1</strong>') // Time formatting
      .replace(/\b(\$\d+(?:,\d{3})*(?:\.\d{2})?(?:\s?(?:million|billion|trillion))?)\b/gi, '<strong>$1</strong>') // Money formatting
      .replace(/\b(\d+(?:,\d{3})*(?:\.\d+)?%)\b/gi, '<strong>$1</strong>'); // Percentage formatting

    return content;
  }

  /**
   * Create rich content structure from sentences
   */
  private createRichContentStructure(sentences: string[]): string {
    const richElements = [];
    
    // Add an engaging opening paragraph
    if (sentences.length > 0) {
      const openingSentences = sentences.slice(0, 2);
      richElements.push(`<p class="lead"><strong>${openingSentences.join('. ')}.</strong></p>`);
    }

    // Create main content paragraphs with varied structure
    const remainingSentences = sentences.slice(2);
    const paragraphs = [];
    let currentParagraph = [];
    
    for (let i = 0; i < remainingSentences.length; i++) {
      const sentence = remainingSentences[i].trim();
      currentParagraph.push(sentence);
      
      // Create new paragraph every 2-4 sentences with varied lengths
      const shouldBreak = currentParagraph.length >= 4 || 
                         (currentParagraph.length >= 2 && Math.random() > 0.6) ||
                         i === remainingSentences.length - 1;
      
      if (shouldBreak && currentParagraph.length > 0) {
        let paragraphText = currentParagraph.join('. ') + '.';
        
        // Add rich formatting to paragraphs
        paragraphText = this.enhanceContentWithRichText(paragraphText);
        
        // Occasionally add blockquotes for emphasis
        if (Math.random() > 0.8 && paragraphText.length > 100) {
          paragraphs.push(`<blockquote><p>${paragraphText}</p></blockquote>`);
        } else {
          paragraphs.push(`<p>${paragraphText}</p>`);
        }
        
        currentParagraph = [];
      }
    }

    // Add main content
    richElements.push(...paragraphs.filter(p => p.length > 50));

    // Add a concluding element if we have enough content
    if (richElements.length > 3) {
      richElements.push('<hr>');
      richElements.push('<p><em>This story is developing and will be updated as more information becomes available.</em></p>');
    }

    return richElements.join('\n\n');
  }

  /**
   * Generate clean, SEO-friendly slug from title
   */
  private generateSlug(title: string): string {
    if (!title || title.trim().length === 0) {
      // Generate a fallback slug with current date for uniqueness
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
      return `article-${dateStr}`;
    }

    let slug = title
      .toLowerCase()
      .trim()
      // Remove special characters except spaces and hyphens
      .replace(/[^\w\s-]/g, '')
      // Replace multiple spaces/underscores with single hyphen
      .replace(/[\s_]+/g, '-')
      // Replace multiple hyphens with single hyphen
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
      // Limit length for SEO (recommended max 60-70 characters)
      .substring(0, 70);

    // If slug is empty or too short after processing, create a fallback
    if (!slug || slug.length < 3) {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
      return `article-${dateStr}`;
    }

    return slug;
  }

  /**
   * Transform Google News item to Strapi article format
   */
  private async transformToArticle(item: GoogleNewsItem, category: string = ''): Promise<ParsedNewsItem> {
    const transformStartTime = Date.now();
    
    // Enhanced logging for Science category debugging
    if (category === 'Science') {
      this.strapi.log.info(`🔬 [SCIENCE-DEBUG] Starting transformation for Science article`);
      this.strapi.log.info(`🔬 [SCIENCE-DEBUG] Original item:`, {
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        hasContent: !!item.content,
        hasContentSnippet: !!item.contentSnippet
      });
    }
    
    // Clean title by removing publisher names and author names
    const originalTitle = item.title || '';
    const cleanedTitle = this.cleanTitle(originalTitle);
    const title = this.removeAuthorFromText(cleanedTitle).substring(0, 200); // Content model limit: 200
    
    this.strapi.log.info(`🔄 Transforming article: "${title}" from category: ${category}`);
    this.strapi.log.debug(`   📝 Title processing: "${originalTitle}" -> "${cleanedTitle}" -> "${title}"`);
    
    if (category === 'Science') {
      this.strapi.log.info(`🔬 [SCIENCE-DEBUG] Title processing completed: "${title}"`);
    }
    
    // Generate slug manually since auto-generation isn't working
    const slug = this.generateSlug(title);
    
    // Try to fetch full content from source URL using AI-powered extraction
    let rawContent = item.content || item.contentSnippet || '';
    let extractionResult: ExtractionResult;
    let aiExtractedData: any = null;
    
    try {
      this.strapi.log.debug(`   🔍 Starting AI-powered content extraction for: ${item.link}`);
      
      if (category === 'Science') {
        this.strapi.log.info(`🔬 [SCIENCE-DEBUG] Starting AI extraction for URL: ${item.link}`);
      }
      
      extractionResult = await this.fetchContentWithAI(item.link, item);
      
      if (category === 'Science') {
        this.strapi.log.info(`🔬 [SCIENCE-DEBUG] AI extraction completed:`, {
          method: extractionResult.extractionMethod,
          contentLength: extractionResult.content.length,
          wordCount: extractionResult.wordCount,
          quality: extractionResult.contentQuality,
          imageCount: extractionResult.images.length,
          processingTime: extractionResult.processingTime
        });
      }
      
      // If AI extraction was successful, get the structured data
      if (extractionResult.extractionMethod === 'AI (Gemini)') {
        try {
          // Re-extract to get the full AI data structure
          const response = await axios.get(item.link, {
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          const aiResult = await this.aiContentExtractor.extractWithFallback(response.data, item.link);
          if (aiResult.success) {
            aiExtractedData = aiResult.data;
          }
        } catch (aiError) {
          this.strapi.log.debug(`   ⚠️  Could not re-extract AI data: ${aiError.message}`);
        }
      }
      
      this.strapi.log.info(`   ✅ Enhanced extraction completed:`);
      this.strapi.log.info(`      📊 Method: ${extractionResult.extractionMethod}`);
      this.strapi.log.info(`      📝 Content: ${extractionResult.content.length} chars (${extractionResult.wordCount} words)`);
      this.strapi.log.info(`      🖼️  Images: ${extractionResult.images.length} optimized images`);
      this.strapi.log.info(`      🏆 Quality: ${extractionResult.contentQuality.toUpperCase()}`);
      this.strapi.log.info(`      ⏱️  Processing time: ${extractionResult.processingTime}ms`);
      
      if (extractionResult.images.length > 0) {
        const avgScore = extractionResult.images.reduce((sum, img) => sum + img.score, 0) / extractionResult.images.length;
        this.strapi.log.info(`      📈 Average image score: ${avgScore.toFixed(1)}`);
        this.strapi.log.debug(`      🖼️  Image details:`, extractionResult.images.map(img => ({
          url: img.url.substring(0, 50) + '...',
          score: img.score,
          dimensions: `${img.width}x${img.height}`,
          format: img.format
        })));
      }
      
    } catch (error) {
      this.strapi.log.warn(`   ❌ AI/Enhanced extraction failed for ${title}: ${error.message}`);
      
      if (category === 'Science') {
        this.strapi.log.error(`🔬 [SCIENCE-DEBUG] AI extraction failed with error:`, {
          errorMessage: error.message,
          errorStack: error.stack,
          errorName: error.name,
          url: item.link,
          title: title
        });
      }
      
      extractionResult = {
        content: rawContent,
        images: [],
        extractionMethod: 'RSS fallback',
        wordCount: rawContent.split(' ').length,
        contentQuality: 'poor',
        processingTime: 0
      };
    }

    // Use AI-extracted content if available, otherwise use enhanced content or RSS fallback
    const contentToProcess = (extractionResult.content && extractionResult.content.length > rawContent.length) 
      ? extractionResult.content 
      : rawContent;
    
    const formattedContent = this.formatContent(contentToProcess, true); // Preserve HTML
    const cleanedContent = this.removePublisherFromContent(formattedContent);

    // Use AI-extracted title if available and better than RSS title
    let finalTitle = title;
    if (aiExtractedData && aiExtractedData.title && aiExtractedData.title.length > 10) {
      finalTitle = aiExtractedData.title.substring(0, 200);
      this.strapi.log.debug(`   🤖 Using AI-extracted title: "${finalTitle}"`);
    }

    // Log content length for monitoring (no minimum limit enforced)
    const contentText = cleanedContent.replace(/<[^>]+>/g, '').trim();
    this.strapi.log.debug(`   📏 Article content length: ${contentText.length} characters`);
    
    // Warn if content is very short but don't skip the article
    if (contentText.length < 100) {
      this.strapi.log.warn(`   ⚠️  Article content is quite short (${contentText.length} chars): ${title}`);
    }

    // Use enhanced images if available, otherwise extract from content
    let imageUrl = '';
    let imageUrls: string[] = [];
    
    if (extractionResult.images.length > 0) {
      // Use optimized images from enhanced extraction
      imageUrl = extractionResult.images[0].url;
      imageUrls = extractionResult.images.map(img => img.url);
      this.strapi.log.debug(`   🎯 Using ${extractionResult.images.length} optimized images (primary: ${imageUrl.substring(0, 50)}...)`);
    } else {
      // Fallback to original image extraction method
      const fallbackImages = this.extractImagesFromContent(contentToProcess);
      if (fallbackImages.length > 0) {
        imageUrl = fallbackImages[0];
        imageUrls = fallbackImages;
        this.strapi.log.debug(`   🔄 Using ${fallbackImages.length} fallback images`);
      } else {
        imageUrl = await this.extractImageUrl(rawContent, title);
        if (imageUrl) imageUrls = [imageUrl];
        this.strapi.log.debug(`   📷 Using legacy image extraction`);
      }
    }

    // Extract excerpt - prioritize AI-extracted excerpt
    let excerpt = '';
    if (aiExtractedData && aiExtractedData.excerpt && aiExtractedData.excerpt.length > 20) {
      excerpt = aiExtractedData.excerpt.substring(0, 300);
      this.strapi.log.debug(`   🤖 Using AI-extracted excerpt: "${excerpt.substring(0, 50)}..."`);
    } else {
      // Fallback to RSS content snippet as excerpt (clean and limit to 300 chars)
      const rssSnippet = item.contentSnippet || item.content || '';
      const cleanSnippet = rssSnippet.replace(/<[^>]+>/g, '').trim();
      const cleanedSnippet = this.removeAuthorFromText(cleanSnippet);
      excerpt = this.cleanHtmlEntities(cleanedSnippet).substring(0, 300);
    }
    // Extract location - prioritize AI-extracted location
    let location = '';
    if (aiExtractedData && aiExtractedData.location && aiExtractedData.location.length > 2) {
      location = aiExtractedData.location.substring(0, 100);
      this.strapi.log.debug(`   🤖 Using AI-extracted location: "${location}"`);
    } else {
      location = this.extractLocationFromContent(cleanedContent);
    }
    
    // Ensure sourceUrl is valid and within limits
    let sourceUrl = '';
    if (item.link && typeof item.link === 'string' && item.link.trim()) {
      sourceUrl = item.link.trim().substring(0, 450); // Reduced to 450 to stay within 500 limit
    } else {
      this.strapi.log.warn(`   ⚠️  Invalid or missing link for article: ${title}`);
      sourceUrl = `https://news.google.com/search?q=${encodeURIComponent(title.substring(0, 50))}`.substring(0, 450);
    }

    // Extract tags - prioritize AI-extracted tags
    let extractedTags: string[] = [];
    if (aiExtractedData && aiExtractedData.tags && Array.isArray(aiExtractedData.tags) && aiExtractedData.tags.length > 0) {
      extractedTags = aiExtractedData.tags.slice(0, 10); // Limit to 10 tags
      this.strapi.log.debug(`   🤖 Using ${extractedTags.length} AI-extracted tags: ${extractedTags.join(', ')}`);
    } else {
      extractedTags = this.extractTags(finalTitle, cleanedContent, category);
    }
    this.strapi.log.debug(`   🏷️  Extracted ${extractedTags.length} tags: ${extractedTags.join(', ')}`);

    const transformTime = Date.now() - transformStartTime;
    this.strapi.log.info(`   ✅ Article transformation completed in ${transformTime}ms`);

    // Generate SEO fields - prioritize AI-extracted data
    let seoTitle = finalTitle.substring(0, 60);
    let seoDescription = excerpt.substring(0, 160);
    
    if (aiExtractedData) {
      // Use AI-extracted SEO fields if available and valid
      if (aiExtractedData.seoTitle && aiExtractedData.seoTitle.trim().length > 0) {
        seoTitle = aiExtractedData.seoTitle.substring(0, 60);
        this.strapi.log.debug(`   🤖 Using AI-extracted SEO title: "${seoTitle}"`);
      }
      if (aiExtractedData.seoDescription && aiExtractedData.seoDescription.trim().length > 0) {
        seoDescription = aiExtractedData.seoDescription.substring(0, 160);
        this.strapi.log.debug(`   🤖 Using AI-extracted SEO description: "${seoDescription}"`);
      }
    }

    const result: ParsedNewsItem = {
      title: finalTitle,
      slug: this.generateSlug(finalTitle), // Regenerate slug with final title
      excerpt,
      content: cleanedContent,
      publishedDate: new Date(item.pubDate).toISOString(),
      sourceUrl,
      location: location.substring(0, 100),
      readTime: this.calculateReadTime(cleanedContent),
      seoTitle,
      seoDescription,
      isBreaking: this.isBreakingNews(finalTitle, rawContent, category),
      imageUrl,
      tags: extractedTags,
      images: extractionResult.images,
      extractionResult
    };

    this.strapi.log.info(`🎉 Article ready for creation: "${finalTitle}" (${result.readTime} min read, ${imageUrls.length} images)`);
    
    if (category === 'Science') {
      this.strapi.log.info(`🔬 [SCIENCE-DEBUG] Transformation completed successfully:`, {
        title: result.title,
        slug: result.slug,
        contentLength: result.content.length,
        excerptLength: result.excerpt.length,
        imageCount: result.images.length,
        tagCount: result.tags.length,
        readTime: result.readTime,
        isBreaking: result.isBreaking,
        hasImageUrl: !!result.imageUrl,
        processingTime: Date.now() - transformStartTime
      });
    }
    
    return result;
  }

  /**
   * Check if article already exists in Strapi (both published and draft articles)
   */
  async articleExists(sourceUrl: string): Promise<boolean> {
    try {
      // Check for both published and draft articles to prevent duplicates
      const existingArticles = await this.strapi.entityService.findMany('api::article.article', {
        filters: {
          sourceUrl: {
            $eq: sourceUrl
          }
          // Removed publishedAt filter to check both published and draft articles
        } as any,
        limit: 1
      });

      const exists = existingArticles && existingArticles.length > 0;
      if (exists) {
        this.strapi.log.debug(`Article with sourceUrl already exists: ${sourceUrl}`);
      }
      
      return exists;
    } catch (error) {
      this.strapi.log.error('Error checking if article exists:', error);
      return false;
    }
  }

  /**
   * Get or create default author and specific category
   */
  async getAuthorAndCategory(categoryName: string = 'News') {
    try {
      // Get or create default author
      let authors = await this.strapi.entityService.findMany('api::author.author', {
        filters: { name: 'Google News Bot' },
        limit: 1
      }) as any[];

      let author: any;
      if (!authors || authors.length === 0) {
        author = await this.strapi.entityService.create('api::author.author', {
          data: {
            name: 'Google News Bot',
            slug: 'google-news-bot',
            email: 'news@googlenews.com'
          }
        });
      } else {
        author = authors[0];
      }

      // Get or create specific category
      let categories = await this.strapi.entityService.findMany('api::category.category', {
        filters: { name: categoryName },
        limit: 1
      }) as any[];

      let category: any;
      if (!categories || categories.length === 0) {
        // Create category with proper slug
        const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        category = await this.strapi.entityService.create('api::category.category', {
          data: {
            name: categoryName,
            slug: slug,
            description: `${categoryName} news articles`
          }
        });
        this.strapi.log.info(`Created new category: ${categoryName}`);
      } else {
        category = categories[0];
      }

      return { author, category };
    } catch (error) {
      this.strapi.log.error('Error getting author and category:', error);
      throw error;
    }
  }

  /**
   * Upload image from URL to Strapi media library
   */
  private async uploadImageFromUrl(imageUrl: string, title: string): Promise<any> {
    if (!imageUrl || !imageUrl.startsWith('http')) {
      this.strapi.log.debug(`Invalid image URL provided: ${imageUrl}`);
      return null;
    }

    try {
      this.strapi.log.debug(`Attempting to upload image from URL: ${imageUrl.substring(0, 100)}...`);
      
      // Download the image with proper headers
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site'
        },
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400
      });

      if (response.status !== 200 || !response.data) {
        throw new Error(`Invalid response: ${response.status} ${response.statusText}`);
      }

      // Create buffer and validate
      const buffer = Buffer.from(response.data);
      
      if (buffer.length < 1024) {
        throw new Error('Image too small (less than 1KB)');
      }
      if (buffer.length > 15 * 1024 * 1024) {
        throw new Error('Image too large (more than 15MB)');
      }
      
      // Determine content type and extension
      const contentType = response.headers['content-type'] || 'image/jpeg';
      let extension = '.jpg';
      
      if (contentType.includes('png')) extension = '.png';
      else if (contentType.includes('gif')) extension = '.gif';
      else if (contentType.includes('webp')) extension = '.webp';
      else if (contentType.includes('svg')) extension = '.svg';
      
      // Generate filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
      const filename = `article_${cleanTitle}_${timestamp}_${randomId}${extension}`;
      
      // Create form data for Strapi v4 upload
      const FormData = require('form-data');
      const form = new FormData();
      
      // Add the file buffer as a stream
      form.append('files', buffer, {
        filename: filename,
        contentType: contentType,
        knownLength: buffer.length
      });
      
      // Add file info
      form.append('fileInfo', JSON.stringify({
        name: filename,
        alternativeText: title.substring(0, 100),
        caption: `Image for article: ${title.substring(0, 150)}`,
        folder: null
      }));

      // Upload using Strapi's upload service
      const uploadResponse = await this.strapi.plugins.upload.services.upload.upload({
        data: {},
        files: {
          files: {
            name: filename,
            type: contentType,
            size: buffer.length,
            path: filename,
            buffer: buffer
          }
        }
      });

      if (uploadResponse && uploadResponse.length > 0) {
        const uploadedFile = uploadResponse[0];
        this.strapi.log.info(`✅ Successfully uploaded image: ${filename} (${(buffer.length / 1024).toFixed(1)}KB)`);
        return uploadedFile;
      } else {
        throw new Error('Upload service returned empty response');
      }
      
    } catch (error) {
      const errorMessage = error.response ? 
        `HTTP ${error.response.status}: ${error.response.statusText}` : 
        error.message;
      this.strapi.log.warn(`❌ Failed to upload image from URL: ${imageUrl.substring(0, 100)}... - ${errorMessage}`);
      return null;
    }
  }

  /**
   * Create article in Strapi
   */
  async createArticle(articleData: ParsedNewsItem, categoryName: string = 'News'): Promise<any> {
    try {
      if (categoryName === 'Science') {
        this.strapi.log.info(`🔬 [SCIENCE-DEBUG] Starting article creation for: "${articleData.title}"`);
        this.strapi.log.info(`🔬 [SCIENCE-DEBUG] Article data:`, {
          title: articleData.title,
          slug: articleData.slug,
          contentLength: articleData.content.length,
          hasImageUrl: !!articleData.imageUrl,
          tagCount: articleData.tags?.length || 0,
          categoryName: categoryName
        });
      }
      
      const { author, category } = await this.getAuthorAndCategory(categoryName);
      
      if (categoryName === 'Science') {
        this.strapi.log.info(`🔬 [SCIENCE-DEBUG] Author and category resolved:`, {
          authorId: author.id,
          authorName: author.name,
          categoryId: category.id,
          categoryName: category.name
        });
      }

      let featuredImage = null;
      
      // Try to upload the image if we have an imageUrl, but don't fail article creation if it fails
      if (articleData.imageUrl) {
        try {
          featuredImage = await this.uploadImageFromUrl(articleData.imageUrl, articleData.title);
          if (!featuredImage) {
            this.strapi.log.warn(`Image upload failed for article: ${articleData.title}, proceeding without image`);
          }
        } catch (error) {
          this.strapi.log.warn(`Image upload error for article: ${articleData.title}, proceeding without image: ${error.message}`);
          featuredImage = null;
        }
      }

      const articleWithSource = {
        title: articleData.title,
        slug: articleData.slug,
        excerpt: articleData.excerpt,
        content: articleData.content,
        readTime: articleData.readTime,
        location: articleData.location,
        seoTitle: articleData.seoTitle,
        seoDescription: articleData.seoDescription,
        isBreaking: articleData.isBreaking,
        publishedDate: articleData.publishedDate,
        sourceUrl: articleData.sourceUrl,
        author: author.id,
        category: category.id,
        publishedAt: null, // Save as draft (unpublished)
        featuredImage: featuredImage?.id || null,
        imageAlt: articleData.title.substring(0, 200) // Content model limit: 200
      };

      const article = await this.strapi.entityService.create('api::article.article', {
        data: articleWithSource,
        populate: ['author', 'category', 'featuredImage']
      });

      // Handle tags separately after article creation using relation service
      if (articleData.tags && articleData.tags.length > 0) {
        const tagIds = await this.getOrCreateTags(articleData.tags);
        if (tagIds.length > 0) {
          try {
            // Use the relation service to connect tags
            await this.strapi.db.query('api::article.article').update({
              where: { id: article.id },
              data: {
                tags: tagIds
              }
            });
            this.strapi.log.debug(`Associated ${tagIds.length} tags with article: ${articleData.title}`);
          } catch (tagError) {
            this.strapi.log.warn(`Failed to associate tags with article: ${tagError.message}`);
          }
        }
      }

      this.strapi.log.info(`Article created successfully: ${article.title}${featuredImage ? ' with image' : ''}`);
      
      if (categoryName === 'Science') {
        this.strapi.log.info(`🔬 [SCIENCE-DEBUG] Article creation successful:`, {
          articleId: article.id,
          title: article.title,
          slug: article.slug,
          categoryId: article.category?.id,
          authorId: article.author?.id,
          hasFeaturedImage: !!article.featuredImage,
          publishedAt: article.publishedAt
        });
      }
      
      return article;
    } catch (error) {
      this.strapi.log.error(`Error creating article: ${error.message}`);
      
      if (categoryName === 'Science') {
        this.strapi.log.error(`🔬 [SCIENCE-DEBUG] Article creation failed:`, {
          errorMessage: error.message,
          errorStack: error.stack,
          errorName: error.name,
          articleTitle: articleData.title
        });
      }
      
      throw error;
    }
  }

  /**
   * Process and import news from Google News
   */
  async importNews(categories: string[] = ['World'], maxArticlesPerCategory: number = 10): Promise<{
    imported: number;
    skipped: number;
    errors: number;
  }> {
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    this.strapi.log.info(`Starting Google News import for categories: ${categories.join(', ')}`);

    for (const category of categories) {
      try {
        const newsItems = await this.fetchFeed(category);
        const limitedItems = newsItems.slice(0, maxArticlesPerCategory);

        this.strapi.log.info(`Found ${newsItems.length} items, processing ${limitedItems.length} for category: ${category}`);

        for (const item of limitedItems) {
          try {
            // Validate required fields
            if (!item.title || !item.link) {
              this.strapi.log.warn(`Skipping item with missing title or link: ${JSON.stringify(item)}`);
              skipped++;
              continue;
            }

            // Check if article already exists
            const exists = await this.articleExists(item.link);
            if (exists) {
              this.strapi.log.debug(`Article already exists, skipping: ${item.title}`);
              skipped++;
              continue;
            }

            // Transform article data with error handling
            let articleData: ParsedNewsItem;
            try {
              articleData = await this.transformToArticle(item, category);
            } catch (transformError) {
              this.strapi.log.error(`Error transforming article: ${item.title}`, transformError);
              errors++;
              continue;
            }

            // Validate transformed data
            if (!articleData.title || articleData.title.trim().length === 0) {
              this.strapi.log.warn(`Skipping article with empty title after transformation: ${item.title}`);
              skipped++;
              continue;
            }

            // Add sourceUrl to track duplicates
            const articleWithSource = {
              ...articleData,
              sourceUrl: item.link
            };

            // Create article with retry logic
            let createAttempts = 0;
            const maxAttempts = 3;
            let articleCreated = false;

            while (createAttempts < maxAttempts && !articleCreated) {
              try {
                await this.createArticle(articleWithSource, category);
                this.strapi.log.info(`Successfully created article: ${articleData.title} in category: ${category}`);
                imported++;
                articleCreated = true;
              } catch (createError) {
                createAttempts++;
                this.strapi.log.warn(`Attempt ${createAttempts} failed for article: ${articleData.title}`, createError);
                
                if (createAttempts >= maxAttempts) {
                  this.strapi.log.error(`Failed to create article after ${maxAttempts} attempts: ${articleData.title}`, createError);
                  errors++;
                } else {
                  // Wait before retry
                  await new Promise(resolve => setTimeout(resolve, 1000 * createAttempts));
                }
              }
            }

            // Add small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (error) {
            this.strapi.log.error(`Unexpected error processing article: ${item.title || 'Unknown title'}`, error);
            errors++;
            
            // Continue processing other articles even if one fails
            continue;
          }
        }

        this.strapi.log.info(`Completed processing category: ${category}. Imported: ${imported}, Skipped: ${skipped}, Errors: ${errors}`);

      } catch (categoryError) {
        this.strapi.log.error(`Error processing category ${category}:`, categoryError);
        errors++;
        
        // Continue with next category even if current one fails
        continue;
      }
    }

    const result = { imported, skipped, errors };
    this.strapi.log.info('Google News import completed:', result);
    return result;
  }

  /**
   * Test AI extraction with provided content (for testing purposes)
   */
  async testAIExtraction(mockArticle: any): Promise<any> {
    try {
      this.strapi.log.info(`🧪 Testing AI extraction for: ${mockArticle.title}`);
      
      const startTime = Date.now();
      
      // Use the existing AI extraction method
      const extractionResult = await this.fetchContentWithAI(mockArticle.link, mockArticle);
      
      const processingTime = Date.now() - startTime;
      
      this.strapi.log.info(`✅ AI extraction test completed in ${processingTime}ms`);
      
      return {
        title: mockArticle.title,
        content: extractionResult.content || 'No content extracted',
        tags: [], // Tags are not part of ExtractionResult
        images: extractionResult.images || [],
        quality: extractionResult.contentQuality || 'UNKNOWN',
        method: extractionResult.extractionMethod || 'AI',
        wordCount: extractionResult.wordCount || 0,
        processingTime: processingTime,
        success: true,
        originalUrl: mockArticle.link,
        extractedAt: new Date().toISOString()
      };
      
    } catch (error) {
      this.strapi.log.error('AI extraction test failed:', error);
      
      return {
        title: mockArticle.title,
        content: 'AI extraction failed',
        tags: [],
        images: [],
        quality: 'FAILED',
        method: 'ERROR',
        processingTime: 0,
        success: false,
        error: error.message,
        originalUrl: mockArticle.link,
        extractedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Enhanced URL resolution with retry logic and comprehensive logging
   */
  private async resolveUrlWithRetry(originalUrl: string, maxRetries: number = 3): Promise<string> {
    this.strapi.log.info(`🔗 [URL-RESOLVER] Starting URL resolution for: ${originalUrl}`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.strapi.log.info(`🔄 [URL-RESOLVER] Attempt ${attempt}/${maxRetries}`);
        
        // Handle Google News URLs that need special resolution
        if (originalUrl.includes('news.google.com')) {
          this.strapi.log.info(`📰 [URL-RESOLVER] Detected Google News URL, applying special resolution`);
          
          const response = await axios.get(originalUrl, {
            maxRedirects: 5,
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1'
            }
          });
          
          const resolvedUrl = response.request.res.responseUrl || originalUrl;
          this.strapi.log.info(`✅ [URL-RESOLVER] Google News URL resolved: ${resolvedUrl}`);
          return resolvedUrl;
        }

        // For other URLs, follow redirects to get final URL
        this.strapi.log.info(`🌐 [URL-RESOLVER] Resolving standard URL with redirect following`);
        const response = await axios.head(originalUrl, {
          maxRedirects: 5,
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        
        const resolvedUrl = response.request.res.responseUrl || originalUrl;
        this.strapi.log.info(`✅ [URL-RESOLVER] URL resolved successfully: ${resolvedUrl}`);
        return resolvedUrl;
        
      } catch (error) {
        this.strapi.log.warn(`⚠️ [URL-RESOLVER] Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt === maxRetries) {
          this.strapi.log.error(`❌ [URL-RESOLVER] All ${maxRetries} attempts failed, returning original URL`);
          return originalUrl;
        }
        
        // Wait before retry
        const delay = attempt * 1000; // Exponential backoff
        this.strapi.log.info(`⏱️ [URL-RESOLVER] Waiting ${delay}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return originalUrl;
  }

  /**
   * Update batch processing statistics for monitoring
   */
  private updateBatchProcessingStats(successCount: number, failureCount: number, totalTime: number): void {
    this.processingStats.totalProcessed += successCount + failureCount;
    this.processingStats.successfulExtractions += successCount;
    this.processingStats.failedExtractions += failureCount;
    this.processingStats.totalProcessingTime += totalTime;
    this.processingStats.averageProcessingTime = this.processingStats.totalProcessingTime / this.processingStats.totalProcessed;
    
    this.strapi.log.info(`📊 [STATS] Updated processing statistics:`);
    this.strapi.log.info(`📊 [STATS] Total processed: ${this.processingStats.totalProcessed}`);
    this.strapi.log.info(`📊 [STATS] Success rate: ${Math.round((this.processingStats.successfulExtractions / this.processingStats.totalProcessed) * 100)}%`);
    this.strapi.log.info(`📊 [STATS] Average processing time: ${Math.round(this.processingStats.averageProcessingTime)}ms`);
  }

  /**
   * Cleanup resources when service is destroyed
   */
  async cleanup(): Promise<void> {
    try {
      await this.articleExtractor.cleanup();
      this.strapi.log.info('Google News Feed Service cleanup completed');
    } catch (error) {
      this.strapi.log.error('Error during Google News Feed Service cleanup:', error);
    }
  }
}

export default GoogleNewsFeedService;

import Parser = require('rss-parser');
import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';
import AIContentExtractor from './ai-content-extractor';

interface GoogleNewsItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  guid: string;
  source?: string;
}

interface ProcessedArticle {
  title: string;
  slug?: string; // Optional since Strapi auto-generates from title
  excerpt: string;
  content: string;
  publishedDate: string;
  sourceUrl: string;
  location: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
}

class GoogleNewsFeedService {
  private parser: Parser;
  private readonly baseUrl = 'https://news.google.com/rss';
  private aiContentExtractor: AIContentExtractor;
  private strapi: any;

  // Limited predefined categories only
  private readonly categoryUrls = {
  Politics: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZxYUdjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
  Economy: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
  World: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
  Society: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
  Science: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1RjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
  Culture: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNREpxYW5RU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
  Sport: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1ZEdvU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
  Security: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
  Law: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
  };

  constructor(strapiInstance?: any) {
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
    
    this.aiContentExtractor = new AIContentExtractor(this.strapi);
  }

  /**
   * Get available categories
   */
  getAvailableCategories(): string[] {
    return Object.keys(this.categoryUrls);
  }

  /**
   * Fetch RSS feed for a specific category
   */
  private async fetchRSSFeed(category: string): Promise<GoogleNewsItem[]> {
    const url = this.categoryUrls[category];
    if (!url) {
      throw new Error(`Invalid category: ${category}. Available categories: ${this.getAvailableCategories().join(', ')}`);
    }

    try {
      this.strapi.log.info(`Fetching RSS feed for category: ${category}`);
      const feed = await this.parser.parseURL(url);
      
      return feed.items.map(item => ({
        title: item.title || '',
        link: item.link || '',
        pubDate: item.pubDate || '',
        content: item.content || '',
        contentSnippet: item.contentSnippet || '',
        guid: item.guid || '',
        source: item.source || 'Google News'
      }));
    } catch (error) {
      this.strapi.log.error(`Error fetching RSS feed for ${category}:`, error);
      throw error;
    }
  }

  /**
   * Resolve RSS link to get the actual article URL using improved Google News method
   */
  private async resolveRSSLink(googleRssUrl: string): Promise<string> {
    try {
      this.strapi.log.info(`🔄 Resolving Google News URL: ${googleRssUrl}`);
      
      // Step 1: Get the initial page to extract data-p attribute
      const response = await axios.get(googleRssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
        },
        timeout: 15000
      });
      
      const $ = cheerio.load(response.data);
      const dataP = $('c-wiz[data-p]').attr('data-p');
      
      if (!dataP) {
        this.strapi.log.warn(`No data-p attribute found for ${googleRssUrl}, falling back to simple redirect`);
        return await this.fallbackUrlResolution(googleRssUrl);
      }
      
      // Step 2: Parse the data-p attribute
      const obj = JSON.parse(dataP.replace('%.@.', '["garturlreq",'));
      
      // Step 3: Prepare payload for Google's batch execute endpoint
      const payload = {
        'f.req': JSON.stringify([[['Fbv4je', JSON.stringify([...obj.slice(0, -6), ...obj.slice(-2)]), 'null', 'generic']]])
      };
      
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
      };
      
      // Step 4: Make the batch execute request
      const postResponse = await axios.post('https://news.google.com/_/DotsSplashUi/data/batchexecute', payload, { 
        headers,
        timeout: 15000
      });
      
      // Step 5: Parse the response to get the actual article URL
      const cleanedResponse = postResponse.data.replace(")]}'", "");
      const parsedResponse = JSON.parse(cleanedResponse);
      const arrayString = parsedResponse[0][2];
      const articleUrl = JSON.parse(arrayString)[1];
      
      this.strapi.log.info(`✅ Successfully resolved URL: ${googleRssUrl} → ${articleUrl}`);
      return articleUrl;
      
    } catch (error) {
      this.strapi.log.error(`❌ Failed to resolve Google News URL ${googleRssUrl}:`, error.message);
      // Fallback to simple redirect following
      return await this.fallbackUrlResolution(googleRssUrl);
    }
  }

  /**
   * Fallback URL resolution method using simple redirect following
   */
  private async fallbackUrlResolution(rssLink: string): Promise<string> {
    try {
      this.strapi.log.info(`🔄 Using fallback URL resolution for: ${rssLink}`);
      const response = await axios.get(rssLink, {
        maxRedirects: 5,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const resolvedUrl = response.request.res.responseUrl || rssLink;
      this.strapi.log.info(`✅ Fallback resolution: ${rssLink} → ${resolvedUrl}`);
      return resolvedUrl;
    } catch (error) {
      this.strapi.log.warn(`Failed to resolve RSS link with fallback: ${rssLink}`, error);
      return rssLink; // Return original link if resolution fails
    }
  }

  /**
   * Extract HTML content using multi-tier fallback approach
   * 1. Axios + Cheerio (fast, lightweight, works for most static content)
   * 2. JSDOM (for content needing basic DOM simulation)
   * 3. Puppeteer (only for local development or when explicitly enabled)
   */
  private async extractHTMLContent(url: string): Promise<string> {
    const isProduction = process.env.NODE_ENV === 'production';
    const enablePuppeteer = process.env.ENABLE_PUPPETEER === 'true';
    
    this.strapi.log.info(`🌐 Extracting HTML content from: ${url}`);
    this.strapi.log.info(`🏭 Environment: ${isProduction ? 'production' : 'development'}`);
    
    // Method 1: Axios + Cheerio (Primary - Fast and reliable)
    try {
      this.strapi.log.info(`📄 Attempting extraction with Axios + Cheerio...`);
      const content = await this.extractWithAxiosCheerio(url);
      if (content && content.length > 100) {
        this.strapi.log.info(`✅ Axios + Cheerio extraction successful (${content.length} chars)`);
        return content;
      }
      this.strapi.log.warn(`⚠️ Axios + Cheerio returned insufficient content (${content.length} chars)`);
    } catch (error) {
      this.strapi.log.warn(`⚠️ Axios + Cheerio extraction failed:`, error.message);
    }

    // Method 2: JSDOM (Secondary - For basic DOM simulation)
    try {
      this.strapi.log.info(`🔧 Attempting extraction with JSDOM...`);
      const content = await this.extractWithJSDOM(url);
      if (content && content.length > 100) {
        this.strapi.log.info(`✅ JSDOM extraction successful (${content.length} chars)`);
        return content;
      }
      this.strapi.log.warn(`⚠️ JSDOM returned insufficient content (${content.length} chars)`);
    } catch (error) {
      this.strapi.log.warn(`⚠️ JSDOM extraction failed:`, error.message);
    }

    // Method 3: Puppeteer (Final fallback - Only in development or when explicitly enabled)
    if (!isProduction || enablePuppeteer) {
      try {
        this.strapi.log.info(`🤖 Attempting extraction with Puppeteer...`);
        const content = await this.extractWithPuppeteer(url);
        if (content && content.length > 100) {
          this.strapi.log.info(`✅ Puppeteer extraction successful (${content.length} chars)`);
          return content;
        }
        this.strapi.log.warn(`⚠️ Puppeteer returned insufficient content (${content.length} chars)`);
      } catch (error) {
        this.strapi.log.warn(`⚠️ Puppeteer extraction failed:`, error.message);
      }
    } else {
      this.strapi.log.info(`🚫 Puppeteer disabled in production (set ENABLE_PUPPETEER=true to enable)`);
    }

    // If all methods fail, return empty string
    this.strapi.log.error(`❌ All extraction methods failed for: ${url}`);
    return '';
  }

  /**
   * Extract content using Axios + Cheerio (Primary method)
   */
  private async extractWithAxiosCheerio(url: string): Promise<string> {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 400,
    });

    const $ = cheerio.load(response.data);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share').remove();
    
    // Try to find main content areas in order of preference
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.article-body',
      '.story-body',
      '.content-body',
      '.main-content',
      '.content',
      'main',
      '.post',
      '.story'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const text = element.text().trim();
        if (text.length > 100) {
          return text;
        }
      }
    }
    
    // Fallback to body content, but clean it up
    const bodyText = $('body').text().trim();
    return bodyText;
  }

  /**
   * Extract content using JSDOM (Secondary method)
   */
  private async extractWithJSDOM(url: string): Promise<string> {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      maxRedirects: 5,
    });

    const dom = new JSDOM(response.data, {
      url: url,
      referrer: url,
      contentType: "text/html",
      includeNodeLocations: false,
      storageQuota: 10000000
    });

    const document = dom.window.document;
    
    // Remove unwanted elements
    const unwantedSelectors = ['script', 'style', 'nav', 'header', 'footer', 'aside', '.advertisement', '.ads', '.social-share'];
    unwantedSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    // Try to find main content areas
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.article-body',
      '.story-body',
      '.content-body',
      '.main-content',
      '.content',
      'main'
    ];
    
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim() || '';
        if (text.length > 100) {
          return text;
        }
      }
    }
    
    // Fallback to body content
    return document.body.textContent?.trim() || '';
  }

  /**
   * Extract content using Puppeteer (Final fallback - development only)
   */
  private async extractWithPuppeteer(url: string): Promise<string> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      const content = await page.evaluate(() => {
        // Remove unwanted elements
        const unwantedSelectors = ['script', 'style', 'nav', 'header', 'footer', 'aside', '.advertisement', '.ads', '.social-share'];
        unwantedSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => el.remove());
        });
        
        // Try to find main content areas
        const selectors = [
          'article',
          '[role="main"]',
          '.article-content',
          '.post-content',
          '.entry-content',
          '.article-body',
          '.story-body',
          '.content-body',
          '.main-content',
          '.content',
          'main'
        ];
        
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            const text = element.textContent || (element as any).innerText || '';
            if (text.trim().length > 100) {
              return text.trim();
            }
          }
        }
        
        // Fallback to body content
        return document.body.textContent || (document.body as any).innerText || '';
      });
      
      return content.trim();
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Check if article already exists
   */
  private async articleExists(sourceUrl: string): Promise<boolean> {
    try {
      const existingArticle = await this.strapi.entityService.findMany('api::article.article', {
        filters: { sourceUrl },
        publicationState: 'preview'
      });
      
      return existingArticle && existingArticle.length > 0;
    } catch (error) {
      this.strapi.log.error('Error checking if article exists:', error);
      return false;
    }
  }

  /**
   * Process article through AI to get structured content
   */
  private async processArticleWithAI(htmlContent: string, sourceUrl: string, originalTitle: string, category: string = 'World'): Promise<ProcessedArticle> {
    try {
      this.strapi.log.info(`🤖 Processing article with AI: ${originalTitle}`);
      this.strapi.log.info(`📄 Content length: ${htmlContent.length} characters`);
      this.strapi.log.info(`🔗 Source URL: ${sourceUrl}`);
      
      // Handle cases where HTML extraction failed
      let contentForAI = htmlContent;
      let contentSnippet = '';
      
      if (!htmlContent || htmlContent.length < 50) {
        this.strapi.log.warn(`⚠️ Insufficient HTML content (${htmlContent.length} chars), using title and URL for AI processing`);
        contentForAI = `Title: ${originalTitle}\nSource: ${sourceUrl}\n\nNote: Full content extraction failed. Please generate content based on the title and source.`;
        contentSnippet = `${originalTitle} - Content extraction failed`;
      } else {
        contentSnippet = htmlContent.substring(0, 200) + '...';
      }
      
      const aiResult = await this.aiContentExtractor.extractFromRSSItem({
         title: originalTitle,
         link: sourceUrl,
         content: contentForAI,
         contentSnippet: contentSnippet
       }, category);
       
       if (!aiResult.success) {
         this.strapi.log.error(`❌ AI extraction failed for "${originalTitle}": ${aiResult.error}`);
         
         // If both HTML extraction and AI failed, create a basic article structure
         if (!htmlContent || htmlContent.length < 50) {
           this.strapi.log.warn(`⚠️ Creating basic article structure due to extraction failures`);
           
           const basicArticle = {
             title: originalTitle,
             slug: this.generateSlugWithTimestamp(originalTitle),
             excerpt: `${originalTitle} - Full content extraction failed. Please visit the source for complete article.`,
             content: `<h1>${originalTitle}</h1><p>Content extraction failed for this article. Please visit the <a href="${sourceUrl}" target="_blank">original source</a> to read the full article.</p>`,
             publishedDate: new Date().toISOString(),
             sourceUrl: sourceUrl,
             location: '',
             seoTitle: originalTitle,
             seoDescription: `${originalTitle} - Visit source for full content`,
             tags: [category.toLowerCase(), 'extraction-failed']
           };
           
           this.strapi.log.info(`📝 Created basic article structure for: ${basicArticle.title}`);
           return basicArticle;
         }
         
         // If we have HTML content but AI failed, throw error
         this.strapi.log.error(`🚫 Skipping article creation due to AI generation failure`);
         throw new Error(`AI generation failed: ${aiResult.error}`);
       }
       
       this.strapi.log.info(`✅ AI processing successful for: ${aiResult.data.title || originalTitle}`);
       
       // Use fallback values when AI data is incomplete
       const processedArticle = {
         title: aiResult.data.title || originalTitle,
         slug: this.generateSlugWithTimestamp(aiResult.data.title || originalTitle),
         excerpt: aiResult.data.excerpt || (htmlContent.length > 200 ? htmlContent.substring(0, 200) + '...' : `${originalTitle} - Please visit source for full content`),
         content: aiResult.data.content || (htmlContent.length > 50 ? htmlContent : `<h1>${originalTitle}</h1><p>Please visit the <a href="${sourceUrl}" target="_blank">original source</a> for the full article.</p>`),
         publishedDate: new Date().toISOString(),
         sourceUrl: sourceUrl,
         location: aiResult.data.location || '',
         seoTitle: aiResult.data.seoTitle || aiResult.data.title || originalTitle,
         seoDescription: aiResult.data.seoDescription || aiResult.data.excerpt || `${originalTitle} - News article`,
         tags: aiResult.data.tags || [category.toLowerCase()]
       };
       
       this.strapi.log.info(`✅ AI processing completed successfully for: ${processedArticle.title}`);
       return processedArticle;
       
    } catch (error) {
      this.strapi.log.error(`❌ Error processing article with AI "${originalTitle}":`, error.message);
      throw error;
    }
  }

  /**
   * Generate unique slug from title with date and timestamp
   */
  private generateSlugWithTimestamp(title: string): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
    const timeStr = now.getTime().toString().slice(-6); // Last 6 digits of timestamp
    
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
      .trim()
      .substring(0, 50); // Limit base slug length
    
    // Ensure minimum length and add date/time for uniqueness
    const cleanSlug = baseSlug.length < 3 ? 'article' : baseSlug;
    
    return `${cleanSlug}-${dateStr}-${timeStr}`;
  }

  /**
   * Create article in Strapi
   */
  private async createArticle(articleData: ProcessedArticle, categoryName: string): Promise<void> {
    try {
      this.strapi.log.info(`🔄 Creating article: ${articleData.title}`);
      
      // Find the category
      const categories = await this.strapi.entityService.findMany('api::category.category', {
        filters: { name: categoryName }
      });
      
      if (!categories || categories.length === 0) {
        throw new Error(`Category not found: ${categoryName}`);
      }
      
      const category = categories[0];
      this.strapi.log.info(`📁 Found category: ${category.name} (ID: ${category.id})`);
      
      // Handle tags - ensure they exist or create them
      let tagIds = [];
      if (articleData.tags && articleData.tags.length > 0) {
        this.strapi.log.info(`🏷️ Processing ${articleData.tags.length} tags for article`);
        for (const tagName of articleData.tags) {
          try {
            // Find or create tag
            let existingTags = await this.strapi.entityService.findMany('api::tag.tag', {
              filters: { name: tagName }
            });
            
            if (existingTags && existingTags.length > 0) {
              tagIds.push(existingTags[0].id);
              this.strapi.log.debug(`✅ Found existing tag: ${tagName} (ID: ${existingTags[0].id})`);
            } else {
              // Create new tag with proper slug generation
              const newTag = await this.strapi.entityService.create('api::tag.tag', {
                data: { 
                  name: tagName,
                  slug: tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
                }
              });
              tagIds.push(newTag.id);
              this.strapi.log.debug(`✅ Created new tag: ${tagName} (ID: ${newTag.id})`);
            }
          } catch (tagError) {
            this.strapi.log.warn(`⚠️ Failed to process tag "${tagName}": ${tagError.message}`);
          }
        }
      }

      // Prepare article data with proper structure
      const articleCreateData = {
        title: articleData.title,
        slug: articleData.slug, // Use the unique slug generated during processing
        excerpt: articleData.excerpt,
        content: articleData.content,
        publishedDate: articleData.publishedDate,
        sourceUrl: articleData.sourceUrl,
        location: articleData.location,
        seoTitle: articleData.seoTitle?.substring(0, 60) || articleData.title?.substring(0, 60), // Max 60 chars for SEO title
        seoDescription: articleData.seoDescription?.substring(0, 160) || articleData.excerpt?.substring(0, 160), // Max 160 chars for SEO description
        tags: tagIds, // Use tag IDs instead of names
        category: category.id,
        readTime: Math.max(1, Math.ceil(articleData.content?.length / 1000) || 1), // Estimate read time based on content length
        isBreaking: false, // Default to false for imported articles
        publishedAt: null,
        locale: 'en' // Explicitly set locale to avoid null locale issues
      };

      this.strapi.log.debug(`📝 Article data prepared:`, {
        title: articleCreateData.title,
        excerptLength: articleCreateData.excerpt?.length,
        contentLength: articleCreateData.content?.length,
        categoryId: articleCreateData.category,
        tagsCount: articleCreateData.tags?.length,
        readTime: articleCreateData.readTime
      });
      
      // Create the article using entity service (bypasses API permissions for internal operations)
      const createdArticle = await this.strapi.entityService.create('api::article.article', {
        data: articleCreateData,
        populate: ['category', 'tags'] // Populate relations for verification
      });
      
      this.strapi.log.info(`✅ Article created successfully: ${articleData.title} (ID: ${createdArticle.id})`);
      return createdArticle;
    } catch (error) {
      this.strapi.log.error(`❌ Error creating article "${articleData.title}":`, {
        message: error.message,
        details: error.details,
        stack: error.stack,
        name: error.name,
        code: error.code
      });
      
      // Log the article data that failed to create
      this.strapi.log.error('Failed article data:', {
        title: articleData.title,
        hasExcerpt: !!articleData.excerpt,
        hasContent: !!articleData.content,
        sourceUrl: articleData.sourceUrl,
        categoryName: categoryName
      });
      
      throw error;
    }
  }

  /**
   * Main import method - simplified flow
   */
  async importNews(categories: string[] = ['World'], maxArticlesPerCategory: number = 10): Promise<{
    imported: number;
    skipped: number;
    errors: number;
  }> {
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    this.strapi.log.info(`Starting simplified news import for categories: ${categories.join(', ')}`);

    for (const category of categories) {
      try {
        // Validate category
        if (!this.categoryUrls[category]) {
          this.strapi.log.error(`Invalid category: ${category}. Available: ${this.getAvailableCategories().join(', ')}`);
          errors++;
          continue;
        }

        // Step 1: Fetch RSS articles
        const rssItems = await this.fetchRSSFeed(category);
        const limitedItems = rssItems.slice(0, maxArticlesPerCategory);
        
        this.strapi.log.info(`Found ${rssItems.length} RSS items, processing ${limitedItems.length} for category: ${category}`);

        for (const item of limitedItems) {
          try {
            // Validate required fields
            if (!item.title || !item.link) {
              this.strapi.log.warn(`Skipping item with missing title or link`);
              skipped++;
              continue;
            }

            // Step 2: Resolve RSS link to get actual URL
            const resolvedUrl = await this.resolveRSSLink(item.link);
            
            // Check if article already exists
            const exists = await this.articleExists(resolvedUrl);
            if (exists) {
              this.strapi.log.debug(`Article already exists, skipping: ${item.title}`);
              skipped++;
              continue;
            }

            // Step 3: Extract HTML content using Puppeteer
            const htmlContent = await this.extractHTMLContent(resolvedUrl);
            this.strapi.log.info(`Successfully extracted HTML content for article: ${htmlContent}`);
            if (!htmlContent || htmlContent.trim().length < 100) {
              this.strapi.log.warn(`Insufficient content extracted for: ${item.title}`);
              skipped++;
              continue;
            }

            // Step 4: Process with AI to get structured article data
            const processedArticle = await this.processArticleWithAI(htmlContent, resolvedUrl, item.title, category);
            
            // Step 5: Create article in Strapi
            await this.createArticle(processedArticle, category);
            
            imported++;
            this.strapi.log.info(`Successfully imported article: ${processedArticle.title}`);
            
            // Small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 1000));

          } catch (error) {
            this.strapi.log.error(`Error processing article: ${item.title}`, error);
            errors++;
          }
        }

      } catch (error) {
        this.strapi.log.error(`Error processing category ${category}:`, error);
        errors++;
      }
    }

    const result = { imported, skipped, errors };
    this.strapi.log.info(`Import completed:`, result);
    return result;
  }

  /**
    * Test AI extraction functionality
    */
   async testAIExtraction(testItem: { link: string; title: string }): Promise<any> {
     try {
       this.strapi.log.info(`Testing AI extraction for URL: ${testItem.link}`);
       
       // Extract HTML content
       const htmlContent = await this.extractHTMLContent(testItem.link);
       
       if (!htmlContent || htmlContent.trim().length < 100) {
         throw new Error('Insufficient content extracted');
       }
       
       // Test AI extraction
       const aiResult = await this.aiContentExtractor.extractFromRSSItem({
         title: testItem.title,
         link: testItem.link,
         content: htmlContent,
         description: 'Test description'
       }, 'World');
       
       return {
         success: true,
         contentLength: htmlContent.length,
         aiResult: aiResult
       };
       
     } catch (error) {
       this.strapi.log.error('Error testing AI extraction:', error);
       return {
         success: false,
         error: error.message
       };
     }
   }
}

export default GoogleNewsFeedService;
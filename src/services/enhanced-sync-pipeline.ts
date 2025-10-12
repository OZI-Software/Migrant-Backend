/**
 * Enhanced Synchronous RSS to Strapi Pipeline
 * Implements all 5 phases: RSS Fetching → Content Extraction → AI Processing → Strapi Integration → Sync Execution
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Parser from 'rss-parser';

interface RSSItem {
  title: string;
  link: string;
  pubDate?: string;
  contentSnippet?: string;
  content?: string;
  guid?: string;
}

interface ExtractedContent {
  title: string;
  content: string;
  excerpt: string;
  author?: string;
  publishedDate?: string;
  metaDescription?: string;
  images: string[];
  resolvedUrl: string;
  wordCount: number;
}

interface AIProcessedArticle {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  category: string;
  location: string;
  author?: string;
  publishedDate?: string;
  sourceUrl: string;
  resolvedUrl: string;
  images: string[];
  readingTime: number;
  wordCount: number;
}

interface ProcessingResult {
  success: boolean;
  articleId?: number;
  error?: string;
  originalTitle: string;
  processingTime: number;
}

export class EnhancedSyncPipeline {
  private strapi: any;
  private parser: Parser;
  private geminiAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  // RSS Feed URLs for the 6 required categories
  private readonly feedUrls = {
    technology: 'https://news.google.com/rss/search?q=technology&hl=en-US&gl=US&ceid=US:en',
    business: 'https://news.google.com/rss/search?q=business&hl=en-US&gl=US&ceid=US:en',
    sports: 'https://news.google.com/rss/search?q=sports&hl=en-US&gl=US&ceid=US:en',
    entertainment: 'https://news.google.com/rss/search?q=entertainment&hl=en-US&gl=US&ceid=US:en',
    health: 'https://news.google.com/rss/search?q=health&hl=en-US&gl=US&ceid=US:en',
    science: 'https://news.google.com/rss/search?q=science&hl=en-US&gl=US&ceid=US:en'
  };

  constructor(strapiInstance?: any) {
    this.strapi = strapiInstance || (global as any).strapi;
    this.parser = new Parser({
      customFields: {
        item: ['media:content', 'media:thumbnail']
      }
    });

    // Initialize Gemini AI if API key is available
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      this.geminiAI = new GoogleGenerativeAI(geminiApiKey);
      this.model = this.geminiAI.getGenerativeModel({ 
        model: 'gemini-pro',
        generationConfig: {
          temperature: 0.1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        }
      });
      this.strapi.log.info('✅ Gemini AI initialized successfully with gemini-pro');
    } else {
      this.strapi.log.warn('⚠️ GEMINI_API_KEY not found - AI processing will be skipped');
    }
  }

  /**
   * PHASE 1: RSS FETCHING
   * Fetch articles from Google News RSS feeds for specified categories
   */
  async fetchRSSFeeds(categories: string[] = Object.keys(this.feedUrls)): Promise<Map<string, RSSItem[]>> {
    this.strapi.log.info(`🔄 PHASE 1: Fetching RSS feeds for categories: ${categories.join(', ')}`);
    
    const results = new Map<string, RSSItem[]>();

    for (const category of categories) {
      if (!this.feedUrls[category]) {
        this.strapi.log.warn(`⚠️ Unknown category: ${category}`);
        continue;
      }

      try {
        this.strapi.log.info(`📡 Fetching RSS feed for ${category}...`);
        
        const response = await axios.get(this.feedUrls[category], {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        const feed = await this.parser.parseString(response.data);
        const items: RSSItem[] = feed.items.map(item => ({
          title: item.title || '',
          link: item.link || '',
          pubDate: item.pubDate,
          contentSnippet: item.contentSnippet,
          content: item.content,
          guid: item.guid
        }));

        results.set(category, items);
        this.strapi.log.info(`✅ Fetched ${items.length} items for ${category}`);

        // Add delay between RSS requests
        await this.delay(1000);

      } catch (error) {
        this.strapi.log.error(`❌ Failed to fetch RSS for ${category}: ${error.message}`);
        results.set(category, []);
      }
    }

    return results;
  }

  /**
   * PHASE 2: URL RESOLUTION & CONTENT EXTRACTION
   * Resolve Google News URLs and extract meaningful content
   */
  async extractContent(rssItem: RSSItem): Promise<ExtractedContent | null> {
    try {
      this.strapi.log.debug(`🔗 Resolving URL: ${rssItem.link}`);
      
      // Step 1: Resolve URL redirects
      const resolvedUrl = await this.resolveUrlRedirects(rssItem.link);
      this.strapi.log.debug(`✅ Resolved to: ${resolvedUrl}`);

      // Step 2: Fetch the actual article content
      const response = await axios.get(resolvedUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        }
      });

      // Step 3: Parse HTML and extract content using Cheerio
      const $ = cheerio.load(response.data);
      
      // Extract title
      const title = this.extractTitle($, rssItem.title);
      
      // Extract main content
      const content = this.extractMainContent($);
      
      // Extract excerpt/meta description
      const excerpt = this.extractExcerpt($, content);
      
      // Extract author
      const author = this.extractAuthor($);
      
      // Extract published date
      const publishedDate = this.extractPublishedDate($, rssItem.pubDate);
      
      // Extract meta description
      const metaDescription = $('meta[name="description"]').attr('content') || 
                             $('meta[property="og:description"]').attr('content') || '';
      
      // Extract images
      const images = this.extractImages($, resolvedUrl);
      
      // Calculate word count
      const wordCount = this.countWords(content);

      if (!content || content.length < 100) {
        throw new Error('Insufficient content extracted');
      }

      return {
        title,
        content,
        excerpt,
        author,
        publishedDate,
        metaDescription,
        images,
        resolvedUrl,
        wordCount
      };

    } catch (error) {
      this.strapi.log.error(`❌ Content extraction failed for ${rssItem.link}: ${error.message}`);
      return null;
    }
  }

  /**
   * PHASE 3: AI PROCESSING
   * Process extracted content with Gemini AI using structured prompt
   */
  async processWithAI(extractedContent: ExtractedContent, category: string): Promise<AIProcessedArticle | null> {
    if (!this.model) {
      this.strapi.log.warn('⚠️ Gemini AI not available - using fallback processing');
      return this.fallbackProcessing(extractedContent, category);
    }

    try {
      this.strapi.log.debug(`🤖 Processing with Gemini AI...`);

      const prompt = `You are a professional news editor. Transform the following article into a structured CMS format.

**ARTICLE DATA:**
- Title: ${extractedContent.title}
- Category: ${category}
- Word Count: ${extractedContent.wordCount}
- Source: ${extractedContent.resolvedUrl}

**CONTENT:**
${extractedContent.content.substring(0, 6000)}

**REQUIREMENTS:**
1. Create compelling title (15-70 characters)
2. Write engaging excerpt (120-200 characters)
3. Format content with proper HTML paragraphs
4. Generate SEO title and description
5. Extract 4-6 specific, relevant tags
6. Identify location if mentioned (city/country format)
7. Create SEO-friendly slug

**OUTPUT (JSON ONLY):**
{
  "title": "Engaging news headline",
  "slug": "seo-friendly-slug",
  "excerpt": "Compelling summary 120-200 chars",
  "content": "<p>Well-structured HTML content</p>",
  "seoTitle": "SEO title under 65 chars",
  "seoDescription": "Meta description under 160 chars",
  "tags": ["specific-tag1", "specific-tag2", "specific-tag3", "specific-tag4"],
  "location": "City, Country or Global",
  "readingTime": ${Math.ceil(extractedContent.wordCount / 200)}
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }

      const aiResult = JSON.parse(jsonMatch[0]);

      return {
        title: aiResult.title || extractedContent.title,
        slug: this.generateSlug(aiResult.title || extractedContent.title),
        excerpt: aiResult.excerpt || extractedContent.excerpt,
        content: aiResult.content || extractedContent.content,
        seoTitle: aiResult.seoTitle || aiResult.title,
        seoDescription: aiResult.seoDescription || aiResult.excerpt,
        tags: Array.isArray(aiResult.tags) ? aiResult.tags : [],
        category: category,
        location: aiResult.location || 'Global',
        author: extractedContent.author,
        publishedDate: extractedContent.publishedDate,
        sourceUrl: (extractedContent.resolvedUrl || '').substring(0, 450), // Ensure within 500 char limit
        resolvedUrl: extractedContent.resolvedUrl,
        images: extractedContent.images,
        readingTime: aiResult.readingTime || Math.ceil(extractedContent.wordCount / 200),
        wordCount: extractedContent.wordCount
      };

    } catch (error) {
      this.strapi.log.error(`❌ AI processing failed: ${error.message}`);
      return this.fallbackProcessing(extractedContent, category);
    }
  }

  /**
   * PHASE 4: STRAPI INTEGRATION
   * Save articles as DRAFTS in Strapi using the API
   */
  async saveArticleAsDraft(article: AIProcessedArticle): Promise<any> {
    try {
      this.strapi.log.debug(`💾 Saving article as draft: ${article.title}`);

      const articleData = {
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        seoTitle: article.seoTitle,
        seoDescription: article.seoDescription,
        location: article.location,
        author: article.author,
        publishedAt: null, // Save as draft (unpublished)
        publishDate: article.publishedDate ? new Date(article.publishedDate) : new Date(),
        readingTime: article.readingTime,
        sourceUrl: article.sourceUrl,
        category: article.category,
        isBreaking: false,
        isFeatured: false,
        status: 'draft' // Explicitly set as draft
      };

      // Create the article in Strapi
      const createdArticle = await this.strapi.entityService.create('api::article.article', {
        data: articleData
      });

      this.strapi.log.info(`✅ Article saved as draft with ID: ${createdArticle.id}`);
      return createdArticle;

    } catch (error) {
      this.strapi.log.error(`❌ Failed to save article as draft: ${error.message}`);
      throw error;
    }
  }

  /**
   * PHASE 5: SYNC EXECUTION
   * Process articles sequentially with proper error handling and retry logic
   */
  async processCategorySync(category: string, maxArticles: number = 10): Promise<ProcessingResult[]> {
    this.strapi.log.info(`🚀 Starting synchronous processing for category: ${category}`);
    
    const results: ProcessingResult[] = [];
    const startTime = Date.now();

    try {
      // Phase 1: Fetch RSS
      const rssFeeds = await this.fetchRSSFeeds([category]);
      const rssItems = rssFeeds.get(category) || [];
      
      if (rssItems.length === 0) {
        this.strapi.log.warn(`⚠️ No RSS items found for category: ${category}`);
        return results;
      }

      // Limit the number of articles to process
      const itemsToProcess = rssItems.slice(0, maxArticles);
      this.strapi.log.info(`📋 Processing ${itemsToProcess.length} articles for ${category}`);

      // Process each article sequentially
      for (let i = 0; i < itemsToProcess.length; i++) {
        const rssItem = itemsToProcess[i];
        const itemStartTime = Date.now();
        
        this.strapi.log.info(`📰 Processing article ${i + 1}/${itemsToProcess.length}: ${rssItem.title}`);

        try {
          // Phase 2: Extract content
          const extractedContent = await this.extractContent(rssItem);
          if (!extractedContent) {
            throw new Error('Content extraction failed');
          }

          // Phase 3: AI processing
          const aiProcessedArticle = await this.processWithAI(extractedContent, category);
          if (!aiProcessedArticle) {
            throw new Error('AI processing failed');
          }

          // Phase 4: Save to Strapi
          const savedArticle = await this.saveArticleAsDraft(aiProcessedArticle);

          const processingTime = Date.now() - itemStartTime;
          results.push({
            success: true,
            articleId: savedArticle.id,
            originalTitle: rssItem.title,
            processingTime
          });

          this.strapi.log.info(`✅ Successfully processed article ${i + 1}: ID ${savedArticle.id}`);

        } catch (error) {
          const processingTime = Date.now() - itemStartTime;
          results.push({
            success: false,
            error: error.message,
            originalTitle: rssItem.title,
            processingTime
          });

          this.strapi.log.error(`❌ Failed to process article ${i + 1}: ${error.message}`);
        }

        // Add delay between articles to be respectful to servers
        if (i < itemsToProcess.length - 1) {
          await this.delay(3000); // 3 second delay between articles
        }
      }

      const totalTime = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      
      this.strapi.log.info(`🎉 Category ${category} processing complete: ${successCount}/${itemsToProcess.length} successful (${totalTime}ms)`);

    } catch (error) {
      this.strapi.log.error(`💥 Category processing failed for ${category}: ${error.message}`);
    }

    return results;
  }

  /**
   * Process all categories synchronously
   */
  async processAllCategoriesSync(maxArticlesPerCategory: number = 5): Promise<Map<string, ProcessingResult[]>> {
    this.strapi.log.info(`🌟 Starting complete synchronous pipeline for all categories`);
    
    const allResults = new Map<string, ProcessingResult[]>();
    const categories = Object.keys(this.feedUrls);

    for (const category of categories) {
      this.strapi.log.info(`\n🔄 Processing category: ${category.toUpperCase()}`);
      
      try {
        const categoryResults = await this.processCategorySync(category, maxArticlesPerCategory);
        allResults.set(category, categoryResults);
        
        // Add delay between categories
        await this.delay(2000);
        
      } catch (error) {
        this.strapi.log.error(`❌ Failed to process category ${category}: ${error.message}`);
        allResults.set(category, []);
      }
    }

    // Log final summary
    this.logFinalSummary(allResults);
    
    return allResults;
  }

  // HELPER METHODS

  private async resolveUrlRedirects(url: string): Promise<string> {
    try {
      // Handle Google News URLs specifically
      if (url.includes('news.google.com')) {
        const response = await axios.get(url, {
          maxRedirects: 10,
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        return response.request.res.responseUrl || url;
      }

      // For other URLs, follow redirects
      const response = await axios.head(url, {
        maxRedirects: 10,
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      return response.request.res.responseUrl || url;
    } catch (error) {
      this.strapi.log.warn(`⚠️ URL resolution failed for ${url}: ${error.message}`);
      return url;
    }
  }

  private extractTitle($: cheerio.CheerioAPI, fallbackTitle: string): string {
    const selectors = [
      'h1.entry-title',
      'h1.post-title',
      'h1.article-title',
      'h1[class*="title"]',
      '.article-header h1',
      '.post-header h1',
      'h1',
      'title'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        return element.text().trim();
      }
    }

    return fallbackTitle || 'Untitled Article';
  }

  private extractMainContent($: cheerio.CheerioAPI): string {
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share').remove();

    const contentSelectors = [
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      '[class*="article-body"]',
      '[class*="post-body"]',
      '[class*="story-body"]',
      'main article',
      '.main-content',
      '#content'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length) {
        const text = element.text().trim();
        if (text.length > 200) {
          return this.cleanContent(text);
        }
      }
    }

    // Fallback: extract from paragraphs
    const paragraphs = $('p').map((_, el) => $(el).text().trim()).get();
    const content = paragraphs.filter(p => p.length > 50).join('\n\n');
    
    return this.cleanContent(content);
  }

  private extractExcerpt($: cheerio.CheerioAPI, content: string): string {
    // Try meta description first
    const metaDesc = $('meta[name="description"]').attr('content') || 
                    $('meta[property="og:description"]').attr('content');
    
    if (metaDesc && metaDesc.length > 50) {
      return metaDesc.substring(0, 160);
    }

    // Fallback to first paragraph of content
    const firstParagraph = content.split('\n')[0];
    return firstParagraph.substring(0, 160) + (firstParagraph.length > 160 ? '...' : '');
  }

  private extractAuthor($: cheerio.CheerioAPI): string | undefined {
    const authorSelectors = [
      '[rel="author"]',
      '.author-name',
      '.byline',
      '[class*="author"]',
      '[itemprop="author"]'
    ];

    for (const selector of authorSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        return element.text().trim();
      }
    }

    return undefined;
  }

  private extractPublishedDate($: cheerio.CheerioAPI, fallbackDate?: string): string | undefined {
    const dateSelectors = [
      '[datetime]',
      '[itemprop="datePublished"]',
      '.published-date',
      '.post-date',
      '[class*="date"]'
    ];

    for (const selector of dateSelectors) {
      const element = $(selector).first();
      if (element.length) {
        const dateValue = element.attr('datetime') || element.attr('content') || element.text().trim();
        if (dateValue) {
          return dateValue;
        }
      }
    }

    return fallbackDate;
  }

  private extractImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const images: string[] = [];
    
    $('img').each((_, element) => {
      const src = $(element).attr('src') || $(element).attr('data-src');
      if (src) {
        try {
          const absoluteUrl = new URL(src, baseUrl).href;
          if (absoluteUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) && !images.includes(absoluteUrl)) {
            images.push(absoluteUrl);
          }
        } catch (error) {
          // Invalid URL, skip
        }
      }
    });

    return images.slice(0, 5); // Limit to 5 images
  }

  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 50);
  }

  private fallbackProcessing(extractedContent: ExtractedContent, category: string): AIProcessedArticle {
    return {
      title: extractedContent.title,
      slug: this.generateSlug(extractedContent.title),
      excerpt: extractedContent.excerpt,
      content: extractedContent.content,
      seoTitle: extractedContent.title.substring(0, 60),
      seoDescription: extractedContent.excerpt.substring(0, 160),
      tags: [category, 'news'],
      category: category,
      location: 'Global',
      author: extractedContent.author,
      publishedDate: extractedContent.publishedDate,
      sourceUrl: (extractedContent.resolvedUrl || '').substring(0, 450), // Ensure within 500 char limit
      resolvedUrl: extractedContent.resolvedUrl,
      images: extractedContent.images,
      readingTime: Math.ceil(extractedContent.wordCount / 200),
      wordCount: extractedContent.wordCount
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private logFinalSummary(results: Map<string, ProcessingResult[]>): void {
    this.strapi.log.info('\n🎯 FINAL PROCESSING SUMMARY');
    this.strapi.log.info('='.repeat(50));
    
    let totalProcessed = 0;
    let totalSuccessful = 0;
    
    for (const [category, categoryResults] of results) {
      const successful = categoryResults.filter(r => r.success).length;
      const total = categoryResults.length;
      
      totalProcessed += total;
      totalSuccessful += successful;
      
      this.strapi.log.info(`📊 ${category.toUpperCase()}: ${successful}/${total} successful`);
    }
    
    this.strapi.log.info(`\n🏆 OVERALL: ${totalSuccessful}/${totalProcessed} articles processed successfully`);
    this.strapi.log.info(`📈 Success Rate: ${totalProcessed > 0 ? Math.round((totalSuccessful / totalProcessed) * 100) : 0}%`);
  }
}
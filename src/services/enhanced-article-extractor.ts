import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';
import axios from 'axios';
import puppeteer from 'puppeteer';
import { ImageOptimizer } from './image-optimizer';
import { ContentFallbackService } from './content-fallback';

interface ExtractedContent {
  title: string;
  content: string;
  excerpt: string;
  images: string[];
  publishDate?: string;
  author?: string;
  readTime: number;
  wordCount: number;
  success: boolean;
  extractionMethod: string;
}

interface ExtractionStrategy {
  name: string;
  extract: (html: string, url: string) => Promise<ExtractedContent | null>;
}

export class EnhancedArticleExtractor {
  private strategies: ExtractionStrategy[];
  private browser: import('puppeteer').Browser | null = null;
  private readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  private imageOptimizer: ImageOptimizer;
  private fallbackService: ContentFallbackService;
  private strapi: any;

  constructor(strapiInstance?: any) {
    // Set strapi instance - use provided instance or global strapi
    this.strapi = strapiInstance || (global as any).strapi;
    this.imageOptimizer = new ImageOptimizer(this.strapi);
    this.fallbackService = new ContentFallbackService(this.strapi);
    this.strategies = [
      {
        name: 'Mozilla Readability',
        extract: this.extractWithReadability.bind(this)
      },
      {
        name: 'Cheerio Smart Selectors',
        extract: this.extractWithCheerio.bind(this)
      },
      {
        name: 'Custom Pattern Matching',
        extract: this.extractWithPatterns.bind(this)
      }
    ];
  }

  /**
   * Extract article content using multiple strategies with RSS item data for fallback
   */
  async extractArticleContentWithRSS(url: string, rssItem?: any): Promise<ExtractedContent> {
    try {
      // First, resolve any redirects and get the final URL
      const finalUrl = await this.resolveRedirects(url);
      
      // Try Puppeteer first for JS-rendered content
      try {
        const puppeteerResult = await this.extractWithPuppeteer(finalUrl);
        if (puppeteerResult.success && puppeteerResult.content.length > 200) {
          this.strapi.log.info(`Successfully extracted content using Puppeteer: ${puppeteerResult.wordCount} words`);
          return puppeteerResult;
        } else {
          this.strapi.log.info('Puppeteer extracted insufficient content, falling back to other methods');
        }
      } catch (puppeteerError) {
        this.strapi.log.warn(`Puppeteer extraction failed: ${puppeteerError.message}`);
      }
      
      // Fetch the HTML content
      const html = await this.fetchHtml(finalUrl);
      
      if (!html) {
        return this.createFailureResult('Failed to fetch HTML content');
      }

      // Try each extraction strategy until one succeeds
      for (const strategy of this.strategies) {
        try {
          this.strapi.log.info(`Trying extraction strategy: ${strategy.name} for URL: ${finalUrl}`);
          const result = await strategy.extract(html, finalUrl);
          
          if (result && result.success && result.content.length > 200) {
            this.strapi.log.info(`Successfully extracted content using ${strategy.name}: ${result.wordCount} words`);
            return result;
          }
        } catch (error) {
          this.strapi.log.warn(`Strategy ${strategy.name} failed: ${error.message}`);
          continue;
        }
      }

      // If all strategies fail, try Puppeteer as last resort
      try {
        const puppeteerResult = await this.extractWithPuppeteer(finalUrl);
        if (puppeteerResult.success && puppeteerResult.content.length > 200) {
          return puppeteerResult;
        }
      } catch (puppeteerError) {
        this.strapi.log.warn(`Puppeteer extraction failed: ${puppeteerError.message}`);
      }

      // If all extraction methods fail, use fallback service with RSS data
      this.strapi.log.info(`All extraction strategies failed, attempting fallback recovery for: ${finalUrl}`);
      const fallbackResult = await this.fallbackService.recoverContent(finalUrl, rssItem);
      
      return {
        title: fallbackResult.title,
        content: fallbackResult.content,
        excerpt: fallbackResult.excerpt,
        images: fallbackResult.images,
        publishDate: undefined,
        author: undefined,
        readTime: Math.ceil(this.countWords(fallbackResult.content) / 200),
        wordCount: this.countWords(fallbackResult.content),
        success: fallbackResult.success,
        extractionMethod: `Fallback: ${fallbackResult.fallbackMethod}`
      };

    } catch (error) {
      this.strapi.log.error(`Article extraction failed for ${url}: ${error.message}`);
      
      // Final fallback attempt with RSS data
      try {
        const finalFallback = await this.fallbackService.recoverContent(url, rssItem);
        return {
          title: finalFallback.title,
          content: finalFallback.content,
          excerpt: finalFallback.excerpt,
          images: finalFallback.images,
          publishDate: undefined,
          author: undefined,
          readTime: Math.ceil(this.countWords(finalFallback.content) / 200),
          wordCount: this.countWords(finalFallback.content),
          success: finalFallback.success,
          extractionMethod: `Emergency Fallback: ${finalFallback.fallbackMethod}`
        };
      } catch (fallbackError) {
        this.strapi.log.error(`Final fallback failed: ${fallbackError.message}`);
        return this.createFailureResult(error.message);
      }
    }
  }

  /**
   * Extract article content using multiple strategies (legacy method)
   */
  async extractArticleContent(url: string): Promise<ExtractedContent> {
    try {
      // First, resolve any redirects and get the final URL
      const finalUrl = await this.resolveRedirects(url);
      
      // Fetch the HTML content
      const html = await this.fetchHtml(finalUrl);
      
      if (!html) {
        return this.createFailureResult('Failed to fetch HTML content');
      }

      // Try each extraction strategy until one succeeds
      for (const strategy of this.strategies) {
        try {
          this.strapi.log.info(`Trying extraction strategy: ${strategy.name} for URL: ${finalUrl}`);
          const result = await strategy.extract(html, finalUrl);
          
          if (result && result.success && result.content.length > 200) {
            this.strapi.log.info(`Successfully extracted content using ${strategy.name}: ${result.wordCount} words`);
            return result;
          }
        } catch (error) {
          this.strapi.log.warn(`Strategy ${strategy.name} failed: ${error.message}`);
          continue;
        }
      }

      // If all strategies fail, try Puppeteer as last resort
      try {
        const puppeteerResult = await this.extractWithPuppeteer(finalUrl);
        if (puppeteerResult.success && puppeteerResult.content.length > 200) {
          return puppeteerResult;
        }
      } catch (puppeteerError) {
        this.strapi.log.warn(`Puppeteer extraction failed: ${puppeteerError.message}`);
      }

      // If all extraction methods fail, use fallback service
      this.strapi.log.info(`All extraction strategies failed, attempting fallback recovery for: ${finalUrl}`);
      const fallbackResult = await this.fallbackService.recoverContent(finalUrl);
      
      return {
        title: fallbackResult.title,
        content: fallbackResult.content,
        excerpt: fallbackResult.excerpt,
        images: fallbackResult.images,
        publishDate: undefined,
        author: undefined,
        readTime: Math.ceil(this.countWords(fallbackResult.content) / 200),
        wordCount: this.countWords(fallbackResult.content),
        success: fallbackResult.success,
        extractionMethod: `Fallback: ${fallbackResult.fallbackMethod}`
      };

    } catch (error) {
      this.strapi.log.error(`Article extraction failed for ${url}: ${error.message}`);
      
      // Final fallback attempt
      try {
        const finalFallback = await this.fallbackService.recoverContent(url);
        return {
          title: finalFallback.title,
          content: finalFallback.content,
          excerpt: finalFallback.excerpt,
          images: finalFallback.images,
          publishDate: undefined,
          author: undefined,
          readTime: Math.ceil(this.countWords(finalFallback.content) / 200),
          wordCount: this.countWords(finalFallback.content),
          success: finalFallback.success,
          extractionMethod: `Emergency Fallback: ${finalFallback.fallbackMethod}`
        };
      } catch (fallbackError) {
        this.strapi.log.error(`Final fallback failed: ${fallbackError.message}`);
        return this.createFailureResult(error.message);
      }
    }
  }

  /**
   * Extract content using Mozilla Readability
   */
  private async extractWithReadability(html: string, url: string): Promise<ExtractedContent | null> {
    try {
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article || !article.content) {
        return null;
      }

      const images = await this.extractOptimizedImages(article.content);
      const wordCount = this.countWords(article.textContent || '');

      return {
        title: article.title || '',
        content: article.content,
        excerpt: article.excerpt || this.generateExcerpt(article.textContent || ''),
        images,
        publishDate: this.extractPublishDate(html),
        author: this.extractAuthor(html),
        readTime: Math.ceil(wordCount / 200),
        wordCount,
        success: true,
        extractionMethod: 'Mozilla Readability'
      };
    } catch (error) {
      this.strapi.log.warn(`Readability extraction failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract content using Cheerio with smart selectors
   */
  private async extractWithCheerio(html: string, url: string): Promise<ExtractedContent | null> {
    try {
      const $ = cheerio.load(html);

      // Remove unwanted elements
      $('script, style, nav, header, footer, aside, .advertisement, .ad, .social-share, .comments').remove();

      // Try different content selectors in order of preference
      const contentSelectors = [
        'article',
        '[role="main"]',
        '.article-content',
        '.post-content',
        '.entry-content',
        '.story-body',
        '.article-body',
        'main',
        '#content',
        '.main-content',
        '.content'
      ];

      let content = '';
      let title = '';

      // Extract title
      title = $('h1').first().text().trim() || 
              $('title').text().trim() || 
              $('[property="og:title"]').attr('content') || '';

      // Extract content
      for (const selector of contentSelectors) {
        const element = $(selector).first();
        if (element.length && element.text().trim().length > 200) {
          content = element.html() || '';
          break;
        }
      }

      if (!content) {
        // Fallback: extract from body, removing navigation elements
        content = $('body').html() || '';
      }

      if (!content || content.length < 200) {
        return null;
      }

      const textContent = $(content).text();
      const images = await this.extractOptimizedImages(content);
      const wordCount = this.countWords(textContent);

      return {
        title,
        content: this.cleanContent(content),
        excerpt: this.generateExcerpt(textContent),
        images,
        publishDate: this.extractPublishDate(html),
        author: this.extractAuthor(html),
        readTime: Math.ceil(wordCount / 200),
        wordCount,
        success: true,
        extractionMethod: 'Cheerio Smart Selectors'
      };
    } catch (error) {
      this.strapi.log.warn(`Cheerio extraction failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract content using custom pattern matching
   */
  private async extractWithPatterns(html: string, url: string): Promise<ExtractedContent | null> {
    try {
      // Extract title using multiple patterns
      const titlePatterns = [
        /<h1[^>]*>(.*?)<\/h1>/i,
        /<title[^>]*>(.*?)<\/title>/i,
        /<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i
      ];

      let title = '';
      for (const pattern of titlePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          title = match[1].replace(/<[^>]*>/g, '').trim();
          break;
        }
      }

      // Extract content using patterns
      const contentPatterns = [
        /<article[^>]*>(.*?)<\/article>/gis,
        /<div[^>]*class[^>]*article[^>]*>(.*?)<\/div>/gis,
        /<div[^>]*class[^>]*content[^>]*>(.*?)<\/div>/gis,
        /<main[^>]*>(.*?)<\/main>/gis
      ];

      let content = '';
      for (const pattern of contentPatterns) {
        const matches = html.match(pattern);
        if (matches && matches.length > 0) {
          content = matches.reduce((longest, current) => 
            current.length > longest.length ? current : longest, '');
          break;
        }
      }

      if (!content || content.length < 200) {
        return null;
      }

      const textContent = content.replace(/<[^>]*>/g, '');
      const images = await this.extractOptimizedImages(content);
      const wordCount = this.countWords(textContent);

      return {
        title,
        content: this.cleanContent(content),
        excerpt: this.generateExcerpt(textContent),
        images,
        publishDate: this.extractPublishDate(html),
        author: this.extractAuthor(html),
        readTime: Math.ceil(wordCount / 200),
        wordCount,
        success: true,
        extractionMethod: 'Custom Pattern Matching'
      };
    } catch (error) {
      this.strapi.log.warn(`Pattern extraction failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract content using Puppeteer (last resort)
   */
  private async extractWithPuppeteer(url: string): Promise<ExtractedContent> {
    try {
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }

      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = await page.evaluate(() => {
        // Remove unwanted elements
        const unwanted = document.querySelectorAll('script, style, nav, header, footer, aside, .advertisement, .ad');
        unwanted.forEach(el => el.remove());

        // Extract title
        const title = document.querySelector('h1')?.textContent?.trim() || 
                     document.title || '';

        // Extract content
        const contentSelectors = ['article', '[role="main"]', '.article-content', 'main'];
        let content = '';

        for (const selector of contentSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent && element.textContent.length > 200) {
            content = element.innerHTML;
            break;
          }
        }

        // Get page HTML for image optimization
        const pageHtml = document.documentElement.outerHTML;

        return { title, content, pageHtml };
      });

      await page.close();

      if (!result.content || result.content.length < 200) {
        return this.createFailureResult('Puppeteer could not extract sufficient content');
      }

      const textContent = result.content.replace(/<[^>]*>/g, '');
      const wordCount = this.countWords(textContent);
      
      // Use optimized image extraction
      const images = await this.extractOptimizedImages(result.pageHtml);

      return {
        title: result.title,
        content: this.cleanContent(result.content),
        excerpt: this.generateExcerpt(textContent),
        images,
        readTime: Math.ceil(wordCount / 200),
        wordCount,
        success: true,
        extractionMethod: 'Puppeteer'
      };
    } catch (error) {
      this.strapi.log.error(`Puppeteer extraction failed: ${error.message}`);
      return this.createFailureResult(`Puppeteer extraction failed: ${error.message}`);
    }
  }

  /**
   * Resolve redirects to get the final URL
   */
  private async resolveRedirects(url: string): Promise<string> {
    try {
      // Handle Google News URLs
      if (url.includes('news.google.com')) {
        return await this.resolveGoogleNewsUrl(url);
      }

      const response = await axios.head(url, {
        maxRedirects: 5,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      return response.request.res.responseUrl || url;
    } catch (error) {
      this.strapi.log.warn(`Failed to resolve redirects for ${url}: ${error.message}`);
      return url;
    }
  }

  /**
   * Resolve Google News URLs to actual article URLs
   */
  private async resolveGoogleNewsUrl(url: string): Promise<string> {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const dataP = $('c-wiz[data-p]').attr('data-p');
      if (!dataP) {
        throw new Error('No data-p attribute found');
      }
      const obj = JSON.parse(dataP.replace('%.@.', '["garturlreq",'));
      const payload = {
        'f.req': JSON.stringify([[['Fbv4je', JSON.stringify([...obj.slice(0, -6), ...obj.slice(-2)]), null, 'generic']]])
      };
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
      };
      const postResponse = await axios.post('https://news.google.com/_/DotsSplashUi/data/batchexecute', payload, { headers });
      const arrayString = JSON.parse(postResponse.data.replace(")]}'", ""))[0][2];
      const articleUrl = JSON.parse(arrayString)[1];
      return articleUrl;
    } catch (error) {
      this.strapi.log.error(`Failed to resolve Google News URL: ${error.message}`);
      return url; // Fallback to original URL
    }
  }

  /**
   * Decode Google News URLs
   */
  private decodeGoogleNewsUrl(url: string): string | null {
    try {
      // Extract the encoded part from Google News URLs
      const patterns = [
        /\/articles\/(.*?)\?/,
        /\/read\/(.*?)\?/,
        /CBM([^&]*)/,
        /0ahUKEwi([^&]*)/
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          try {
            // Try Base64 decoding
            const decoded = Buffer.from(match[1], 'base64').toString('utf-8');
            const urlMatch = decoded.match(/https?:\/\/[^\s"'<>]+/);
            if (urlMatch) {
              return urlMatch[0];
            }
          } catch (e) {
            // Try URL decoding
            const decoded = decodeURIComponent(match[1]);
            const urlMatch = decoded.match(/https?:\/\/[^\s"'<>]+/);
            if (urlMatch) {
              return urlMatch[0];
            }
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetch HTML content with proper headers
   */
  private async fetchHtml(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        }
      });

      return response.data;
    } catch (error) {
      this.strapi.log.error(`Failed to fetch HTML from ${url}: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract images from HTML content
   */
  private extractImages(html: string): string[] {
    const images: string[] = [];
    const imgRegex = /<img[^>]+src\s*=\s*["\']([^"\']+)["\'][^>]*>/gi;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      const imageUrl = match[1];
      
      if (this.isValidImage(imageUrl)) {
        images.push(imageUrl);
      }
    }

    return [...new Set(images)]; // Remove duplicates
  }

  /**
   * Extract and optimize images using ImageOptimizer
   */
  private async extractOptimizedImages(html: string): Promise<string[]> {
    try {
      // Extract all image URLs
      const rawImages = this.extractImages(html);
      
      if (rawImages.length === 0) {
        return [];
      }

      // Optimize images using ImageOptimizer
      const optimizedImages = await this.imageOptimizer.optimizeImages(rawImages, html);
      
      // Get images by use case
      const imagesByUseCase = this.imageOptimizer.getImagesByUseCase(optimizedImages);
      
      // Return prioritized list of image URLs
      const prioritizedImages: string[] = [];
      
      // Add hero image first
      if (imagesByUseCase.hero) {
        prioritizedImages.push(imagesByUseCase.hero.originalUrl);
      }
      
      // Add gallery images
      imagesByUseCase.gallery.forEach(img => {
        if (!prioritizedImages.includes(img.originalUrl)) {
          prioritizedImages.push(img.originalUrl);
        }
      });
      
      // Add thumbnail if not already included
      if (imagesByUseCase.thumbnail && !prioritizedImages.includes(imagesByUseCase.thumbnail.originalUrl)) {
        prioritizedImages.push(imagesByUseCase.thumbnail.originalUrl);
      }
      
      this.strapi.log.info(`Optimized ${rawImages.length} images, selected ${prioritizedImages.length} high-quality images`);
      
      return prioritizedImages;
      
    } catch (error) {
      this.strapi.log.warn(`Failed to optimize images: ${error.message}`);
      // Fallback to basic extraction
      return this.extractImages(html);
    }
  }

  /**
   * Check if image URL is valid and high quality
   */
  private isValidImage(url: string): boolean {
    if (!url || !url.startsWith('http')) return false;
    
    const lowQualityPatterns = [
      '1x1', 'pixel', 'icon', 'logo', 'avatar', 'profile', 
      'thumbnail', 'badge', 'button', 'spacer', 'blank'
    ];

    return !lowQualityPatterns.some(pattern => url.toLowerCase().includes(pattern));
  }

  /**
   * Extract publish date from HTML
   */
  private extractPublishDate(html: string): string | undefined {
    const patterns = [
      /<meta[^>]*property="article:published_time"[^>]*content="([^"]*)"[^>]*>/i,
      /<meta[^>]*name="pubdate"[^>]*content="([^"]*)"[^>]*>/i,
      /<time[^>]*datetime="([^"]*)"[^>]*>/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Extract author from HTML
   */
  private extractAuthor(html: string): string | undefined {
    const patterns = [
      /<meta[^>]*name="author"[^>]*content="([^"]*)"[^>]*>/i,
      /<meta[^>]*property="article:author"[^>]*content="([^"]*)"[^>]*>/i,
      /<span[^>]*class[^>]*author[^>]*>(.*?)<\/span>/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        return match[1].replace(/<[^>]*>/g, '').trim();
      }
    }

    return undefined;
  }

  /**
   * Clean HTML content by removing all unwanted HTML tags and preserving only text content
   */
  private cleanContent(content: string): string {
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
   * Generate excerpt from text
   */
  private generateExcerpt(text: string, length: number = 300): string {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    return cleaned.length > length ? cleaned.substring(0, length) + '...' : cleaned;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Create failure result
   */
  private createFailureResult(message: string): ExtractedContent {
    return {
      title: '',
      content: '',
      excerpt: '',
      images: [],
      readTime: 0,
      wordCount: 0,
      success: false,
      extractionMethod: `Failed: ${message}`
    };
  }

  /**
   * Close browser instance
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

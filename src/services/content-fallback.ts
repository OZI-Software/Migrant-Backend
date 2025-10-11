import axios from 'axios';
import * as cheerio from 'cheerio';

interface FallbackContent {
  title: string;
  content: string;
  excerpt: string;
  images: string[];
  success: boolean;
  fallbackMethod: string;
}

interface RSSItem {
  title?: string;
  contentSnippet?: string;
  content?: string;
  link?: string;
  pubDate?: string;
  creator?: string;
  'content:encoded'?: string;
  description?: string;
}

export class ContentFallbackService {
  private readonly minContentLength = 100;
  private readonly maxRetries = 3;
  private strapi: any;

  constructor(strapiInstance?: any) {
    // Set strapi instance - use provided instance or global strapi
    this.strapi = strapiInstance || (global as any).strapi;
  }

  /**
   * Attempt to recover content using various fallback strategies
   */
  async recoverContent(url: string, rssItem?: RSSItem): Promise<FallbackContent> {
    const fallbackStrategies = [
      () => this.useRSSContent(rssItem),
      () => this.useBasicScraping(url),
      () => this.useMetaTags(url),
      () => this.useTextExtraction(url),
      () => this.createMinimalContent(url, rssItem)
    ];

    for (const strategy of fallbackStrategies) {
      try {
        const result = await strategy();
        if (result.success && result.content.length >= this.minContentLength) {
          this.strapi.log.info(`Content recovered using: ${result.fallbackMethod}`);
          return result;
        }
      } catch (error) {
        this.strapi.log.warn(`Fallback strategy failed: ${error.message}`);
        continue;
      }
    }

    // Last resort: return minimal content
    return this.createMinimalContent(url, rssItem);
  }

  /**
   * Use RSS feed content as fallback
   */
  private async useRSSContent(rssItem?: RSSItem): Promise<FallbackContent> {
    if (!rssItem) {
      throw new Error('No RSS item provided');
    }

    // Try different RSS content fields
    const contentSources = [
      rssItem['content:encoded'],
      rssItem.content,
      rssItem.description,
      rssItem.contentSnippet
    ];

    let content = '';
    for (const source of contentSources) {
      if (source && source.length > content.length) {
        content = source;
      }
    }

    if (!content || content.length < this.minContentLength) {
      throw new Error('RSS content insufficient');
    }

    // Clean and format content
    const cleanContent = this.cleanHtmlContent(content);
    const images = this.extractBasicImages(content);

    return {
      title: rssItem.title || 'Untitled Article',
      content: cleanContent,
      excerpt: this.generateExcerpt(cleanContent),
      images,
      success: true,
      fallbackMethod: 'RSS Content'
    };
  }

  /**
   * Use basic web scraping as fallback
   */
  private async useBasicScraping(url: string): Promise<FallbackContent> {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads').remove();

    // Try to find main content
    const contentSelectors = [
      'main',
      '[role="main"]',
      '.main-content',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'article',
      '.article-body'
    ];

    let content = '';
    let title = '';

    // Extract title
    title = $('h1').first().text().trim() || 
            $('title').text().trim() || 
            $('[property="og:title"]').attr('content') || 
            'Untitled Article';

    // Extract content
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim().length > content.length) {
        content = element.html() || '';
      }
    }

    if (!content || content.length < this.minContentLength) {
      // Fallback to body content
      content = $('body').html() || '';
    }

    if (!content || content.length < this.minContentLength) {
      throw new Error('Basic scraping failed to extract sufficient content');
    }

    const cleanContent = this.cleanHtmlContent(content);
    const images = this.extractBasicImages(content);

    return {
      title,
      content: cleanContent,
      excerpt: this.generateExcerpt(cleanContent),
      images,
      success: true,
      fallbackMethod: 'Basic Scraping'
    };
  }

  /**
   * Use meta tags as fallback
   */
  private async useMetaTags(url: string): Promise<FallbackContent> {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    const title = $('[property="og:title"]').attr('content') || 
                  $('[name="twitter:title"]').attr('content') || 
                  $('title').text().trim() || 
                  'Untitled Article';

    const description = $('[property="og:description"]').attr('content') || 
                       $('[name="twitter:description"]').attr('content') || 
                       $('[name="description"]').attr('content') || '';

    const image = $('[property="og:image"]').attr('content') || 
                  $('[name="twitter:image"]').attr('content') || '';

    if (!description || description.length < this.minContentLength) {
      throw new Error('Meta tags insufficient for content');
    }

    const images = image ? [image] : [];

    return {
      title,
      content: `<p>${description}</p>`,
      excerpt: description.substring(0, 300),
      images,
      success: true,
      fallbackMethod: 'Meta Tags'
    };
  }

  /**
   * Use text extraction as fallback
   */
  private async useTextExtraction(url: string): Promise<FallbackContent> {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads, .menu, .sidebar').remove();

    const title = $('h1').first().text().trim() || 
                  $('title').text().trim() || 
                  'Untitled Article';

    // Extract all text content
    const textContent = $('body').text().trim();
    
    if (!textContent || textContent.length < this.minContentLength) {
      throw new Error('Text extraction failed');
    }

    // Convert text to basic HTML paragraphs
    const paragraphs = textContent
      .split(/\n\s*\n/)
      .filter(p => p.trim().length > 50)
      .map(p => `<p>${p.trim()}</p>`)
      .join('\n');

    const images = this.extractBasicImages(response.data);

    return {
      title,
      content: paragraphs,
      excerpt: this.generateExcerpt(textContent),
      images,
      success: true,
      fallbackMethod: 'Text Extraction'
    };
  }

  /**
   * Create minimal content as last resort
   */
  private async createMinimalContent(url: string, rssItem?: RSSItem): Promise<FallbackContent> {
    const title = rssItem?.title || 'Article from ' + new URL(url).hostname;
    const snippet = rssItem?.contentSnippet || rssItem?.description || '';
    
    const content = snippet ? 
      `<p>${snippet}</p><p><a href="${url}" target="_blank">Read full article</a></p>` :
      `<p>Content not available. <a href="${url}" target="_blank">Read full article</a></p>`;

    return {
      title,
      content,
      excerpt: snippet.substring(0, 300) || 'Content not available.',
      images: [],
      success: false, // Mark as unsuccessful since it's minimal content
      fallbackMethod: 'Minimal Content'
    };
  }

  /**
   * Clean HTML content
   */
  private cleanHtmlContent(html: string): string {
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, iframe, embed, object, form, input, button').remove();
    $('.advertisement, .ads, .social-share, .comments, .related-articles').remove();
    $('[class*="ad-"], [id*="ad-"], [class*="advertisement"]').remove();

    // Clean up attributes
    $('*').each((_, element) => {
      const $el = $(element);
      // Keep only essential attributes
      const allowedAttrs = ['href', 'src', 'alt', 'title'];
      const attrs = Object.keys((element as any).attribs || {});
      
      attrs.forEach(attr => {
        if (!allowedAttrs.includes(attr)) {
          $el.removeAttr(attr);
        }
      });
    });

    return $.html();
  }

  /**
   * Extract basic images from HTML
   */
  private extractBasicImages(html: string): string[] {
    const $ = cheerio.load(html);
    const images: string[] = [];

    $('img').each((_, element) => {
      const src = $(element).attr('src');
      if (src && this.isValidImageUrl(src)) {
        images.push(src);
      }
    });

    // Also check for og:image
    const ogImage = $('[property="og:image"]').attr('content');
    if (ogImage && this.isValidImageUrl(ogImage) && !images.includes(ogImage)) {
      images.unshift(ogImage); // Add to beginning
    }

    return [...new Set(images)].slice(0, 5); // Remove duplicates and limit
  }

  /**
   * Validate image URL
   */
  private isValidImageUrl(url: string): boolean {
    if (!url || !url.startsWith('http')) return false;
    
    // Check for common image extensions or image-related patterns
    const imagePatterns = [
      /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i,
      /\/image\//i,
      /format=.*image/i
    ];

    return imagePatterns.some(pattern => pattern.test(url));
  }

  /**
   * Generate excerpt from text
   */
  private generateExcerpt(text: string, length: number = 300): string {
    // Remove HTML tags
    const plainText = text.replace(/<[^>]*>/g, '').trim();
    
    if (plainText.length <= length) {
      return plainText;
    }

    // Find the last complete sentence within the length limit
    const truncated = plainText.substring(0, length);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > length * 0.7) {
      return truncated.substring(0, lastSentence + 1);
    }

    // If no good sentence break, find last word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    return truncated.substring(0, lastSpace) + '...';
  }

  /**
   * Retry mechanism for failed operations
   */
  async withRetry<T>(operation: () => Promise<T>, retries: number = this.maxRetries): Promise<T> {
    let lastError: Error;

    for (let i = 0; i <= retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (i < retries) {
          const delay = Math.pow(2, i) * 1000; // Exponential backoff
          this.strapi.log.warn(`Operation failed, retrying in ${delay}ms: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Check if content meets quality standards
   */
  isQualityContent(content: FallbackContent): boolean {
    return content.success && 
           content.content.length >= this.minContentLength &&
           content.title.length > 0 &&
           content.fallbackMethod !== 'Minimal Content';
  }
}

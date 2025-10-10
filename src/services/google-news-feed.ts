import Parser = require('rss-parser');
import axios from 'axios';

interface GoogleNewsItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  guid: string;
  source?: string;
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
}

class GoogleNewsFeedService {
  private parser: Parser;
  private readonly baseUrl = 'https://news.google.com/rss';

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['source']
      }
    });
  }

  /**
   * Get Google News RSS feed URLs for different topics
   */
  private getFeedUrls() {
    return {
      topStories: `${this.baseUrl}?hl=en-US&gl=US&ceid=US:en`,
      world: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZxYUdjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
      business: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
      technology: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
      entertainment: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNREpxYW5RU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
      sports: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1ZEdvU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
      science: `${this.baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1RjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
      health: `${this.baseUrl}/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNR3QwTlRFU0FtVnVLQUFQAQ?hl=en-US&gl=US&ceid=US:en`
    };
  }

  /**
   * Fetch and parse RSS feed from Google News
   */
  async fetchFeed(category: string = 'topStories'): Promise<GoogleNewsItem[]> {
    try {
      const feedUrls = this.getFeedUrls();
      const feedUrl = feedUrls[category] || feedUrls.topStories;

      strapi.log.info(`Fetching Google News feed for category: ${category}`);
      
      const feed = await this.parser.parseURL(feedUrl);
      
      return feed.items.map(item => ({
        title: item.title || '',
        link: item.link || '',
        pubDate: item.pubDate || '',
        content: item.content || item.contentSnippet || '',
        contentSnippet: item.contentSnippet || '',
        guid: item.guid || item.link || '',
        source: item.source || 'Google News'
      }));
    } catch (error) {
      strapi.log.error('Error fetching Google News feed:', error);
      throw new Error(`Failed to fetch Google News feed: ${error.message}`);
    }
  }

  /**
   * Generate slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 100);
  }

  /**
   * Calculate estimated read time based on content length
   */
  private calculateReadTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / wordsPerMinute);
    return Math.max(1, Math.min(readTime, 60));
  }

  /**
   * Extract location from content or use default
   */
  private extractLocation(content: string): string {
    // Simple location extraction - you can enhance this with more sophisticated logic
    const locationPatterns = [
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2}|[A-Z][a-z]+)\b/,
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*-\s*/
    ];

    for (const pattern of locationPatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return 'Global';
  }

  /**
   * Check if article is breaking news based on title and content
   */
  private isBreakingNews(title: string, content: string): boolean {
    const breakingKeywords = [
      'breaking', 'urgent', 'alert', 'developing', 'just in',
      'live updates', 'emergency', 'crisis', 'major'
    ];

    const text = `${title} ${content}`.toLowerCase();
    return breakingKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Transform Google News item to Strapi article format
   */
  private transformToArticle(item: GoogleNewsItem): ParsedNewsItem {
    const title = item.title.substring(0, 200);
    const content = item.content || item.contentSnippet || '';
    const excerpt = content.substring(0, 300);

    return {
      title,
      slug: this.generateSlug(title),
      excerpt,
      content,
      publishedDate: new Date(item.pubDate).toISOString(),
      sourceUrl: item.link,
      location: this.extractLocation(content),
      readTime: this.calculateReadTime(content),
      seoTitle: title.substring(0, 60),
      seoDescription: excerpt.substring(0, 160),
      isBreaking: this.isBreakingNews(title, content)
    };
  }

  /**
   * Check if article already exists in Strapi
   */
  async articleExists(sourceUrl: string): Promise<boolean> {
    try {
      const existingArticles = await strapi.entityService.findMany('api::article.article', {
        filters: {
          sourceUrl: {
            $eq: sourceUrl
          }
        } as any,
        limit: 1
      });

      return existingArticles && existingArticles.length > 0;
    } catch (error) {
      strapi.log.error('Error checking if article exists:', error);
      return false;
    }
  }

  /**
   * Get or create default author and category
   */
  async getDefaultAuthorAndCategory() {
    try {
      // Get or create default author
      let authors = await strapi.entityService.findMany('api::author.author', {
        filters: { name: 'Immgrant' },
        limit: 1
      }) as any[];

      let author: any;
      if (!authors || authors.length === 0) {
        author = await strapi.entityService.create('api::author.author', {
          data: {
            name: 'Google News Bot',
            slug: 'google-news-bot',
            email: 'news@googlenews.com'
          }
        });
      } else {
        author = authors[0];
      }

      // Get or create default category
      let categories = await strapi.entityService.findMany('api::category.category', {
        filters: { name: 'News' },
        limit: 1
      }) as any[];

      let category: any;
      if (!categories || categories.length === 0) {
        category = await strapi.entityService.create('api::category.category', {
          data: {
            name: 'News',
            slug: 'news',
            description: 'General news articles'
          }
        });
      } else {
        category = categories[0];
      }

      return { author, category };
    } catch (error) {
      strapi.log.error('Error getting default author and category:', error);
      throw error;
    }
  }

  /**
   * Create article in Strapi
   */
  async createArticle(articleData: ParsedNewsItem): Promise<any> {
    try {
      const { author, category } = await this.getDefaultAuthorAndCategory();

      const article = await strapi.entityService.create('api::article.article', {
        data: {
          ...articleData,
          author: author.id,
          category: category.id,
          publishedAt: new Date(),
          // Add a placeholder image URL or leave empty for manual assignment
          featuredImage: null,
          imageAlt: articleData.title
        }
      });

      strapi.log.info(`Created article: ${articleData.title}`);
      return article;
    } catch (error) {
      strapi.log.error('Error creating article:', error);
      throw error;
    }
  }

  /**
   * Process and import news from Google News
   */
  async importNews(categories: string[] = ['topStories'], maxArticlesPerCategory: number = 10): Promise<{
    imported: number;
    skipped: number;
    errors: number;
  }> {
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    strapi.log.info(`Starting Google News import for categories: ${categories.join(', ')}`);

    for (const category of categories) {
      try {
        const newsItems = await this.fetchFeed(category);
        const limitedItems = newsItems.slice(0, maxArticlesPerCategory);

        for (const item of limitedItems) {
          try {
            // Check if article already exists
            const exists = await this.articleExists(item.link);
            if (exists) {
              skipped++;
              continue;
            }

            // Transform and create article
            const articleData = this.transformToArticle(item);
            
            // Add sourceUrl to track duplicates
            const articleWithSource = {
              ...articleData,
              sourceUrl: item.link
            };

            await this.createArticle(articleWithSource);
            imported++;

            // Add small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (error) {
            strapi.log.error(`Error processing article: ${item.title}`, error);
            errors++;
          }
        }
      } catch (error) {
        strapi.log.error(`Error processing category ${category}:`, error);
        errors++;
      }
    }

    const result = { imported, skipped, errors };
    strapi.log.info('Google News import completed:', result);
    return result;
  }
}

export default GoogleNewsFeedService;
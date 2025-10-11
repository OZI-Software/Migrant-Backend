/**
 * AI-Powered Content Extraction Service
 * Uses Gemini AI to intelligently extract structured content from raw HTML
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

interface ExtractedContent {
  title: string;
  excerpt: string;
  content: string; // Rich HTML content
  seoTitle?: string; // SEO-optimized title
  seoDescription?: string; // SEO-optimized description
  location?: string;
  tags: string[];
  images: {
    url: string;
    alt?: string;
    caption?: string;
  }[];
  metadata: {
    author?: string;
    publishedDate?: string;
    readingTime?: number;
    language?: string;
    category?: string;
  };
}

interface ExtractionResult {
  success: boolean;
  data?: ExtractedContent;
  error?: string;
  processingTime: number;
}

export default class AIContentExtractor {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private strapi: any;

  constructor(strapiInstance?: any) {
    // Set strapi instance - use provided instance or global strapi
    this.strapi = strapiInstance || (global as any).strapi;
    if (!process.env.OPEN_AI_API_TOKEN) {
      throw new Error('Google Gemini API key is required for AI content extraction');
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.OPEN_AI_API_TOKEN);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * Extract structured content from raw HTML using AI
   */
  async extractContent(rawHtml: string, sourceUrl?: string): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!rawHtml || rawHtml.trim().length === 0) {
        return {
          success: false,
          error: 'Raw HTML content is required',
          processingTime: Date.now() - startTime
        };
      }

      // Prepare the AI prompt
      const prompt = this.buildExtractionPrompt(rawHtml, sourceUrl);

      // Send to Gemini AI
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const aiResponse = response.text().trim();

      // Parse AI response
      const extractedData = this.parseAIResponse(aiResponse, sourceUrl);

      return {
        success: true,
        data: extractedData,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      this.strapi.log.error('AI content extraction failed:', error.message);
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Build the extraction prompt for Gemini AI
   */
  private buildExtractionPrompt(rawHtml: string, sourceUrl?: string): string {
    return `You are an expert content extraction and SEO optimization AI. Your task is to ALWAYS generate meaningful, rich content regardless of the quality of the input HTML. You MUST NEVER fail to produce a complete, valid JSON response.

CRITICAL INSTRUCTIONS - MANDATORY COMPLIANCE:
1. ALWAYS extract or generate meaningful content - if the HTML is insufficient, use the source URL context to infer content
2. NEVER return generic titles like "Extracted Article" - always create specific, descriptive titles
3. ALWAYS generate substantial content (minimum 200 characters) - if extraction fails, create content based on URL context and available text
4. ALWAYS provide 5-10 relevant tags - if unclear from content, infer from URL, domain, or context
5. ALWAYS provide a location if any geographic context is available (from URL, domain, or content)
6. ALWAYS generate compelling SEO-optimized titles and descriptions
7. ALWAYS preserve or create proper HTML structure with semantic tags
8. ALWAYS return valid JSON - this is non-negotiable

FALLBACK STRATEGY (when HTML content is insufficient):
- Analyze the source URL for context clues (domain, path, keywords)
- Use any available text fragments to infer topic and content
- Generate relevant content based on URL structure and domain context
- Create appropriate tags based on inferred topic
- Provide meaningful titles and descriptions even with limited information

CONTENT GENERATION REQUIREMENTS:
- Title: Must be specific and descriptive (never generic), under 60 characters when possible
- Excerpt: Compelling summary, 150-200 characters, must encourage reading
- Content: Rich HTML content with proper structure, minimum 200 characters
- SEO Title: Optimized for search engines, max 60 characters
- SEO Description: Engaging meta description, max 160 characters
- Tags: 5-10 specific, relevant tags for discoverability
- Location: Geographic context if available from any source

QUALITY ASSURANCE:
- Content must be substantial and meaningful
- All required fields must be populated with real values
- JSON must be valid and complete
- Never use placeholder or generic content

${sourceUrl ? `Source URL: ${sourceUrl}` : ''}

HTML Content:
${rawHtml.substring(0, 15000)} ${rawHtml.length > 15000 ? '...[truncated]' : ''}

REMEMBER: You MUST generate a complete, meaningful response even if the HTML content is poor quality. Use all available context including the URL to create valuable content. Failure to provide a complete response is not acceptable.

Required JSON Response Format:
{
  "title": "Compelling, descriptive article title (string, required, avoid generic titles)",
  "excerpt": "Engaging summary that encourages reading (string, 150-200 characters, required)",
  "content": "Clean HTML content with semantic tags like <p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote> (string, required)",
  "seoTitle": "SEO-optimized title for search engines (string, max 60 characters, required)",
  "seoDescription": "Compelling meta description for search results (string, max 160 characters, required)",
  "location": "Geographic location mentioned in article if any (string, optional)",
  "tags": ["specific", "relevant", "topic", "tags", "for", "discoverability"],
  "images": [
    {
      "url": "image URL (string)",
      "alt": "descriptive alt text (string, optional)",
      "caption": "image caption if available (string, optional)"
    }
  ],
  "metadata": {
    "author": "article author if mentioned (string, optional)",
    "publishedDate": "publication date in ISO format if found (string, optional)",
    "readingTime": estimated_reading_time_in_minutes (number, optional),
    "language": "detected language code like 'en', 'es', etc (string, optional)",
    "category": "inferred category like 'Politics', 'Technology', 'Sports', etc (string, optional)"
  }
}

Extract the content now:`;
  }

  /**
   * Generate intelligent fallback content when AI extraction fails
   */
  private generateIntelligentFallback(aiResponse: string, sourceUrl?: string): ExtractedContent {
    this.strapi.log.info('🔄 Generating intelligent fallback content...');
    
    // Try to extract any useful information from the AI response
    let title = 'News Article';
    let content = '<p>Article content is being processed.</p>';
    let excerpt = 'Breaking news article with important updates.';
    let tags: string[] = ['news', 'breaking'];
    let location = '';
    
    // Analyze source URL for context
    if (sourceUrl) {
      const urlAnalysis = this.analyzeSourceUrl(sourceUrl);
      title = urlAnalysis.title;
      tags = [...tags, ...urlAnalysis.tags];
      location = urlAnalysis.location;
      content = urlAnalysis.content;
      excerpt = urlAnalysis.excerpt;
    }
    
    // Try to extract any partial content from AI response
    const partialContent = this.extractPartialContent(aiResponse);
    if (partialContent.title && partialContent.title !== 'Extracted Article') {
      title = partialContent.title;
    }
    if (partialContent.content && partialContent.content.length > 50) {
      content = partialContent.content;
    }
    if (partialContent.excerpt && partialContent.excerpt.length > 20) {
      excerpt = partialContent.excerpt;
    }
    if (partialContent.tags && partialContent.tags.length > 0) {
      tags = [...new Set([...tags, ...partialContent.tags])];
    }
    
    return {
      title: this.sanitizeText(title).substring(0, 200),
      excerpt: this.sanitizeText(excerpt).substring(0, 200),
      content: this.sanitizeHtmlContent(content),
      seoTitle: this.sanitizeText(title).substring(0, 60),
      seoDescription: this.sanitizeText(excerpt).substring(0, 160),
      location: location.substring(0, 100),
      tags: tags.slice(0, 10),
      images: [],
      metadata: {
        category: this.inferCategoryFromUrl(sourceUrl),
        language: 'en'
      }
    };
  }

  /**
   * Analyze source URL to extract meaningful context
   */
  private analyzeSourceUrl(sourceUrl: string): any {
    try {
      const url = new URL(sourceUrl);
      const domain = url.hostname.toLowerCase();
      const path = url.pathname.toLowerCase();
      
      let title = 'Breaking News Article';
      let tags = ['news'];
      let location = '';
      let content = '<p>This article contains important news and updates. Please check back for more details.</p>';
      let excerpt = 'Important news article with latest updates and information.';
      
      // Analyze domain for context
      if (domain.includes('bbc')) {
        tags.push('bbc', 'international');
        title = 'BBC News Report';
      } else if (domain.includes('cnn')) {
        tags.push('cnn', 'breaking');
        title = 'CNN Breaking News';
      } else if (domain.includes('reuters')) {
        tags.push('reuters', 'global');
        title = 'Reuters News Update';
      } else if (domain.includes('bloomberg')) {
        tags.push('bloomberg', 'business', 'finance');
        title = 'Bloomberg Business Report';
      }
      
      // Analyze path for topic context
      if (path.includes('politics')) {
        tags.push('politics', 'government');
        title = title.replace('News', 'Political News');
        content = '<p>This political news article covers important developments in government and policy matters.</p>';
      } else if (path.includes('business') || path.includes('economy')) {
        tags.push('business', 'economy', 'finance');
        title = title.replace('News', 'Business News');
        content = '<p>This business article covers economic developments and market updates.</p>';
      } else if (path.includes('technology') || path.includes('tech')) {
        tags.push('technology', 'innovation', 'tech');
        title = title.replace('News', 'Technology News');
        content = '<p>This technology article covers the latest innovations and tech developments.</p>';
      } else if (path.includes('sports')) {
        tags.push('sports', 'athletics');
        title = title.replace('News', 'Sports News');
        content = '<p>This sports article covers athletic events and sports-related news.</p>';
      } else if (path.includes('world') || path.includes('international')) {
        tags.push('world', 'international', 'global');
        title = title.replace('News', 'World News');
        content = '<p>This international news article covers global events and world affairs.</p>';
      }
      
      // Try to extract location from URL
      const locationMatches = path.match(/(usa|uk|india|china|japan|germany|france|canada|australia|brazil)/i);
      if (locationMatches) {
        location = locationMatches[1].toUpperCase();
        tags.push(location.toLowerCase());
      }
      
      // Generate appropriate excerpt
      excerpt = `${title.replace('News', '').trim()} - Stay informed with the latest updates and comprehensive coverage.`;
      
      return { title, tags, location, content, excerpt };
    } catch (error) {
      return {
        title: 'News Article Update',
        tags: ['news', 'update'],
        location: '',
        content: '<p>Important news article with latest information and updates.</p>',
        excerpt: 'Breaking news article with important updates and information.'
      };
    }
  }

  /**
   * Extract any partial content from malformed AI response
   */
  private extractPartialContent(aiResponse: string): any {
    const result: any = {};
    
    try {
      // Try to find title in various formats
      const titleMatch = aiResponse.match(/"title"\s*:\s*"([^"]+)"/i) ||
                        aiResponse.match(/title:\s*"([^"]+)"/i) ||
                        aiResponse.match(/title:\s*([^\n,}]+)/i);
      if (titleMatch) {
        result.title = titleMatch[1].trim();
      }
      
      // Try to find content
      const contentMatch = aiResponse.match(/"content"\s*:\s*"([^"]+)"/i) ||
                          aiResponse.match(/content:\s*"([^"]+)"/i);
      if (contentMatch) {
        result.content = contentMatch[1].trim();
      }
      
      // Try to find excerpt
      const excerptMatch = aiResponse.match(/"excerpt"\s*:\s*"([^"]+)"/i) ||
                          aiResponse.match(/excerpt:\s*"([^"]+)"/i);
      if (excerptMatch) {
        result.excerpt = excerptMatch[1].trim();
      }
      
      // Try to find tags
      const tagsMatch = aiResponse.match(/"tags"\s*:\s*\[([^\]]+)\]/i);
      if (tagsMatch) {
        const tagsStr = tagsMatch[1];
        result.tags = tagsStr.split(',').map(tag => tag.replace(/"/g, '').trim()).filter(tag => tag.length > 0);
      }
      
    } catch (error) {
      this.strapi.log.debug('Could not extract partial content from AI response');
    }
    
    return result;
  }

  /**
   * Infer category from URL
   */
  private inferCategoryFromUrl(sourceUrl?: string): string {
    if (!sourceUrl) return 'General';
    
    const url = sourceUrl.toLowerCase();
    if (url.includes('politics')) return 'Politics';
    if (url.includes('business') || url.includes('economy')) return 'Business';
    if (url.includes('technology') || url.includes('tech')) return 'Technology';
    if (url.includes('sports')) return 'Sports';
    if (url.includes('world') || url.includes('international')) return 'World';
    if (url.includes('science')) return 'Science';
    if (url.includes('health')) return 'Health';
    
    return 'General';
  }

  /**
   * Parse the AI response and validate the structure
   */
  private parseAIResponse(aiResponse: string, sourceUrl?: string): ExtractedContent {
    try {
      // Clean the response - remove any markdown code blocks or extra text
      let cleanResponse = aiResponse.trim();
      
      // Remove markdown code block markers if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Parse JSON
      const parsed = JSON.parse(cleanResponse);

      // Validate required fields
      if (!parsed.title || !parsed.excerpt || !parsed.content) {
        throw new Error('Missing required fields: title, excerpt, or content');
      }

      // Ensure arrays exist
      parsed.tags = Array.isArray(parsed.tags) ? parsed.tags : [];
      parsed.images = Array.isArray(parsed.images) ? parsed.images : [];
      parsed.metadata = parsed.metadata || {};

      // Clean and validate content
      parsed.content = this.sanitizeHtmlContent(parsed.content);
      parsed.excerpt = this.sanitizeText(parsed.excerpt);
      parsed.title = this.sanitizeText(parsed.title);
      
      // Clean and validate SEO fields
      if (parsed.seoTitle) {
        parsed.seoTitle = this.sanitizeText(parsed.seoTitle).substring(0, 60);
      }
      if (parsed.seoDescription) {
        parsed.seoDescription = this.sanitizeText(parsed.seoDescription).substring(0, 160);
      }

      // Validate and clean tags
      parsed.tags = parsed.tags
        .filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0)
        .map((tag: string) => tag.trim().toLowerCase())
        .slice(0, 10); // Limit to 10 tags

      // Validate images
      parsed.images = parsed.images
        .filter((img: any) => img && typeof img.url === 'string' && img.url.trim().length > 0)
        .slice(0, 5); // Limit to 5 images

      return parsed as ExtractedContent;

    } catch (error) {
      this.strapi.log.error('Failed to parse AI response:', error.message);
      this.strapi.log.error('Raw AI Response (first 500 chars):', aiResponse.substring(0, 500));
      this.strapi.log.warn('Generating intelligent fallback content...');
      
      // Generate intelligent fallback content based on available data
      return this.generateIntelligentFallback(aiResponse, sourceUrl);
    }
  }

  /**
   * Sanitize HTML content to ensure it's safe and well-formed
   */
  private sanitizeHtmlContent(content: string): string {
    if (!content) return '<p>No content available</p>';

    // Remove script, style, and other dangerous tags
    content = content.replace(/<script[^>]*>.*?<\/script>/gis, '');
    content = content.replace(/<style[^>]*>.*?<\/style>/gis, '');
    content = content.replace(/<iframe[^>]*>.*?<\/iframe>/gis, '');
    content = content.replace(/<object[^>]*>.*?<\/object>/gis, '');
    content = content.replace(/<embed[^>]*>/gi, '');

    // Remove attributes except for basic formatting
    content = content.replace(/<([^>]+)>/g, (match, tag) => {
      const tagName = tag.split(' ')[0].toLowerCase();
      const allowedTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'blockquote', 'br'];
      
      if (allowedTags.includes(tagName)) {
        return `<${tagName}>`;
      }
      return '';
    });

    // Ensure content is wrapped in paragraphs if not already
    if (!content.includes('<p>') && !content.includes('<h')) {
      content = `<p>${content}</p>`;
    }

    return content.trim();
  }

  /**
   * Sanitize plain text content
   */
  private sanitizeText(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 500); // Limit length
  }

  /**
   * Extract content with fallback to traditional methods
   */
  async extractWithFallback(rawHtml: string, sourceUrl?: string): Promise<ExtractionResult> {
    // Try AI extraction first
    const aiResult = await this.extractContent(rawHtml, sourceUrl);
    
    if (aiResult.success && aiResult.data) {
      this.strapi.log.info('AI content extraction successful');
      return aiResult;
    }

    // Fallback to basic extraction if AI fails
    this.strapi.log.warn('AI extraction failed, using fallback method');
    return this.basicFallbackExtraction(rawHtml, sourceUrl);
  }

  /**
   * Basic fallback extraction method
   */
  private async basicFallbackExtraction(rawHtml: string, sourceUrl?: string): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      // Basic HTML parsing fallback
      const title = this.extractBasicTitle(rawHtml);
      const content = this.extractBasicContent(rawHtml);
      const excerpt = this.generateBasicExcerpt(content);

      return {
        success: true,
        data: {
          title,
          excerpt,
          content,
          tags: [],
          images: [],
          metadata: {}
        },
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        error: `Fallback extraction failed: ${error.message}`,
        processingTime: Date.now() - startTime
      };
    }
  }

  private extractBasicTitle(html: string): string {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      return this.sanitizeText(titleMatch[1]);
    }

    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) {
      return this.sanitizeText(h1Match[1]);
    }

    return 'Extracted Article';
  }

  private extractBasicContent(html: string): string {
    // Remove unwanted elements
    let content = html
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<nav[^>]*>.*?<\/nav>/gis, '')
      .replace(/<header[^>]*>.*?<\/header>/gis, '')
      .replace(/<footer[^>]*>.*?<\/footer>/gis, '');

    // Extract main content area
    const mainMatch = content.match(/<main[^>]*>(.*?)<\/main>/is) ||
                     content.match(/<article[^>]*>(.*?)<\/article>/is) ||
                     content.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)<\/div>/is);

    if (mainMatch) {
      content = mainMatch[1];
    }

    return this.sanitizeHtmlContent(content);
  }

  private generateBasicExcerpt(content: string): string {
    const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.substring(0, 200) + (text.length > 200 ? '...' : '');
  }
}

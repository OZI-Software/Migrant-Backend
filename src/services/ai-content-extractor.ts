/**
 * Enhanced AI-Powered Content Extraction Service
 * Uses Gemini AI to intelligently extract structured content from RSS feeds and URLs
 * Includes URL resolution, HTML extraction, and rich content generation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import axios from 'axios';
import { URL } from 'url';

interface ExtractedContent {
  title: string;
  excerpt: string;
  content: string; // Rich HTML content with highlights
  slug: string; // URL-friendly slug with timestamp
  seoTitle?: string;
  seoDescription?: string;
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
    sourceUrl?: string;
    resolvedUrl?: string;
  };
}

interface ExtractionResult {
  success: boolean;
  data?: ExtractedContent;
  error?: string;
  processingTime: number;
}

interface RSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  guid?: string;
  source?: string;
  description?: string;
}

export default class AIContentExtractor {
  private genAI: GoogleGenerativeAI | null;
  private model: any;
  private strapi: any;

  constructor(private strapiInstance: any) {
    this.strapi = strapiInstance;
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      this.strapi.log.warn('⚠️ GEMINI_API_KEY not found in environment variables. AI extraction will be disabled.');
      this.genAI = null;
      this.model = null;
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-pro',
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 8192,
        }
      });
      this.strapi.log.info('✅ Enhanced AI Content Extractor initialized with gemini-pro');
    }
  }

  /**
   * Main method to extract content from RSS item with URL resolution and comprehensive logging
   */
  async extractFromRSSItem(rssItem: RSSItem, category?: string): Promise<ExtractionResult> {
    const startTime = Date.now();
    const articleTitle = rssItem.title || 'Untitled Article';

    this.strapi.log.info(`🚀 [AI-EXTRACTOR] Starting enhanced extraction for: "${articleTitle}"`);
    this.strapi.log.debug(`📋 [AI-EXTRACTOR] RSS Item details:`, {
      title: rssItem.title,
      link: rssItem.link,
      category: category || 'General',
      pubDate: rssItem.pubDate,
      hasDescription: !!rssItem.description
    });

    try {
      if (!this.genAI || !this.model) {
        this.strapi.log.error(`❌ [AI-EXTRACTOR] Gemini AI not initialized for: "${articleTitle}"`);
        return {
          success: false,
          error: 'Gemini AI is not initialized. Please check GEMINI_API_KEY.',
          processingTime: Date.now() - startTime
        };
      }

      // Step 1: Resolve the URL from RSS link
      this.strapi.log.info(`🔗 [AI-EXTRACTOR] Step 1/5: Resolving URL for "${articleTitle}"`);
      const resolvedUrl = await this.resolveUrl(rssItem.link);
      this.strapi.log.info(`✅ [AI-EXTRACTOR] URL resolved: ${resolvedUrl}`);

      // Step 2: Extract full HTML content from resolved URL
      this.strapi.log.info(`📄 [AI-EXTRACTOR] Step 2/5: Extracting HTML content`);
      const htmlContent = await this.extractHtmlContent(resolvedUrl);
      this.strapi.log.info(`✅ [AI-EXTRACTOR] HTML content extracted (${htmlContent.length} characters)`);

      // Step 3: Use Readability to get clean article content
      this.strapi.log.info(`📖 [AI-EXTRACTOR] Step 3/5: Processing readable content`);
      const readableContent = this.extractReadableContent(htmlContent, resolvedUrl);
      this.strapi.log.info(`✅ [AI-EXTRACTOR] Readable content processed`);
      
      // Step 4: Generate rich content using Gemini AI
      this.strapi.log.info(`🤖 [AI-EXTRACTOR] Step 4/5: Generating enhanced content with AI`);
      const aiResult = await this.generateRichContent(readableContent, rssItem, resolvedUrl, category);
      this.strapi.log.info(`✅ [AI-EXTRACTOR] AI content generation completed`);

      // Step 5: Final validation and logging
      this.strapi.log.info(`🔍 [AI-EXTRACTOR] Step 5/5: Finalizing extraction results`);
      const totalTime = Date.now() - startTime;
      this.strapi.log.info(`🎉 [AI-EXTRACTOR] Enhanced extraction completed successfully in ${totalTime}ms for: "${aiResult.title}"`);
      this.strapi.log.debug(`📊 [AI-EXTRACTOR] Final extraction stats:`, {
        originalTitle: rssItem.title,
        enhancedTitle: aiResult.title,
        contentLength: aiResult.content.length,
        tagsCount: aiResult.tags.length,
        location: aiResult.location || 'Not specified',
        processingTime: `${totalTime}ms`
      });

      return {
        success: true,
        data: aiResult,
        processingTime: totalTime
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.strapi.log.error(`❌ [AI-EXTRACTOR] Enhanced extraction failed after ${totalTime}ms for: "${articleTitle}"`, error.message);
      this.strapi.log.debug(`🔍 [AI-EXTRACTOR] Error context:`, {
        articleTitle,
        originalUrl: rssItem.link,
        category: category || 'General',
        errorType: error.constructor.name,
        errorMessage: error.message
      });
      return {
        success: false,
        error: error.message,
        processingTime: totalTime
      };
    }
  }

  /**
   * Resolve URL from RSS link (handles redirects and Google News URLs)
   */
  private async resolveUrl(rssUrl: string): Promise<string> {
    this.strapi.log.info(`🔗 [AI-EXTRACTOR] Starting URL resolution for: ${rssUrl}`);
    
    try {
      // Handle Google News URLs that need resolution
      if (rssUrl.includes('news.google.com')) {
        this.strapi.log.debug(`📰 [AI-EXTRACTOR] Detected Google News URL, extracting target URL`);
        const urlMatch = rssUrl.match(/url=([^&]+)/);
        if (urlMatch) {
          const decodedUrl = decodeURIComponent(urlMatch[1]);
          this.strapi.log.info(`✅ [AI-EXTRACTOR] Extracted URL from Google News: ${decodedUrl}`);
          return decodedUrl;
        } else {
          this.strapi.log.warn(`⚠️ [AI-EXTRACTOR] Could not extract URL from Google News link, following redirects`);
          const response = await axios.get(rssUrl, {
            maxRedirects: 5,
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          const resolvedUrl = response.request.res.responseUrl || rssUrl;
          this.strapi.log.info(`✅ [AI-EXTRACTOR] Google News URL resolved to: ${resolvedUrl}`);
          return resolvedUrl;
        }
      }

      // For other URLs, follow redirects to get final URL
      this.strapi.log.debug(`🔄 [AI-EXTRACTOR] Following redirects for URL resolution`);
      const response = await axios.head(rssUrl, {
        maxRedirects: 5,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const resolvedUrl = response.request.res.responseUrl || rssUrl;
      if (resolvedUrl !== rssUrl) {
        this.strapi.log.info(`🔄 [AI-EXTRACTOR] URL redirected to: ${resolvedUrl}`);
      } else {
        this.strapi.log.debug(`✅ [AI-EXTRACTOR] URL resolution completed (no redirect needed)`);
      }
      
      return resolvedUrl;
    } catch (error) {
      this.strapi.log.warn(`❌ [AI-EXTRACTOR] Failed to resolve URL ${rssUrl}: ${error.message}`);
      this.strapi.log.debug(`🔄 [AI-EXTRACTOR] Returning original URL as fallback`);
      return rssUrl; // Return original URL if resolution fails
    }
  }

  /**
   * Extract full HTML content from resolved URL
   */
  private async extractHtmlContent(url: string): Promise<string> {
    this.strapi.log.info(`📄 [AI-EXTRACTOR] Starting HTML extraction from: ${url}`);
    
    try {
      const startTime = Date.now();
      const response = await axios.get(url, {
        timeout: 15000,
        maxContentLength: 10 * 1024 * 1024, // 10MB limit
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      const extractionTime = Date.now() - startTime;
      const contentLength = response.data.length;
      const contentType = response.headers['content-type'] || 'unknown';
      
      this.strapi.log.info(`✅ [AI-EXTRACTOR] HTML extraction successful in ${extractionTime}ms`);
      this.strapi.log.debug(`📊 [AI-EXTRACTOR] Content stats - Length: ${contentLength} chars, Type: ${contentType}`);
      this.strapi.log.debug(`🔍 [AI-EXTRACTOR] Response status: ${response.status} ${response.statusText}`);

      if (contentLength === 0) {
        this.strapi.log.warn(`⚠️ [AI-EXTRACTOR] Warning: Empty HTML content received from ${url}`);
      }

      return response.data;
    } catch (error) {
      this.strapi.log.error(`❌ [AI-EXTRACTOR] Failed to extract HTML from ${url}: ${error.message}`);
      this.strapi.log.debug(`🔍 [AI-EXTRACTOR] Error details:`, {
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        timeout: error.code === 'ECONNABORTED'
      });
      throw new Error(`Failed to fetch content from URL: ${error.message}`);
    }
  }

  /**
   * Extract readable content using Mozilla Readability
   */
  private extractReadableContent(htmlContent: string, url: string): any {
    this.strapi.log.info(`📖 [AI-EXTRACTOR] Starting readable content extraction using Readability`);
    
    try {
      // Create JSDOM instance
      this.strapi.log.debug(`🔧 [AI-EXTRACTOR] Creating JSDOM instance for content parsing`);
      const dom = new JSDOM(htmlContent, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) {
        this.strapi.log.warn(`⚠️ [AI-EXTRACTOR] Readability failed to parse article, using fallback`);
        throw new Error('Failed to parse article with Readability');
      }

      this.strapi.log.info(`✅ [AI-EXTRACTOR] Readability extraction successful`);
      this.strapi.log.debug(`📊 [AI-EXTRACTOR] Readability stats:`, {
        title: article.title ? 'Found' : 'Missing',
        contentLength: article.content.length,
        textLength: article.textContent?.length || 0,
        byline: article.byline ? 'Found' : 'Missing',
        siteName: article.siteName || 'Unknown'
      });

      return {
        title: article.title,
        content: article.content,
        textContent: article.textContent,
        length: article.length,
        excerpt: article.excerpt,
        byline: article.byline,
        dir: article.dir,
        siteName: article.siteName
      };
    } catch (error) {
      this.strapi.log.warn(`⚠️ [AI-EXTRACTOR] Readability parsing failed: ${error.message}`);
      this.strapi.log.debug(`🔄 [AI-EXTRACTOR] Falling back to basic HTML parsing`);
      // Fallback to basic HTML parsing
      return this.fallbackHtmlParsing(htmlContent);
    }
  }

  /**
   * Fallback HTML parsing when Readability fails
   */
  private fallbackHtmlParsing(htmlContent: string): any {
    const $ = cheerio.load(htmlContent);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads').remove();
    
    // Extract title
    const title = $('h1').first().text() || $('title').text() || '';
    
    // Extract main content
    const contentSelectors = [
      'article',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
      '.main-content'
    ];
    
    let content = '';
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length && element.text().trim().length > 100) {
        content = element.html() || '';
        break;
      }
    }
    
    // If no content found, get all paragraphs
    if (!content) {
      content = $('p').map((i, el) => $(el).html()).get().join('\n');
    }
    
    return {
      title: title.trim(),
      content: content,
      textContent: $(content).text(),
      length: $(content).text().length,
      excerpt: $(content).text().substring(0, 200) + '...',
      byline: $('[rel="author"]').text() || $('.author').text() || '',
      siteName: $('meta[property="og:site_name"]').attr('content') || ''
    };
  }

  /**
   * Generate rich content using Gemini AI with retry logic
   */
  private async generateRichContent(
    readableContent: any, 
    rssItem: RSSItem, 
    resolvedUrl: string, 
    category?: string
  ): Promise<ExtractedContent> {
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.strapi.log.info(`🤖 [AI-EXTRACTOR] AI generation attempt ${attempt}/${maxRetries}`);
        
        const prompt = this.buildEnhancedExtractionPrompt(readableContent, rssItem, resolvedUrl, category);
        
        // Add timeout for AI generation
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AI generation timeout')), 30000);
        });
        
        const generationPromise = this.model.generateContent(prompt);
        
        const result = await Promise.race([generationPromise, timeoutPromise]);
        const response = await result.response;
        const aiResponse = response.text().trim();

        this.strapi.log.debug(`📝 [AI-EXTRACTOR] AI response received (${aiResponse.length} chars)`);

        // Validate AI response before parsing
        if (!aiResponse || aiResponse.length < 100) {
          throw new Error('AI response too short or empty');
        }

        // Parse AI response and generate metadata
        const extractedData = await this.parseEnhancedAIResponse(aiResponse, rssItem, resolvedUrl, category);
        
        this.strapi.log.info(`✅ [AI-EXTRACTOR] AI generation successful on attempt ${attempt}`);
        return extractedData;
        
      } catch (error) {
        lastError = error;
        this.strapi.log.warn(`⚠️ [AI-EXTRACTOR] AI generation attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          this.strapi.log.info(`🔄 [AI-EXTRACTOR] Retrying AI generation in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    this.strapi.log.error(`❌ [AI-EXTRACTOR] All AI generation attempts failed. Using fallback.`);
    throw new Error(`AI content generation failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Build enhanced extraction prompt for Gemini AI with comprehensive instructions
   */
  private buildEnhancedExtractionPrompt(
    readableContent: any, 
    rssItem: RSSItem, 
    resolvedUrl: string, 
    category?: string
  ): string {
    const currentDate = new Date().toISOString().split('T')[0];
    const timestamp = new Date().getTime().toString().slice(-6);
    
    return `You are a professional news content extractor. Extract and enhance the following article content into a structured format.

ARTICLE TO PROCESS:
URL: ${resolvedUrl}
Original Title: ${rssItem.title || 'N/A'}
Category: ${category || 'General'}

CONTENT:
${readableContent.textContent || readableContent.content || rssItem.content || rssItem.description || ''}

INSTRUCTIONS:
1. Create a compelling news headline (max 80 characters)
2. Write a 150-200 character excerpt summarizing the key points
3. Structure the content as professional HTML with proper paragraphs, headings, and formatting
4. Generate 5-8 specific, relevant tags (avoid generic terms like "news", "breaking")
5. Extract the primary location mentioned in the article
6. Create SEO-optimized title and description
7. Generate a URL-friendly slug with format: main-keywords-${currentDate.replace(/-/g, '')}-${timestamp}

REQUIRED OUTPUT FORMAT (JSON ONLY):
{
  "title": "Compelling news headline under 80 characters",
  "excerpt": "Clear 150-200 character summary of the article",
  "content": "<p>Professional HTML content with proper structure, minimum 400 words</p>",
  "slug": "seo-friendly-slug-${currentDate.replace(/-/g, '')}-${timestamp}",
  "seoTitle": "SEO title 50-60 characters",
  "seoDescription": "SEO description 150-160 characters",
  "tags": ["specific-tag1", "specific-tag2", "specific-tag3", "specific-tag4", "specific-tag5"],
  "location": "City, Country or State",
  "metadata": {
    "publishedDate": "${rssItem.pubDate || new Date().toISOString()}",
    "readingTime": 3,
    "language": "en",
    "category": "${category || 'General'}",
    "sourceUrl": "${rssItem.link || ''}",
    "resolvedUrl": "${resolvedUrl}",
    "wordCount": 500
  }
}

CRITICAL REQUIREMENTS:
- Output ONLY valid JSON, no explanations or markdown
- ALL FIELDS ARE MANDATORY - missing fields will cause rejection
- title: Must be 10-80 characters, compelling and specific (NOT "Google News", "News", "Article")
- excerpt: Must be 150-200 characters, clear summary
- content: Must be minimum 400 words with proper HTML structure
- slug: Must include timestamp format: main-keywords-${currentDate.replace(/-/g, '')}-${timestamp}
- seoTitle: Must be 50-60 characters, optimized for search
- seoDescription: Must be 150-160 characters, compelling meta description
- tags: Must be 5-8 specific entities/topics (NO generic terms like "news", "breaking", "latest")
- location: Must be specific city/country if mentioned in article, or "Global" if not location-specific
- metadata: All nested fields are required and must be accurate
- Maintain professional journalism standards and factual accuracy`;
  }

  /**
   * Parse enhanced AI response and generate additional metadata
   */
  private async parseEnhancedAIResponse(
    aiResponse: string, 
    rssItem: RSSItem, 
    resolvedUrl: string, 
    category?: string
  ): Promise<ExtractedContent> {
    this.strapi.log.info(`🔍 [AI-EXTRACTOR] Parsing AI response for URL: ${resolvedUrl}`);
    
    try {
      // Clean the response to extract JSON
      let jsonStr = aiResponse.trim();
      this.strapi.log.debug(`📝 [AI-EXTRACTOR] Raw AI response length: ${aiResponse.length} characters`);
      
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        this.strapi.log.debug(`🧹 [AI-EXTRACTOR] Cleaned JSON markdown blocks`);
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
        this.strapi.log.debug(`🧹 [AI-EXTRACTOR] Cleaned generic markdown blocks`);
      }

      // Find JSON object in the response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
        this.strapi.log.debug(`🎯 [AI-EXTRACTOR] Extracted JSON object from response`);
      }

      const parsed = JSON.parse(jsonStr);
      this.strapi.log.info(`✅ [AI-EXTRACTOR] Successfully parsed AI JSON response`);
      
      // Comprehensive validation of ALL required fields
      const requiredFields = ['title', 'content', 'excerpt', 'slug', 'seoTitle', 'seoDescription', 'tags', 'location'];
      const missingFields = requiredFields.filter(field => !parsed[field]);
      
      if (missingFields.length > 0) {
        this.strapi.log.warn(`⚠️ [AI-EXTRACTOR] Missing required fields: ${missingFields.join(', ')}`);
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate title quality - reject generic titles
      const genericTitles = ['Google News', 'News', 'Article', 'Untitled', 'Breaking News', 'Latest'];
      const isGenericTitle = genericTitles.some(generic => 
        parsed.title.toLowerCase().includes(generic.toLowerCase())
      );
      
      if (isGenericTitle || parsed.title.length < 10 || parsed.title.length > 80) {
        this.strapi.log.warn(`⚠️ [AI-EXTRACTOR] Invalid title: "${parsed.title}" (length: ${parsed.title.length})`);
        throw new Error('AI generated invalid title - too generic, short, or long');
      }

      // Validate excerpt length
      if (parsed.excerpt.length < 100 || parsed.excerpt.length > 250) {
        this.strapi.log.warn(`⚠️ [AI-EXTRACTOR] Invalid excerpt length: ${parsed.excerpt.length} characters`);
        throw new Error('Excerpt must be 100-250 characters');
      }

      // Validate content length
      if (parsed.content.length < 400) {
        this.strapi.log.warn(`⚠️ [AI-EXTRACTOR] Content too short: ${parsed.content.length} characters`);
        throw new Error('Generated content must be minimum 400 characters');
      }

      // Validate SEO fields
      if (parsed.seoTitle.length < 30 || parsed.seoTitle.length > 70) {
        this.strapi.log.warn(`⚠️ [AI-EXTRACTOR] Invalid seoTitle length: ${parsed.seoTitle.length} characters`);
        throw new Error('SEO title must be 30-70 characters');
      }

      if (parsed.seoDescription.length < 120 || parsed.seoDescription.length > 170) {
        this.strapi.log.warn(`⚠️ [AI-EXTRACTOR] Invalid seoDescription length: ${parsed.seoDescription.length} characters`);
        throw new Error('SEO description must be 120-170 characters');
      }

      // Validate tags
      if (!Array.isArray(parsed.tags) || parsed.tags.length < 3 || parsed.tags.length > 8) {
        this.strapi.log.warn(`⚠️ [AI-EXTRACTOR] Invalid tags array: ${parsed.tags?.length || 0} tags`);
        throw new Error('Tags must be an array of 3-8 items');
      }

      // Check for generic tags
      const genericTagTerms = ['news', 'breaking', 'latest', 'update', 'story', 'article'];
      const hasGenericTags = parsed.tags.some(tag => 
        genericTagTerms.some(generic => tag.toLowerCase().includes(generic))
      );
      
      if (hasGenericTags) {
        this.strapi.log.warn(`⚠️ [AI-EXTRACTOR] Generic tags detected: ${parsed.tags.join(', ')}`);
        throw new Error('Tags contain generic terms - need specific entities/topics');
      }

      // Validate location
      if (!parsed.location || parsed.location.trim().length < 2) {
        this.strapi.log.warn(`⚠️ [AI-EXTRACTOR] Invalid location: "${parsed.location}"`);
        throw new Error('Location must be specified (city/country or "Global")');
      }
      
      // Use AI-generated slug if available, otherwise generate one
      const slug = parsed.slug || this.generateSlugWithTimestamp(parsed.title);
      this.strapi.log.debug(`🏷️ [AI-EXTRACTOR] Generated slug: ${slug}`);
      
      // Ensure tags are valid
      const tags = Array.isArray(parsed.tags) && parsed.tags.length > 0 
        ? parsed.tags.filter(tag => tag && typeof tag === 'string' && tag.trim().length > 0)
        : [category || 'General'];
      
      // Log key extracted data
      this.strapi.log.info(`📰 [AI-EXTRACTOR] Extracted title: "${parsed.title}"`);
      this.strapi.log.info(`📍 [AI-EXTRACTOR] Extracted location: ${parsed.location || 'Not specified'}`);
      this.strapi.log.info(`🏷️ [AI-EXTRACTOR] Extracted tags: [${tags.join(', ')}]`);
      this.strapi.log.info(`📊 [AI-EXTRACTOR] Content length: ${parsed.content.length} characters`);
      
      // Ensure all required fields are present with proper validation
      const extractedContent: ExtractedContent = {
        title: parsed.title.trim(),
        excerpt: parsed.excerpt.trim(),
        content: parsed.content,
        slug: slug,
        seoTitle: parsed.seoTitle?.trim() || parsed.title.substring(0, 60),
        seoDescription: parsed.seoDescription?.trim() || parsed.excerpt.substring(0, 160),
        location: parsed.location?.trim() || '',
        tags: tags,
        images: [],
        metadata: {
          author: parsed.metadata?.author || rssItem.source || 'Unknown',
          publishedDate: parsed.metadata?.publishedDate || rssItem.pubDate || new Date().toISOString(),
          readingTime: parsed.metadata?.readingTime || this.calculateReadingTime(parsed.content),
          language: parsed.metadata?.language || 'en',
          category: category || parsed.metadata?.category || 'General',
          sourceUrl: resolvedUrl || rssItem.link || '',
          resolvedUrl: resolvedUrl
        }
      };

      // Final validation
      if (!extractedContent.title || !extractedContent.content || !extractedContent.excerpt) {
        throw new Error('Final validation failed: missing critical content');
      }

      this.strapi.log.info(`✅ [AI-EXTRACTOR] Successfully processed article data for: "${extractedContent.title}"`);
      return extractedContent;
    } catch (error) {
      this.strapi.log.error(`❌ [AI-EXTRACTOR] Failed to parse AI response for ${resolvedUrl}:`, error.message);
      this.strapi.log.debug(`🔍 [AI-EXTRACTOR] Raw AI response causing error:`, aiResponse.substring(0, 1000));
      this.strapi.log.warn(`🔄 [AI-EXTRACTOR] Using fallback data structure`);
      
      // Return fallback content
      return await this.generateFallbackContent(rssItem, resolvedUrl, category);
    }
  }

  /**
   * Generate URL-friendly slug with timestamp
   */
  private generateSlugWithTimestamp(title: string): string {
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const timeExtension = new Date().getTime().toString().slice(-6);
    
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 50);
    
    return `${baseSlug}-${timestamp}-${timeExtension}`;
  }

  /**
   * Calculate estimated reading time
   */
  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Generate excerpt from content
   */
  private generateExcerpt(content: string): string {
    const textContent = content.replace(/<[^>]*>/g, '');
    return textContent.length > 200 
      ? textContent.substring(0, 197) + '...'
      : textContent;
  }

  /**
   * Generate fallback content when AI parsing fails
   */
  private async generateFallbackContent(rssItem: RSSItem, resolvedUrl: string, category?: string): Promise<ExtractedContent> {
    this.strapi.log.info(`🔄 [AI-EXTRACTOR] Generating enhanced fallback content for: ${resolvedUrl}`);
    
    let title = rssItem.title?.trim() || 'Untitled Article';
    
    // If title is generic (like "Google News"), try to extract a better title from the URL or content
    if (title === 'Google News' || title === 'News' || title.length < 10) {
      this.strapi.log.warn(`⚠️ [AI-EXTRACTOR] Generic title detected: "${title}", attempting to extract better title`);
      
      try {
        // Try to extract title from the resolved URL
        const urlTitle = this.extractTitleFromUrl(resolvedUrl);
        if (urlTitle && urlTitle.length > 10) {
          title = urlTitle;
          this.strapi.log.info(`✅ [AI-EXTRACTOR] Extracted title from URL: "${title}"`);
        } else {
          // Try to extract title from content
          const contentTitle = this.extractTitleFromContent(rssItem.content || rssItem.description || '');
          if (contentTitle && contentTitle.length > 10) {
            title = contentTitle;
            this.strapi.log.info(`✅ [AI-EXTRACTOR] Extracted title from content: "${title}"`);
          } else {
            // Generate a title based on category and timestamp
            title = `${category || 'News'} Article - ${new Date().toLocaleDateString()}`;
            this.strapi.log.info(`✅ [AI-EXTRACTOR] Generated fallback title: "${title}"`);
          }
        }
      } catch (error) {
        this.strapi.log.warn(`⚠️ [AI-EXTRACTOR] Failed to extract better title: ${error.message}`);
        title = `${category || 'News'} Article - ${new Date().toLocaleDateString()}`;
      }
    }
    
    const rawContent = rssItem.content || rssItem.description || rssItem.contentSnippet || '';
    
    // Create proper HTML content structure
    const content = rawContent.length > 100 
      ? `<p>${rawContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`
      : `<p>This article was imported from ${resolvedUrl}. Please visit the source for full content.</p><p>${rawContent}</p>`;
    
    // Generate meaningful excerpt
    const excerpt = rawContent.length > 200 
      ? rawContent.substring(0, 197).trim() + '...'
      : rawContent || `Article from ${title}`;
    
    // Generate basic tags from title and category
    const titleWords = title.toLowerCase().split(' ').filter(word => word.length > 3);
    const tags = [
      category || 'General',
      ...titleWords.slice(0, 3)
    ].filter(Boolean);
    
    this.strapi.log.info(`📝 [AI-EXTRACTOR] Fallback content generated with title: "${title}"`);
    
    return {
      title: title,
      excerpt: excerpt,
      content: content,
      slug: this.generateSlugWithTimestamp(title),
      seoTitle: title.length > 60 ? title.substring(0, 57) + '...' : title,
      seoDescription: excerpt.length > 160 ? excerpt.substring(0, 157) + '...' : excerpt,
      location: '',
      tags: tags,
      images: [],
      metadata: {
        author: rssItem.source || 'Unknown',
        publishedDate: rssItem.pubDate || new Date().toISOString(),
        readingTime: this.calculateReadingTime(content),
        language: 'en',
        category: category || 'General',
        sourceUrl: resolvedUrl || rssItem.link || '',
        resolvedUrl: resolvedUrl
      }
    };
  }

  /**
   * Extract title from URL path and domain
   */
  private extractTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Extract meaningful parts from the URL path
      const pathParts = pathname.split('/').filter(part => part && part.length > 2);
      
      if (pathParts.length > 0) {
        // Take the last meaningful part of the path (usually the article slug)
        const lastPart = pathParts[pathParts.length - 1];
        
        // Convert URL slug to readable title
        const title = lastPart
          .replace(/[-_]/g, ' ')
          .replace(/\.(html|htm|php|aspx?)$/i, '')
          .replace(/\b\w/g, l => l.toUpperCase())
          .trim();
        
        if (title.length > 10) {
          return title;
        }
      }
      
      // Fallback to domain-based title
      const domain = urlObj.hostname.replace(/^www\./, '');
      return `Article from ${domain}`;
    } catch (error) {
      return '';
    }
  }

  /**
   * Extract title from content text
   */
  private extractTitleFromContent(content: string): string {
    if (!content || content.length < 20) return '';
    
    try {
      // Look for the first sentence that could be a title
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
      
      if (sentences.length > 0) {
        const firstSentence = sentences[0].trim();
        
        // If the first sentence is reasonable length for a title, use it
        if (firstSentence.length > 10 && firstSentence.length < 100) {
          return firstSentence.replace(/^[^a-zA-Z0-9]*/, '').trim();
        }
      }
      
      // Fallback: take first 80 characters and clean up
      return content.substring(0, 80).trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
    } catch (error) {
      return '';
    }
  }

  /**
   * Save extracted content as draft article in Strapi with comprehensive logging
   */
  async saveArticleAsDraft(extractedContent: ExtractedContent, category?: string): Promise<any> {
    const articleTitle = extractedContent.title || 'Untitled Article';
    this.strapi.log.info(`💾 [AI-EXTRACTOR] Starting to save article as draft: "${articleTitle}"`);
    
    try {
      // Get or create author and category entities
      const { author, category: categoryEntity } = await this.getAuthorAndCategory(category || extractedContent.metadata.category || 'News');
      
      // Prepare article data according to Strapi content model
      this.strapi.log.debug(`📋 [AI-EXTRACTOR] Preparing article data for: "${articleTitle}"`);
      const articleData = {
        title: extractedContent.title,
        slug: extractedContent.slug,
        excerpt: extractedContent.excerpt,
        content: extractedContent.content,
        seoTitle: extractedContent.seoTitle,
        seoDescription: extractedContent.seoDescription,
        location: extractedContent.location,
        readTime: extractedContent.metadata.readingTime,
        author: author.id, // Use author ID instead of string
        category: categoryEntity.id, // Use category ID
        publishedAt: null, // Save as draft (unpublished)
        publishedDate: new Date(extractedContent.metadata.publishedDate),
        sourceUrl: extractedContent.metadata.sourceUrl,
        isBreaking: false
      };

      this.strapi.log.debug(`📊 [AI-EXTRACTOR] Article data summary:`, {
        title: articleData.title,
        slug: articleData.slug,
        contentLength: articleData.content.length,
        tagsCount: extractedContent.tags.length,
        location: articleData.location || 'Not specified',
        category: articleData.category,
        author: articleData.author,
        isDraft: articleData.publishedAt === null,
        readingTime: articleData.readTime
      });

      // Create the article in Strapi
      this.strapi.log.info(`🔄 [AI-EXTRACTOR] Creating article entity in database`);
      const createdArticle = await this.strapi.entityService.create('api::article.article', {
        data: articleData,
        populate: ['author', 'category']
      });

      this.strapi.log.info(`✅ [AI-EXTRACTOR] Article entity created with ID: ${createdArticle.id}`);

      // Handle tags separately after article creation
      if (extractedContent.tags && extractedContent.tags.length > 0) {
        const tagIds = await this.getOrCreateTags(extractedContent.tags);
        if (tagIds.length > 0) {
          try {
            // Use the relation service to connect tags
            await this.strapi.db.query('api::article.article').update({
              where: { id: createdArticle.id },
              data: {
                tags: tagIds
              }
            });
            this.strapi.log.debug(`Associated ${tagIds.length} tags with article: ${articleTitle}`);
          } catch (tagError) {
            this.strapi.log.warn(`Failed to associate tags with article: ${tagError.message}`);
          }
        }
      }

      // Handle images if any (but skip as per requirements)
      if (extractedContent.images && extractedContent.images.length > 0) {
        this.strapi.log.info(`🖼️ [AI-EXTRACTOR] Found ${extractedContent.images.length} images, but skipping image processing as per requirements`);
        this.strapi.log.debug(`📷 [AI-EXTRACTOR] Images found:`, extractedContent.images.map(img => img.url));
      } else {
        this.strapi.log.debug(`📷 [AI-EXTRACTOR] No images found in extracted content`);
      }

      this.strapi.log.info(`🎉 [AI-EXTRACTOR] Article successfully saved as draft: "${articleTitle}" (ID: ${createdArticle.id})`);
      return createdArticle;
      
    } catch (error) {
      this.strapi.log.error(`❌ [AI-EXTRACTOR] Failed to save article as draft: "${articleTitle}"`, error.message);
      this.strapi.log.debug(`🔍 [AI-EXTRACTOR] Save error details:`, {
        articleTitle,
        slug: extractedContent.slug,
        errorType: error.constructor.name,
        errorMessage: error.message,
        errorCode: error.code
      });
      throw new Error(`Failed to save article: ${error.message}`);
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
   * Handle image extraction and upload for articles
   */
  private async handleArticleImages(articleId: number, images: any[]): Promise<void> {
    try {
      this.strapi.log.info(`🖼️ Processing ${images.length} images for article ${articleId}`);

      for (const image of images) {
        try {
          // Download and upload image to Strapi
          const uploadedImage = await this.downloadAndUploadImage(image.url, image.alt);
          
          if (uploadedImage) {
            // Associate image with article
            await this.strapi.entityService.update('api::article.article', articleId, {
              data: {
                featuredImage: uploadedImage.id
              }
            });
            
            this.strapi.log.info(`✅ Image uploaded and associated with article: ${uploadedImage.name}`);
            break; // Use first successful image as featured image
          }
        } catch (imageError) {
          this.strapi.log.warn(`⚠️ Failed to process image ${image.url}: ${imageError.message}`);
        }
      }
    } catch (error) {
      this.strapi.log.error('Failed to handle article images:', error.message);
    }
  }

  /**
   * Download and upload image to Strapi
   */
  private async downloadAndUploadImage(imageUrl: string, altText?: string): Promise<any> {
    try {
      // Download image
      const response = await axios.get(imageUrl, {
        responseType: 'stream',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      // Generate filename
      const url = new URL(imageUrl);
      const extension = url.pathname.split('.').pop() || 'jpg';
      const filename = `article-image-${Date.now()}.${extension}`;

      // Upload to Strapi
      const uploadedFile = await this.strapi.plugins.upload.services.upload.upload({
        data: {
          refId: null,
          ref: null,
          field: null,
          source: 'content-manager'
        },
        files: {
          path: response.data,
          name: filename,
          type: response.headers['content-type'] || 'image/jpeg',
          size: parseInt(response.headers['content-length'] || '0')
        }
      });

      return uploadedFile[0];
    } catch (error) {
      this.strapi.log.error(`Failed to download/upload image ${imageUrl}:`, error.message);
      return null;
    }
  }

  /**
   * Complete pipeline: Extract from RSS item and save as draft
   */
  async processRSSItemToArticle(rssItem: RSSItem, category?: string): Promise<any> {
    try {
      this.strapi.log.info(`🚀 Starting complete RSS to article pipeline for: ${rssItem.title}`);

      // Step 1: Extract content using AI
      const extractionResult = await this.extractFromRSSItem(rssItem, category);
      
      if (!extractionResult.success || !extractionResult.data) {
        throw new Error(`Content extraction failed: ${extractionResult.error}`);
      }

      // Step 2: Save as draft article
      const savedArticle = await this.saveArticleAsDraft(extractionResult.data, category);

      this.strapi.log.info(`🎉 Complete pipeline successful! Article ID: ${savedArticle.id}`);
      
      return {
        success: true,
        article: savedArticle,
        extractedContent: extractionResult.data,
        processingTime: extractionResult.processingTime
      };
    } catch (error) {
      this.strapi.log.error('Complete RSS pipeline failed:', error.message);
      return {
        success: false,
        error: error.message,
        processingTime: 0
      };
    }
  }

  /**
   * Legacy method for backward compatibility
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
      slug: this.generateSlugWithTimestamp(title),
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
    try {
      // Create a mock RSS item for the legacy method
      const mockRSSItem: RSSItem = {
        title: 'Article',
        link: sourceUrl || '',
        pubDate: new Date().toISOString(),
        content: rawHtml,
        contentSnippet: '',
        guid: sourceUrl || ''
      };

      // Try AI extraction first
      const aiResult = await this.extractFromRSSItem(mockRSSItem);
      
      if (aiResult.success && aiResult.data) {
        this.strapi.log.info('AI content extraction successful');
        return {
          success: true,
          data: aiResult.data,
          processingTime: aiResult.processingTime,
          error: null
        };
      }

      // Fallback to basic extraction if AI fails
      this.strapi.log.warn('AI extraction failed, using fallback method');
      return this.basicFallbackExtraction(rawHtml, sourceUrl);
    } catch (error) {
      this.strapi.log.error('Error in extractWithFallback:', error);
      return this.basicFallbackExtraction(rawHtml, sourceUrl);
    }
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
          slug: this.generateSlugWithTimestamp(title),
          excerpt,
          content,
          tags: [],
          images: [],
          metadata: {
            readingTime: this.calculateReadingTime(content),
            sourceUrl: sourceUrl || '',
            resolvedUrl: sourceUrl || ''
          }
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



  /**
   * Extract basic title from HTML
   */
  private extractBasicTitle(html: string): string {
    const $ = cheerio.load(html);
    return $('title').text().trim() || $('h1').first().text().trim() || 'Untitled Article';
  }

  /**
   * Extract basic content from HTML
   */
  private extractBasicContent(html: string): string {
    const $ = cheerio.load(html);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads').remove();
    
    // Try to find main content
    const contentSelectors = ['article', '.content', '.post-content', '.entry-content', 'main', '.main'];
    
    for (const selector of contentSelectors) {
      const content = $(selector).text().trim();
      if (content && content.length > 200) {
        return content;
      }
    }
    
    // Fallback to body content
    return $('body').text().trim().substring(0, 2000);
  }

  /**
   * Generate basic excerpt from content
   */
  private generateBasicExcerpt(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 2).join('. ').trim() + (sentences.length > 2 ? '...' : '');
  }
}

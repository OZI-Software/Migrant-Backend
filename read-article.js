/**
 * Advanced Article Content Extractor
 * Uses modern web scraping libraries for robust content extraction
 * Supports both static HTML and JavaScript-rendered content
 */

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const TurndownService = require('turndown');
const axios = require('axios');

class AdvancedArticleFetcher {
  constructor(options = {}) {
    this.options = {
      timeout: 30000,
      waitForSelector: 'article, main, .content, .post-content',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      enableImages: true,
      enableJavaScript: true,
      ...options
    };
    
    this.browser = null;
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**'
    });
    
    // Configure Turndown for better markdown conversion
    this.setupTurndownRules();
  }

  setupTurndownRules() {
    // Custom rules for better markdown conversion
    this.turndownService.addRule('removeAds', {
      filter: (node) => {
        const className = node.className || '';
        const id = node.id || '';
        return /ad|advertisement|sponsor|promo|banner/i.test(className + ' ' + id);
      },
      replacement: () => ''
    });

    this.turndownService.addRule('preserveImages', {
      filter: 'img',
      replacement: (content, node) => {
        const src = node.getAttribute('src');
        const alt = node.getAttribute('alt') || '';
        const title = node.getAttribute('title') || '';
        
        if (!src) return '';
        
        // Convert relative URLs to absolute
        const absoluteSrc = this.makeAbsoluteUrl(src, this.currentUrl);
        return `![${alt}](${absoluteSrc}${title ? ` "${title}"` : ''})`;
      }
    });

    this.turndownService.addRule('cleanLinks', {
      filter: 'a',
      replacement: (content, node) => {
        const href = node.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
          return content;
        }
        
        const absoluteHref = this.makeAbsoluteUrl(href, this.currentUrl);
        return `[${content}](${absoluteHref})`;
      }
    });
  }

  async initBrowser() {
    if (!this.browser) {
      console.log('🚀 Launching browser...');
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  makeAbsoluteUrl(url, baseUrl) {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }

  async resolveGoogleNewsUrl(url) {
    console.log('🔗 Resolving Google News redirect URL...');
    
    // For Google News RSS URLs, we need to handle them differently
    if (url.includes('/rss/articles/')) {
      console.log('📰 Detected Google News RSS URL - this type of URL cannot be directly resolved to article content');
      console.log('💡 Recommendation: Use direct article URLs instead of Google News RSS URLs');
      console.log('🔄 Attempting to extract any embedded URLs...');
      
      // Try to extract any embedded URLs from the RSS URL structure
      const decodedUrl = this.decodeGoogleNewsUrl(url);
      if (decodedUrl && decodedUrl !== 'https://news.google.com') {
        console.log(`🎯 Found embedded URL: ${decodedUrl}`);
        return decodedUrl;
      }
      
      // If no embedded URL found, return null to indicate this URL type is not supported
      console.log('❌ Google News RSS URLs require special handling - cannot extract article content directly');
      return null;
    }
    
    try {
      // For non-RSS Google News URLs, try to decode the URL directly
      const decodedUrl = this.decodeGoogleNewsUrl(url);
      if (decodedUrl && decodedUrl !== 'https://news.google.com') {
        return decodedUrl;
      }
      
      // Try to extract the actual article URL by following the redirect manually
      console.log('🌐 Attempting to follow Google News redirect...');
      try {
        const response = await axios.get(url, {
          maxRedirects: 5,
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        // Check if we were redirected to an actual news site
        const finalUrl = response.request.res.responseUrl || url;
        console.log(`🎯 Final URL after redirect: ${finalUrl}`);
        
        if (finalUrl && !finalUrl.includes('news.google.com') && finalUrl.includes('http')) {
          return finalUrl;
        }
        
        // If still on Google News, try to extract from the HTML
        const html = response.data;
        const urlMatches = html.match(/https?:\/\/(?!news\.google\.com)[^\s"'<>]+/g);
        if (urlMatches && urlMatches.length > 0) {
          // Filter for likely article URLs
          const articleUrls = urlMatches.filter(u => 
            !u.includes('google.com') && 
            !u.includes('youtube.com') &&
            !u.includes('facebook.com') &&
            !u.includes('twitter.com') &&
            (u.includes('/article') || u.includes('/news') || u.includes('/story') || u.length > 50)
          );
          
          if (articleUrls.length > 0) {
            console.log(`🔍 Found potential article URL: ${articleUrls[0]}`);
            return articleUrls[0];
          }
        }
      } catch (axiosError) {
        console.log('⚠️ Axios redirect failed:', axiosError.message);
      }
      
      // If all else fails, use Puppeteer to follow redirects
      console.log('🎭 Using Puppeteer to resolve Google News URL...');
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      
      await page.setUserAgent(this.options.userAgent);
      
      // Navigate to the Google News URL
      await page.goto(url, { 
        waitUntil: 'networkidle0', 
        timeout: 15000 
      });
      
      // Wait a bit for any redirects to happen
      await page.waitForTimeout(2000);
      
      // Get the final URL after all redirects
      const finalUrl = page.url();
      
      await page.close();
      
      // Check if we got redirected to an actual news site
      if (finalUrl !== url && !finalUrl.includes('news.google.com')) {
        console.log(`✅ Resolved to: ${finalUrl}`);
        return finalUrl;
      } else {
        console.log('⚠️ Google News URL did not redirect to actual article');
        // Try to extract the actual URL from the Google News page
        return await this.extractUrlFromGoogleNewsPage(url);
      }
      
    } catch (error) {
      console.error('❌ Failed to resolve Google News URL:', error.message);
      return url; // Return original URL as fallback
    }
  }

  async extractUrlFromGoogleNewsPage(url) {
    console.log('🔍 Extracting actual URL from Google News page...');
    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      
      await page.setUserAgent(this.options.userAgent);
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
      
      // Look for the actual article link on the Google News page
      const articleUrl = await page.evaluate(() => {
        // Try to find the main article link
        const selectors = [
          'a[href*="http"]:not([href*="google.com"])',
          'article a[href]',
          '.article a[href]',
          '[data-n-au]'
        ];
        
        for (const selector of selectors) {
          const link = document.querySelector(selector);
          if (link && link.href && !link.href.includes('google.com')) {
            return link.href;
          }
        }
        return null;
      });
      
      await page.close();
      
      if (articleUrl) {
        console.log(`✅ Extracted article URL: ${articleUrl}`);
        return articleUrl;
      } else {
        console.log('⚠️ Could not extract article URL from Google News page');
        return url;
      }
      
    } catch (error) {
      console.error('❌ Failed to extract URL from Google News page:', error.message);
      return url;
    }
  }

  isGoogleNewsUrl(url) {
    return url.includes('news.google.com/rss/articles/');
  }

  isRssUrl(url) {
    return url.includes('/rss/') || url.includes('.rss') || url.includes('.xml') || url.includes('feed');
  }

  decodeGoogleNewsUrl(url) {
    console.log('🔓 Attempting to decode Google News URL...');
    try {
      // Google News URLs have a specific format: /articles/[encoded_data]?oc=5
      const urlParts = url.split('/articles/')[1];
      if (!urlParts) return null;
      
      const encodedPart = urlParts.split('?')[0];
      console.log(`📝 Encoded part: ${encodedPart.substring(0, 100)}...`);
      
      // Google News uses a specific encoding format
      // The encoded part contains CBM prefix followed by base64-like data
      if (encodedPart.startsWith('CBM')) {
        try {
          // Remove CBM prefix and try to decode
          const withoutPrefix = encodedPart.substring(3);
          
          // Try base64 decode with URL-safe characters
          const base64Safe = withoutPrefix.replace(/-/g, '+').replace(/_/g, '/');
          
          // Add padding if needed
          const padded = base64Safe + '='.repeat((4 - base64Safe.length % 4) % 4);
          
          const decoded = Buffer.from(padded, 'base64').toString('utf-8');
          console.log(`🔍 Decoded content: ${decoded.substring(0, 200)}...`);
          
          // Look for URL patterns in the decoded content
          const urlMatches = decoded.match(/https?:\/\/[^\s"'<>\x00-\x1f]+/g);
          if (urlMatches && urlMatches.length > 0) {
            const cleanUrl = urlMatches[0].replace(/[^\x20-\x7E]/g, ''); // Remove non-printable chars
            console.log(`✅ Found URL: ${cleanUrl}`);
            return cleanUrl;
          }
          
          // Try to find domain patterns
          const domainMatches = decoded.match(/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/g);
          if (domainMatches && domainMatches.length > 0) {
            const possibleUrl = `https://${domainMatches[0]}`;
            console.log(`🔗 Constructed URL from domain: ${possibleUrl}`);
            return possibleUrl;
          }
          
        } catch (e) {
          console.log('⚠️ Base64 decode failed:', e.message);
        }
      }
      
      // Try alternative approach - look for patterns in the original URL
      const patterns = [
        /https%3A%2F%2F([^%]+)/,  // URL encoded https://
        /http%3A%2F%2F([^%]+)/,   // URL encoded http://
        /([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/g  // Domain patterns
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          let extractedUrl = match[0];
          if (extractedUrl.includes('%')) {
            extractedUrl = decodeURIComponent(extractedUrl);
          }
          if (!extractedUrl.startsWith('http')) {
            extractedUrl = `https://${extractedUrl}`;
          }
          console.log(`🎯 Pattern matched URL: ${extractedUrl}`);
          return extractedUrl;
        }
      }
      
      console.log('⚠️ Could not decode Google News URL');
      return null;
      
    } catch (error) {
      console.error('❌ Error decoding Google News URL:', error.message);
      return null;
    }
  }

  async fetchWithAxios(url) {
    console.log('📡 Fetching with Axios (static content)...');
    try {
      const response = await axios.get(url, {
        timeout: this.options.timeout,
        headers: {
          'User-Agent': this.options.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      return {
        html: response.data,
        url: response.request.res.responseUrl || url
      };
    } catch (error) {
      console.error('❌ Axios fetch failed:', error.message);
      return null;
    }
  }

  async fetchWithPuppeteer(url) {
    console.log('🎭 Fetching with Puppeteer (JavaScript-rendered content)...');
    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      
      // Set user agent and viewport
      await page.setUserAgent(this.options.userAgent);
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Block unnecessary resources for faster loading
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Navigate to the page
      await page.goto(url, { 
        waitUntil: 'networkidle0', 
        timeout: this.options.timeout 
      });

      // Wait for content to load
      try {
        await page.waitForSelector(this.options.waitForSelector, { timeout: 5000 });
      } catch {
        console.log('⚠️ Content selector not found, proceeding anyway...');
      }

      // Get the final URL and HTML
      const finalUrl = page.url();
      const html = await page.content();
      
      await page.close();
      
      return {
        html,
        url: finalUrl
      };
    } catch (error) {
      console.error('❌ Puppeteer fetch failed:', error.message);
      return null;
    }
  }

  extractWithReadability(html, url) {
    console.log('📖 Extracting content with Mozilla Readability...');
    try {
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      
      if (article && article.content) {
        return {
          title: article.title || '',
          content: article.content,
          textContent: article.textContent || '',
          length: article.length || 0,
          excerpt: article.excerpt || '',
          byline: article.byline || '',
          siteName: article.siteName || ''
        };
      }
    } catch (error) {
      console.error('❌ Readability extraction failed:', error.message);
    }
    return null;
  }

  extractWithCheerio(html, url) {
    console.log('🥄 Extracting content with Cheerio...');
    try {
      const $ = cheerio.load(html);
      
      // Remove unwanted elements
      $('script, style, nav, header, footer, aside, .ad, .advertisement, .social-share, .comments').remove();
      
      // Priority selectors for article content
      const contentSelectors = [
        'article',
        '[role="main"]',
        'main',
        '.article-content',
        '.post-content',
        '.entry-content',
        '.story-body',
        '.article-body',
        '.content',
        '.post-body',
        '.story-content'
      ];

      let bestContent = '';
      let bestScore = 0;

      for (const selector of contentSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          const text = element.text().trim();
          const score = this.scoreContent(text);
          
          if (score > bestScore) {
            bestContent = element.html() || '';
            bestScore = score;
            console.log(`✅ Found content using selector: ${selector} (score: ${score})`);
          }
        }
      }

      // Fallback: extract from paragraphs
      if (!bestContent) {
        console.log('🔄 Using paragraph fallback...');
        const paragraphs = $('p').map((i, el) => $(el).text().trim()).get()
          .filter(text => text.length > 50)
          .join('\n\n');
        
        if (paragraphs.length > 200) {
          bestContent = `<div>${$('p').map((i, el) => $.html(el)).get().join('')}</div>`;
        }
      }

      return bestContent;
    } catch (error) {
      console.error('❌ Cheerio extraction failed:', error.message);
      return '';
    }
  }

  scoreContent(text) {
    if (!text) return 0;
    
    let score = text.length * 0.1;
    
    // Bonus for article-like content
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10).length;
    score += sentences * 2;
    
    // Bonus for news indicators
    if (/\b(said|according to|reported|announced|stated)\b/i.test(text)) score += 20;
    if (/\b(today|yesterday|this week|last month|recently)\b/i.test(text)) score += 15;
    
    // Penalty for navigation content
    if (/\b(menu|navigation|subscribe|follow|share|tweet)\b/i.test(text)) score -= 30;
    
    return score;
  }

  extractImages(html, baseUrl) {
    if (!this.options.enableImages) return [];
    
    console.log('🖼️ Extracting images...');
    const $ = cheerio.load(html);
    const images = [];
    
    $('img').each((i, el) => {
      const $img = $(el);
      const src = $img.attr('src');
      const alt = $img.attr('alt') || '';
      const title = $img.attr('title') || '';
      
      if (src && !src.startsWith('data:')) {
        const absoluteSrc = this.makeAbsoluteUrl(src, baseUrl);
        
        // Filter out small images (likely icons/ads)
        const width = parseInt($img.attr('width')) || 0;
        const height = parseInt($img.attr('height')) || 0;
        
        if (width < 100 && height < 100 && (width > 0 || height > 0)) {
          return; // Skip small images
        }
        
        images.push({
          src: absoluteSrc,
          alt,
          title,
          width,
          height
        });
      }
    });
    
    console.log(`📸 Found ${images.length} images`);
    return images;
  }

  async fetchFullContent(url) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 Fetching content from: ${url}`);
    console.log('='.repeat(80));
    
  // Step 1: Resolve Google News URLs if needed
    if (this.isGoogleNewsUrl(url)) {
      const resolvedUrl = await this.resolveGoogleNewsUrl(url);
      if (!resolvedUrl) {
        throw new Error('Google News RSS URLs cannot be directly processed. Please use the actual article URL instead.');
      }
      url = resolvedUrl;
    }
    
    this.currentUrl = url;
    let result = null;

    try {
      // Try static content first (faster)
      result = await this.fetchWithAxios(url);
      
      if (!result) {
        // Fallback to Puppeteer for JavaScript-rendered content
        result = await this.fetchWithPuppeteer(url);
      }
      
      if (!result) {
        throw new Error('Failed to fetch content with both methods');
      }

      const { html, url: finalUrl } = result;
      console.log(`📄 Received HTML content (${html.length} characters)`);
      
      // Extract content using Mozilla Readability (best for articles)
      let extractedData = this.extractWithReadability(html, finalUrl);
      
      if (!extractedData || extractedData.length < 200) {
        console.log('🔄 Readability failed, trying Cheerio...');
        const cheerioContent = this.extractWithCheerio(html, finalUrl);
        
        if (cheerioContent) {
          extractedData = {
            title: '',
            content: cheerioContent,
            textContent: cheerio.load(cheerioContent).text(),
            length: cheerioContent.length,
            excerpt: '',
            byline: '',
            siteName: ''
          };
        }
      }
      
      if (!extractedData || extractedData.length < 100) {
        console.log('❌ No meaningful content could be extracted');
        return {
          success: false,
          content: '',
          markdown: '',
          images: [],
          metadata: {}
        };
      }

      // Convert to markdown
      const markdown = this.turndownService.turndown(extractedData.content);
      
      // Extract images
      const images = this.extractImages(html, finalUrl);
      
      // Prepare metadata
      const metadata = {
        title: extractedData.title,
        excerpt: extractedData.excerpt,
        byline: extractedData.byline,
        siteName: extractedData.siteName,
        url: finalUrl,
        wordCount: extractedData.textContent.split(/\s+/).length,
        characterCount: extractedData.textContent.length,
        readingTime: Math.ceil(extractedData.textContent.split(/\s+/).length / 200) // Assuming 200 WPM
      };

      console.log('✅ Content extraction successful!');
      console.log(`📊 Extracted ${metadata.characterCount} characters, ${metadata.wordCount} words`);
      console.log(`📖 Estimated reading time: ${metadata.readingTime} minutes`);
      console.log(`🖼️ Found ${images.length} images`);

      return {
        success: true,
        content: extractedData.textContent,
        html: extractedData.content,
        markdown,
        images,
        metadata
      };

    } catch (error) {
      console.error('❌ Error during content extraction:', error.message);
      return {
        success: false,
        content: '',
        markdown: '',
        images: [],
        metadata: {},
        error: error.message
      };
    }
  }
}

// Test function
async function testAdvancedFetcher() {
  const fetcher = new AdvancedArticleFetcher({
    enableImages: true,
    enableJavaScript: true
  });

  // Test URLs - using direct article URLs instead of Google News redirects
  const testUrls = [
    'https://www.bbc.com/news', // BBC News homepage
    'https://www.reuters.com/world/', // Reuters world section
    'https://news.google.com/rss/articles/CBMi2wFBVV95cUxPZU5pd0JMMTFIUDBRelI1YzFoOUl6OXpuQ1BxUDR4OGdBQzNwaXNkRksxNHNmM3RvM20yblhIb2JXdTZRWUEtOFYyaDFRUW41QjF4dGFNNlZIZDBGaUJPM2h6cWZhRGdPekFnX1F4bmdlaWRzUWVtNElidV9FTjh6Z0xOeEdCRDlsVHlOaFBmeHR6b1JCdHRGR0RXQlpXLU8ySHpUMV82M0JvbF92dEFIU1NCaEtnMXVnU2c3ZWVqTDkwbGFMcmc1Z2dlUG94U0pwV0N6WnhpWHBqRG_SAeIBQVVfeXFMTjh3Z0NJaERESTV0Y0I3TWw2T1RQYlg5UVpZazVIQTBIOEZKTnhqaHRTNTAxcjI3ZGFtOGdtYzY2X0ZwWVVCc2Y0SVl0YlF3LWsyaWI5cEpYbDNkZEZuTnVZZWQzM3BFX2pxQko0ZEFybWZBdndlSlY1Z19rSllaN0lfQXVyNWY3UU5zbnlod2JaaF9TWm9qZXpQT2YxYlBxU2dGT2pCT1Nhby1KR1VFU2lXd2NNY0xuV012Q21OQUlTWUxJM1p6d3pEVHlwbHNETmdPaWlrTWRKSXpmZkpvVDJ6Zw?oc=5' // Google News RSS URL to test resolution
  ];

  try {
    for (const url of testUrls) {
      const result = await fetcher.fetchFullContent(url);
      
      console.log('\n=== EXTRACTION RESULTS ===');
      console.log(`✅ Success: ${result.success}`);
      
      if (result.success) {
        console.log(`📝 Content: ${result.content.substring(0, 200)}...`);
        console.log(`📄 Markdown: ${result.markdown.substring(0, 200)}...`);
        console.log(`🖼️ Images: ${result.images.length}`);
        console.log(`📊 Metadata:`, result.metadata);
      } else {
        console.log(`❌ Error: ${result.error}`);
      }
      
      console.log('\n' + '='.repeat(80));
    }
  } finally {
    await fetcher.closeBrowser();
  }
}

// Export for use in other modules
module.exports = { AdvancedArticleFetcher };

// Run test if this file is executed directly
if (require.main === module) {
  testAdvancedFetcher().catch(console.error);
}
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
  description?: string;
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
  tags?: string[];
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
    const feedUrls = {
      Politics: `${this.baseUrl}/search?q=politics+government+election&hl=en-US&gl=US&ceid=US:en`,
      Economy: `${this.baseUrl}/search?q=economy+business+finance+market&hl=en-US&gl=US&ceid=US:en`,
      World: `${this.baseUrl}/search?q=world+international+global&hl=en-US&gl=US&ceid=US:en`,
      Security: `${this.baseUrl}/search?q=security+defense+military+terrorism&hl=en-US&gl=US&ceid=US:en`,
      Law: `${this.baseUrl}/search?q=law+legal+court+justice&hl=en-US&gl=US&ceid=US:en`,
      Science: `${this.baseUrl}/search?q=science+research+technology&hl=en-US&gl=US&ceid=US:en`,
      Society: `${this.baseUrl}/search?q=society+social+community+culture&hl=en-US&gl=US&ceid=US:en`,
      Culture: `${this.baseUrl}/search?q=culture+arts+entertainment+music&hl=en-US&gl=US&ceid=US:en`,
      Sport: `${this.baseUrl}/search?q=sports+football+basketball+soccer+cricket&hl=en-US&gl=US&ceid=US:en`
    };

    return feedUrls;
  }

  /**
   * Fetch and parse RSS feed from Google News
   */
  async fetchFeed(category: string = 'World'): Promise<GoogleNewsItem[]> {
    const feedUrls = this.getFeedUrls();
    
    const feedUrl = feedUrls[category] || feedUrls['World'];

    try {
      strapi.log.info(`Fetching Google News feed for category: ${category}`);
      
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
      
      strapi.log.info(`Filtered ${allItems.length - qualityItems.length} low-quality items from ${allItems.length} total items for category: ${category}`);
      
      return qualityItems;
    } catch (error) {
      strapi.log.error('Error fetching Google News feed:', error);
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
            strapi.log.debug(`Found image URL: ${imageUrl}`);
            return imageUrl;
          }
        }
      }

      // If no image found in content, return null to skip image upload
      // This avoids network issues with external placeholder services
      strapi.log.debug(`No image found in content for article: ${title}, skipping image`);
      return null;
    } catch (error) {
      strapi.log.warn('Error extracting image URL:', error);
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
   * Fetch full article content from source URL
   */
  private async fetchFullContent(sourceUrl: string): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(sourceUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      
      // Extract main content using common article selectors with improved regex
      const contentSelectors = [
        { selector: 'article', regex: /<article[^>]*>(.*?)<\/article>/gis },
        { selector: '[role="main"]', regex: /<[^>]*role\s*=\s*["\']main["\'][^>]*>(.*?)<\/[^>]*>/gis },
        { selector: '.article-content', regex: /<[^>]*class[^>]*article-content[^>]*>(.*?)<\/[^>]*>/gis },
        { selector: '.post-content', regex: /<[^>]*class[^>]*post-content[^>]*>(.*?)<\/[^>]*>/gis },
        { selector: '.entry-content', regex: /<[^>]*class[^>]*entry-content[^>]*>(.*?)<\/[^>]*>/gis },
        { selector: '.content', regex: /<[^>]*class[^>]*\bcontent\b[^>]*>(.*?)<\/[^>]*>/gis },
        { selector: '.story-body', regex: /<[^>]*class[^>]*story-body[^>]*>(.*?)<\/[^>]*>/gis },
        { selector: '.article-body', regex: /<[^>]*class[^>]*article-body[^>]*>(.*?)<\/[^>]*>/gis },
        { selector: 'main', regex: /<main[^>]*>(.*?)<\/main>/gis },
        { selector: '#content', regex: /<[^>]*id\s*=\s*["\']content["\'][^>]*>(.*?)<\/[^>]*>/gis },
        { selector: '.main-content', regex: /<[^>]*class[^>]*main-content[^>]*>(.*?)<\/[^>]*>/gis }
      ];

      // Extract content with improved parsing
      let extractedContent = '';
      for (const { selector, regex } of contentSelectors) {
        const matches = html.match(regex);
        if (matches && matches.length > 0) {
          // Get the longest match (most likely to be the main content)
          extractedContent = matches.reduce((longest, current) => 
            current.length > longest.length ? current : longest, '');
          
          // Extract the content part (remove the outer tags)
          const contentMatch = extractedContent.match(/>([^]*)<\/[^>]*>$/);
          if (contentMatch && contentMatch[1]) {
            extractedContent = contentMatch[1];
            
            // Ensure paragraph structure is preserved
            extractedContent = extractedContent
              .replace(/<\/p>\s*<p[^>]*>/gi, '</p>\n\n<p>') // Add line breaks between paragraphs
              .replace(/<\/h[1-6]>\s*<p[^>]*>/gi, (match) => match.replace(/>\s*</, '>\n\n<')) // Add breaks after headings
              .replace(/<\/div>\s*<div[^>]*>/gi, '</div>\n<div>'); // Add breaks between divs
            
            break;
          }
        }
      }

      // If no specific content found, extract from body but filter out navigation/footer
      if (!extractedContent) {
        const bodyMatch = html.match(/<body[^>]*>(.*?)<\/body>/gis);
        if (bodyMatch && bodyMatch[1]) {
          extractedContent = bodyMatch[1]
            .replace(/<nav[^>]*>.*?<\/nav>/gis, '')
            .replace(/<header[^>]*>.*?<\/header>/gis, '')
            .replace(/<footer[^>]*>.*?<\/footer>/gis, '')
            .replace(/<aside[^>]*>.*?<\/aside>/gis, '')
            .replace(/<div[^>]*class[^>]*(?:sidebar|menu|navigation)[^>]*>.*?<\/div>/gis, '');
        }
      }

      // Clean up the extracted content but preserve images
      if (extractedContent) {
        extractedContent = this.cleanExtractedContent(extractedContent);
      }

      return extractedContent || '';
    } catch (error) {
      strapi.log.warn(`Failed to fetch full content from ${sourceUrl}: ${error.message}`);
      return '';
    }
  }

  /**
   * Clean extracted content while preserving images and important formatting
   */
  private cleanExtractedContent(content: string): string {
    if (!content) return '';

    let cleanedContent = content;

    // Remove script and style tags
    cleanedContent = cleanedContent.replace(/<script[^>]*>.*?<\/script>/gis, '');
    cleanedContent = cleanedContent.replace(/<style[^>]*>.*?<\/style>/gis, '');
    
    // Remove ads and social media embeds
    cleanedContent = cleanedContent.replace(/<[^>]*class[^>]*(?:ad|advertisement|social|share|comment)[^>]*>.*?<\/[^>]*>/gis, '');
    
    // Remove navigation elements
    cleanedContent = cleanedContent.replace(/<nav[^>]*>.*?<\/nav>/gis, '');
    cleanedContent = cleanedContent.replace(/<[^>]*class[^>]*(?:nav|menu|breadcrumb)[^>]*>.*?<\/[^>]*>/gis, '');
    
    // Remove footer and sidebar content
    cleanedContent = cleanedContent.replace(/<footer[^>]*>.*?<\/footer>/gis, '');
    cleanedContent = cleanedContent.replace(/<aside[^>]*>.*?<\/aside>/gis, '');
    cleanedContent = cleanedContent.replace(/<[^>]*class[^>]*(?:sidebar|footer)[^>]*>.*?<\/[^>]*>/gis, '');

    // Preserve images but ensure they have proper attributes
    cleanedContent = cleanedContent.replace(/<img([^>]*)>/gi, (match, attributes) => {
      // Ensure images have alt text
      if (!attributes.includes('alt=')) {
        attributes += ' alt="Article image"';
      }
      // Ensure images have proper styling
      if (!attributes.includes('style=') && !attributes.includes('class=')) {
        attributes += ' style="max-width: 100%; height: auto; margin: 10px 0;"';
      }
      return `<img${attributes}>`;
    });

    // Clean up excessive whitespace but preserve line breaks and paragraph structure
    cleanedContent = cleanedContent
      .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
      .replace(/\n\s*\n\s*\n+/g, '\n\n') // Replace multiple newlines with double newline
      .replace(/^\s+|\s+$/g, '') // Trim start and end
      .trim();
    
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
      strapi.log.debug(`Excluding PDF content: ${item.title}`);
      return false;
    }
    
    // Exclude very short titles (likely not substantial articles)
    if (title.length < 20) {
      strapi.log.debug(`Excluding short title: ${item.title}`);
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
        strapi.log.debug(`Excluding low-quality content (${indicator}): ${item.title}`);
        return false;
      }
    }
    
    // Exclude articles with very short descriptions
    if (description && description.length < 50) {
      strapi.log.debug(`Excluding article with short description: ${item.title}`);
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
        strapi.log.debug(`Excluding social media content: ${item.title}`);
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
       const cleanNoun = noun.trim();
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
         let existingTags = await strapi.entityService.findMany('api::tag.tag', {
           filters: { name: tagName },
           limit: 1
         }) as any[];

         let tag: any;
         if (!existingTags || existingTags.length === 0) {
           // Create new tag
           const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
           tag = await strapi.entityService.create('api::tag.tag', {
             data: {
               name: tagName,
               slug: slug,
               description: `Articles tagged with ${tagName}`
             }
           });
           strapi.log.debug(`Created new tag: ${tagName}`);
         } else {
           tag = existingTags[0];
         }

         if (tag && tag.id) {
           tagIds.push(tag.id);
         }
       } catch (error) {
         strapi.log.warn(`Failed to create/get tag ${tagName}: ${error.message}`);
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

    // Remove unwanted elements but preserve structure
    formattedContent = formattedContent
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>.*?<\/style>/gi, '') // Remove styles
      .replace(/<noscript[^>]*>.*?<\/noscript>/gi, '') // Remove noscript
      .replace(/<!--.*?-->/gs, '') // Remove comments
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframes
      .replace(/<embed[^>]*>.*?<\/embed>/gi, '') // Remove embeds
      .replace(/<object[^>]*>.*?<\/object>/gi, '') // Remove objects
      .trim();

    if (preserveHtml) {
      // Clean up HTML but preserve and enhance formatting tags
      formattedContent = formattedContent
        .replace(/<div[^>]*>/gi, '<p>') // Convert divs to paragraphs
        .replace(/<\/div>/gi, '</p>')
        .replace(/<span[^>]*>/gi, '') // Remove span tags but keep content
        .replace(/<\/span>/gi, '')
        .replace(/<br\s*\/?>/gi, '</p><p>') // Convert breaks to paragraph breaks
        .replace(/<p>\s*<\/p>/gi, '') // Remove empty paragraphs
        .replace(/[ \t]+/g, ' ') // Normalize spaces and tabs only
        .replace(/\n\s*\n\s*\n+/g, '\n\n') // Clean up excessive newlines
        .trim();

      // Enhance content with rich text formatting
      formattedContent = this.enhanceContentWithRichText(formattedContent);

      // Ensure proper paragraph structure
      if (!formattedContent.startsWith('<p>') && !formattedContent.startsWith('<h')) {
        formattedContent = '<p>' + formattedContent;
      }
      if (!formattedContent.endsWith('</p>') && !formattedContent.endsWith('</blockquote>') && !formattedContent.endsWith('</ul>') && !formattedContent.endsWith('</ol>')) {
        formattedContent = formattedContent + '</p>';
      }

      return formattedContent;
    } else {
      // Remove all HTML tags for plain text processing
      formattedContent = formattedContent
        .replace(/<[^>]+>/g, ' ') // Remove HTML tags
        .replace(/[ \t]+/g, ' ') // Normalize spaces and tabs only
        .replace(/\n\s*\n\s*\n+/g, '\n\n') // Clean up excessive newlines
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
   * Generate URL-friendly slug from title with unique timestamp
   */
  private generateSlug(title: string): string {
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    
    if (!title || title.trim().length === 0) {
      return `article-${timestamp}`;
    }

    let slug = title
      .toLowerCase()
      .trim()
      // Replace spaces and special characters with hyphens
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
      // Ensure it's not too long (reasonable limit for URLs, leaving space for timestamp)
      .substring(0, 80);

    // If slug is empty or too short, create a fallback
    if (!slug || slug.length < 3) {
      slug = `article-${timestamp}`;
    } else {
      // Append unique timestamp to ensure uniqueness
      slug = `${slug}-${timestamp}`;
    }

    return slug;
  }

  /**
   * Transform Google News item to Strapi article format
   */
  private async transformToArticle(item: GoogleNewsItem, category: string = ''): Promise<ParsedNewsItem> {
    // Clean title by removing publisher names
    const originalTitle = item.title || '';
    const cleanedTitle = this.cleanTitle(originalTitle);
    const title = cleanedTitle.substring(0, 200); // Content model limit: 200
    
    // Log for debugging
    strapi.log.debug(`Title processing: "${originalTitle}" -> "${cleanedTitle}" -> "${title}"`);
    
    // Generate slug manually since auto-generation isn't working
    const slug = this.generateSlug(title);
    
    // Try to fetch full content from source URL first
    let rawContent = item.content || item.contentSnippet || '';
    let fullContent = '';
    
    try {
      fullContent = await this.fetchFullContent(item.link);
      strapi.log.debug(`Fetched full content length: ${fullContent.length} characters for: ${title}`);
    } catch (error) {
      strapi.log.warn(`Failed to fetch full content for ${title}: ${error.message}`);
    }

    // Use full content if available and substantial, otherwise fall back to RSS content
    const contentToProcess = (fullContent && fullContent.length > rawContent.length * 2) ? fullContent : rawContent;
    
    const formattedContent = this.formatContent(contentToProcess, true); // Preserve HTML
    // Also clean content to remove publisher names
    const cleanedContent = this.removePublisherFromContent(formattedContent);

    // Extract images from the full content
    const contentImages = this.extractImagesFromContent(fullContent || rawContent);
    strapi.log.debug(`Extracted ${contentImages.length} images from content for: ${title}`);

    // Use RSS content snippet as excerpt (clean and limit to 300 chars)
    const rssSnippet = item.contentSnippet || item.content || '';
    const cleanSnippet = rssSnippet.replace(/<[^>]+>/g, '').trim();
    const excerpt = this.cleanHtmlEntities(cleanSnippet).substring(0, 300); // Content model limit: 300
    const location = this.extractLocation(rawContent);
    
    // Ensure sourceUrl is valid and within limits
    let sourceUrl = '';
    if (item.link && typeof item.link === 'string' && item.link.trim()) {
      sourceUrl = item.link.trim().substring(0, 490); // Leave some buffer under 500 limit
    } else {
      strapi.log.warn(`Invalid or missing link for article: ${title}`);
      sourceUrl = `https://news.google.com/search?q=${encodeURIComponent(title.substring(0, 50))}`;
    }

    // Extract image URL - prioritize images from content, then fallback to original method
    let imageUrl = '';
    if (contentImages.length > 0) {
      // Use the first high-quality image from content
      imageUrl = contentImages[0];
      strapi.log.debug(`Using content image: ${imageUrl} for article: ${title}`);
    } else {
      // Fallback to original image extraction method
      imageUrl = await this.extractImageUrl(rawContent, title);
    }

    // Extract tags from title and content
    const extractedTags = this.extractTags(title, cleanedContent, category);
    strapi.log.debug(`Extracted ${extractedTags.length} tags for article: ${title}`, extractedTags);

    return {
      title,
      slug, // Manual slug generation
      excerpt,
      content: cleanedContent, // No length limit in content model (richtext)
      publishedDate: new Date(item.pubDate).toISOString(),
      sourceUrl,
      location: location.substring(0, 100), // Content model limit: 100
      readTime: this.calculateReadTime(cleanedContent),
      seoTitle: title.substring(0, 60), // Content model limit: 60
      seoDescription: excerpt.substring(0, 160), // Content model limit: 160
      isBreaking: this.isBreakingNews(title, rawContent, category),
      imageUrl,
      tags: extractedTags
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
   * Get or create default author and specific category
   */
  async getAuthorAndCategory(categoryName: string = 'News') {
    try {
      // Get or create default author
      let authors = await strapi.entityService.findMany('api::author.author', {
        filters: { name: 'Google News Bot' },
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

      // Get or create specific category
      let categories = await strapi.entityService.findMany('api::category.category', {
        filters: { name: categoryName },
        limit: 1
      }) as any[];

      let category: any;
      if (!categories || categories.length === 0) {
        // Create category with proper slug
        const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        category = await strapi.entityService.create('api::category.category', {
          data: {
            name: categoryName,
            slug: slug,
            description: `${categoryName} news articles`
          }
        });
        strapi.log.info(`Created new category: ${categoryName}`);
      } else {
        category = categories[0];
      }

      return { author, category };
    } catch (error) {
      strapi.log.error('Error getting author and category:', error);
      throw error;
    }
  }

  /**
   * Upload image from URL to Strapi media library with fallback options
   */
  private async uploadImageFromUrl(imageUrl: string, title: string): Promise<any> {
    const searchTerm = this.extractKeywordsForImage(title);
    
    // Define fallback image URLs
    const imageUrls = [
      imageUrl, // Original URL (likely Unsplash)
      `https://picsum.photos/800/600?random=${Date.now()}`, // Lorem Picsum
      `https://via.placeholder.com/800x600/0066cc/ffffff?text=${encodeURIComponent(searchTerm.substring(0, 20))}` // Placeholder.com
    ];

    for (let i = 0; i < imageUrls.length; i++) {
      const currentUrl = imageUrls[i];
      try {
        strapi.log.debug(`Attempting to upload image from URL (attempt ${i + 1}): ${currentUrl}`);
        
        // Download the image with better error handling
        const response = await axios.get(currentUrl, {
          responseType: 'arraybuffer',
          timeout: 15000, // Increased timeout
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/*,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache'
          },
          maxRedirects: 5,
          validateStatus: (status) => status >= 200 && status < 400
        });

        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Validate response data
        if (!response.data || response.data.byteLength === 0) {
          throw new Error('Empty response data');
        }

        // Create a buffer from the response
        const buffer = Buffer.from(response.data);
        
        // Validate buffer size (minimum 1KB, maximum 10MB)
        if (buffer.length < 1024) {
          throw new Error('Image too small (less than 1KB)');
        }
        if (buffer.length > 10 * 1024 * 1024) {
          throw new Error('Image too large (more than 10MB)');
        }
        
        // Extract filename from URL or create one
        const urlParts = currentUrl.split('/');
        const filename = urlParts[urlParts.length - 1] || `article-${Date.now()}.jpg`;
        const cleanFilename = filename.split('?')[0] || `article-${Date.now()}.jpg`;
        
        // Ensure proper extension based on content type
        const contentType = response.headers['content-type'] || 'image/jpeg';
        let extension = '.jpg';
        if (contentType.includes('png')) extension = '.png';
        else if (contentType.includes('gif')) extension = '.gif';
        else if (contentType.includes('webp')) extension = '.webp';
        
        const finalFilename = cleanFilename.includes('.') ? cleanFilename : `${cleanFilename}${extension}`;
        
        // Create file object in the correct format for Strapi v4
        const fileData = {
          name: finalFilename,
          type: contentType,
          size: buffer.length,
          buffer: buffer,
          path: finalFilename
        };

        // Upload to Strapi using the correct v4 upload service API
        const uploadResponse = await strapi.plugins.upload.services.upload.upload({
          data: {
            fileInfo: {
              name: finalFilename,
              alternativeText: title.substring(0, 100),
              caption: title.substring(0, 200)
            }
          },
          files: [fileData]  // Must be an array in Strapi v4
        });

        if (uploadResponse && (Array.isArray(uploadResponse) ? uploadResponse.length > 0 : uploadResponse.id)) {
          const uploadedFile = Array.isArray(uploadResponse) ? uploadResponse[0] : uploadResponse;
          strapi.log.info(`Successfully uploaded image: ${finalFilename} (${buffer.length} bytes) from ${currentUrl}`);
          return uploadedFile;
        } else {
          throw new Error('Upload service returned empty response');
        }
      } catch (error) {
        const errorMessage = error.response ? 
          `HTTP ${error.response.status}: ${error.response.statusText}` : 
          error.message;
        strapi.log.warn(`Failed to upload image from URL: ${currentUrl} - ${errorMessage}`);
        
        if (i === imageUrls.length - 1) {
          strapi.log.error(`All image upload attempts failed for article: ${title}`);
        }
      }
    }

    return null;
  }

  /**
   * Create article in Strapi
   */
  async createArticle(articleData: ParsedNewsItem, categoryName: string = 'News'): Promise<any> {
    try {
      const { author, category } = await this.getAuthorAndCategory(categoryName);

      let featuredImage = null;
      
      // Try to upload the image if we have an imageUrl, but don't fail article creation if it fails
      if (articleData.imageUrl) {
        try {
          featuredImage = await this.uploadImageFromUrl(articleData.imageUrl, articleData.title);
          if (!featuredImage) {
            strapi.log.warn(`Image upload failed for article: ${articleData.title}, proceeding without image`);
          }
        } catch (error) {
          strapi.log.warn(`Image upload error for article: ${articleData.title}, proceeding without image: ${error.message}`);
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
        publishedAt: new Date(),
        featuredImage: featuredImage?.id || null,
        imageAlt: articleData.title.substring(0, 200) // Content model limit: 200
      };

      const article = await strapi.entityService.create('api::article.article', {
        data: articleWithSource,
        populate: ['author', 'category', 'featuredImage']
      });

      // Handle tags separately after article creation using relation service
      if (articleData.tags && articleData.tags.length > 0) {
        const tagIds = await this.getOrCreateTags(articleData.tags);
        if (tagIds.length > 0) {
          try {
            // Use the relation service to connect tags
            await strapi.db.query('api::article.article').update({
              where: { id: article.id },
              data: {
                tags: tagIds
              }
            });
            strapi.log.debug(`Associated ${tagIds.length} tags with article: ${articleData.title}`);
          } catch (tagError) {
            strapi.log.warn(`Failed to associate tags with article: ${tagError.message}`);
          }
        }
      }

      strapi.log.info(`Article created successfully: ${article.title}${featuredImage ? ' with image' : ''}`);
      return article;
    } catch (error) {
      strapi.log.error(`Error creating article: ${error.message}`);
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

    strapi.log.info(`Starting Google News import for categories: ${categories.join(', ')}`);

    for (const category of categories) {
      try {
        const newsItems = await this.fetchFeed(category);
        const limitedItems = newsItems.slice(0, maxArticlesPerCategory);

        strapi.log.info(`Found ${newsItems.length} items, processing ${limitedItems.length} for category: ${category}`);

        for (const item of limitedItems) {
          try {
            // Validate required fields
            if (!item.title || !item.link) {
              strapi.log.warn(`Skipping item with missing title or link: ${JSON.stringify(item)}`);
              skipped++;
              continue;
            }

            // Check if article already exists
            const exists = await this.articleExists(item.link);
            if (exists) {
              strapi.log.debug(`Article already exists, skipping: ${item.title}`);
              skipped++;
              continue;
            }

            // Transform article data with error handling
            let articleData: ParsedNewsItem;
            try {
              articleData = await this.transformToArticle(item, category);
            } catch (transformError) {
              strapi.log.error(`Error transforming article: ${item.title}`, transformError);
              errors++;
              continue;
            }

            // Validate transformed data
            if (!articleData.title || articleData.title.trim().length === 0) {
              strapi.log.warn(`Skipping article with empty title after transformation: ${item.title}`);
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
                strapi.log.info(`Successfully created article: ${articleData.title} in category: ${category}`);
                imported++;
                articleCreated = true;
              } catch (createError) {
                createAttempts++;
                strapi.log.warn(`Attempt ${createAttempts} failed for article: ${articleData.title}`, createError);
                
                if (createAttempts >= maxAttempts) {
                  strapi.log.error(`Failed to create article after ${maxAttempts} attempts: ${articleData.title}`, createError);
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
            strapi.log.error(`Unexpected error processing article: ${item.title || 'Unknown title'}`, error);
            errors++;
            
            // Continue processing other articles even if one fails
            continue;
          }
        }

        strapi.log.info(`Completed processing category: ${category}. Imported: ${imported}, Skipped: ${skipped}, Errors: ${errors}`);

      } catch (categoryError) {
        strapi.log.error(`Error processing category ${category}:`, categoryError);
        errors++;
        
        // Continue with next category even if current one fails
        continue;
      }
    }

    const result = { imported, skipped, errors };
    strapi.log.info('Google News import completed:', result);
    return result;
  }
}

export default GoogleNewsFeedService;
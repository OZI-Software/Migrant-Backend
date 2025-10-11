import axios from 'axios';
import sharp from 'sharp';
import { URL } from 'url';

interface ImageMetadata {
  url: string;
  width: number;
  height: number;
  format: string;
  size: number;
  aspectRatio: number;
  quality: 'high' | 'medium' | 'low';
  isValid: boolean;
  alt?: string;
  title?: string;
}

interface OptimizedImage {
  originalUrl: string;
  optimizedUrl?: string;
  metadata: ImageMetadata;
  thumbnailUrl?: string;
  webpUrl?: string;
}

export class ImageOptimizer {
  private readonly maxImageSize = 10 * 1024 * 1024; // 10MB
  private readonly minWidth = 300;
  private readonly minHeight = 200;
  private readonly preferredAspectRatio = 16 / 9;
  private strapi: any;

  constructor(strapiInstance?: any) {
    // Set strapi instance - use provided instance or global strapi
    this.strapi = strapiInstance || (global as any).strapi;
  }

  /**
   * Analyze and optimize images from article content
   */
  async optimizeImages(imageUrls: string[], articleContent?: string): Promise<OptimizedImage[]> {
    const optimizedImages: OptimizedImage[] = [];

    for (const url of imageUrls) {
      try {
        const metadata = await this.analyzeImage(url, articleContent);
        
        if (metadata.isValid) {
          const optimized: OptimizedImage = {
            originalUrl: url,
            metadata
          };

          // Generate optimized versions if the image is high quality
          if (metadata.quality === 'high') {
            optimized.thumbnailUrl = await this.generateThumbnail(url);
            optimized.webpUrl = await this.convertToWebP(url);
          }

          optimizedImages.push(optimized);
        }
      } catch (error) {
        this.strapi.log.warn(`Failed to optimize image ${url}: ${error.message}`);
      }
    }

    // Sort by quality and relevance
    return this.sortImagesByQuality(optimizedImages);
  }

  /**
   * Analyze image metadata and quality
   */
  private async analyzeImage(url: string, articleContent?: string): Promise<ImageMetadata> {
    try {
      // Validate URL
      if (!this.isValidImageUrl(url)) {
        return this.createInvalidMetadata(url, 'Invalid URL');
      }

      // Fetch image headers to get basic info
      const headResponse = await axios.head(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const contentType = headResponse.headers['content-type'];
      const contentLength = parseInt(headResponse.headers['content-length'] || '0');

      if (!contentType || !contentType.startsWith('image/')) {
        return this.createInvalidMetadata(url, 'Not an image');
      }

      if (contentLength > this.maxImageSize) {
        return this.createInvalidMetadata(url, 'Image too large');
      }

      // Fetch image data for detailed analysis
      const imageResponse = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const imageBuffer = Buffer.from(imageResponse.data);
      const imageInfo = await sharp(imageBuffer).metadata();

      const width = imageInfo.width || 0;
      const height = imageInfo.height || 0;
      const format = imageInfo.format || 'unknown';
      const aspectRatio = width > 0 && height > 0 ? width / height : 0;

      // Extract alt text and title from article content
      const { alt, title } = this.extractImageContext(url, articleContent);

      // Determine quality
      const quality = this.assessImageQuality(width, height, contentLength, aspectRatio, format);

      return {
        url,
        width,
        height,
        format,
        size: contentLength,
        aspectRatio,
        quality,
        isValid: quality !== 'low' && width >= this.minWidth && height >= this.minHeight,
        alt,
        title
      };

    } catch (error) {
      this.strapi.log.warn(`Failed to analyze image ${url}: ${error.message}`);
      return this.createInvalidMetadata(url, error.message);
    }
  }

  /**
   * Assess image quality based on various factors
   */
  private assessImageQuality(
    width: number, 
    height: number, 
    size: number, 
    aspectRatio: number, 
    format: string
  ): 'high' | 'medium' | 'low' {
    let score = 0;

    // Size scoring
    if (width >= 800 && height >= 600) score += 3;
    else if (width >= 600 && height >= 400) score += 2;
    else if (width >= 400 && height >= 300) score += 1;

    // Aspect ratio scoring (prefer landscape images for articles)
    const aspectDiff = Math.abs(aspectRatio - this.preferredAspectRatio);
    if (aspectDiff < 0.2) score += 2;
    else if (aspectDiff < 0.5) score += 1;

    // Format scoring
    if (format === 'jpeg' || format === 'jpg' || format === 'webp') score += 2;
    else if (format === 'png') score += 1;

    // File size scoring (not too small, not too large)
    if (size > 50000 && size < 2000000) score += 2; // 50KB - 2MB
    else if (size > 20000 && size < 5000000) score += 1; // 20KB - 5MB

    // Determine quality
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  /**
   * Extract image context (alt text, title) from article content
   */
  private extractImageContext(imageUrl: string, articleContent?: string): { alt?: string; title?: string } {
    if (!articleContent) return {};

    try {
      // Extract filename for context
      const urlObj = new URL(imageUrl);
      const filename = urlObj.pathname.split('/').pop() || '';
      const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '');

      // Look for img tags with this URL
      const imgRegex = new RegExp(`<img[^>]*src\\s*=\\s*["\']${imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["\'][^>]*>`, 'gi');
      const match = articleContent.match(imgRegex);

      if (match && match[0]) {
        const imgTag = match[0];
        
        // Extract alt text
        const altMatch = imgTag.match(/alt\s*=\s*["\']([^"\']*)["\']/i);
        const alt = altMatch ? altMatch[1] : undefined;

        // Extract title
        const titleMatch = imgTag.match(/title\s*=\s*["\']([^"\']*)["\']/i);
        const title = titleMatch ? titleMatch[1] : undefined;

        return { alt, title };
      }

      // Fallback: use filename as context
      if (filenameWithoutExt && filenameWithoutExt.length > 3) {
        const contextualAlt = filenameWithoutExt
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        
        return { alt: contextualAlt };
      }

      return {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Generate thumbnail version of image
   */
  private async generateThumbnail(imageUrl: string): Promise<string | undefined> {
    try {
      // For now, return the original URL
      // In a production environment, you would:
      // 1. Download the image
      // 2. Resize it to thumbnail size (e.g., 300x200)
      // 3. Upload to your CDN/storage
      // 4. Return the new URL
      
      return imageUrl; // Placeholder
    } catch (error) {
      this.strapi.log.warn(`Failed to generate thumbnail for ${imageUrl}: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Convert image to WebP format
   */
  private async convertToWebP(imageUrl: string): Promise<string | undefined> {
    try {
      // For now, return the original URL
      // In a production environment, you would:
      // 1. Download the image
      // 2. Convert to WebP format
      // 3. Upload to your CDN/storage
      // 4. Return the new URL
      
      return imageUrl; // Placeholder
    } catch (error) {
      this.strapi.log.warn(`Failed to convert to WebP ${imageUrl}: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Sort images by quality and relevance
   */
  private sortImagesByQuality(images: OptimizedImage[]): OptimizedImage[] {
    return images.sort((a, b) => {
      // First, sort by quality
      const qualityOrder = { high: 3, medium: 2, low: 1 };
      const qualityDiff = qualityOrder[b.metadata.quality] - qualityOrder[a.metadata.quality];
      
      if (qualityDiff !== 0) return qualityDiff;

      // Then by size (larger is better for high-quality images)
      const sizeDiff = (b.metadata.width * b.metadata.height) - (a.metadata.width * a.metadata.height);
      
      if (sizeDiff !== 0) return sizeDiff;

      // Finally by aspect ratio preference
      const aAspectDiff = Math.abs(a.metadata.aspectRatio - this.preferredAspectRatio);
      const bAspectDiff = Math.abs(b.metadata.aspectRatio - this.preferredAspectRatio);
      
      return aAspectDiff - bAspectDiff;
    });
  }

  /**
   * Validate image URL
   */
  private isValidImageUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      // Check for common image extensions
      const pathname = urlObj.pathname.toLowerCase();
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
      const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));

      // Check for image-related query parameters
      const hasImageParams = url.includes('format=') || url.includes('type=image');

      return hasImageExtension || hasImageParams || pathname.includes('/image/');
    } catch (error) {
      return false;
    }
  }

  /**
   * Create invalid metadata object
   */
  private createInvalidMetadata(url: string, reason: string): ImageMetadata {
    return {
      url,
      width: 0,
      height: 0,
      format: 'unknown',
      size: 0,
      aspectRatio: 0,
      quality: 'low',
      isValid: false
    };
  }

  /**
   * Get the best image from a list of optimized images
   */
  getBestImage(images: OptimizedImage[]): OptimizedImage | null {
    const validImages = images.filter(img => img.metadata.isValid);
    
    if (validImages.length === 0) return null;

    // Return the first image (already sorted by quality)
    return validImages[0];
  }

  /**
   * Get images suitable for different use cases
   */
  getImagesByUseCase(images: OptimizedImage[]): {
    hero: OptimizedImage | null;
    thumbnail: OptimizedImage | null;
    gallery: OptimizedImage[];
  } {
    const validImages = images.filter(img => img.metadata.isValid);
    
    // Hero image: largest, high quality, good aspect ratio
    const heroImage = validImages.find(img => 
      img.metadata.quality === 'high' && 
      img.metadata.width >= 800 && 
      img.metadata.aspectRatio > 1.2
    ) || validImages[0] || null;

    // Thumbnail: smaller, square-ish aspect ratio preferred
    const thumbnailImage = validImages.find(img => 
      img.metadata.width >= 300 && 
      img.metadata.aspectRatio >= 0.8 && 
      img.metadata.aspectRatio <= 1.5
    ) || validImages[0] || null;

    // Gallery: all high and medium quality images
    const galleryImages = validImages.filter(img => 
      img.metadata.quality !== 'low'
    ).slice(0, 10); // Limit to 10 images

    return {
      hero: heroImage,
      thumbnail: thumbnailImage,
      gallery: galleryImages
    };
  }
}

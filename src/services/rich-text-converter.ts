/**
 * Enhanced Rich Text to HTML Converter
 * Converts Strapi's rich text format to HTML with support for AI-generated content
 */

interface RichTextNode {
  type: string;
  children?: RichTextNode[];
  text?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  url?: string;
  level?: number;
  format?: string;
  alt?: string;
  [key: string]: any;
}

class RichTextConverter {
  /**
   * Convert rich text content to HTML with enhanced support for AI-generated content
   */
  convertToHTML(richText: any): string {
    try {
      // Handle direct HTML strings (from AI extraction)
      if (typeof richText === 'string') {
        return this.sanitizeAndValidateHTML(richText);
      }
      
      if (!richText || typeof richText !== 'object') {
        return '';
      }
      
      // Handle Strapi's rich text format
      if (Array.isArray(richText)) {
        return richText.map(node => this.convertNode(node)).join('');
      }
      
      // Handle single node
      if (richText.type) {
        return this.convertNode(richText);
      }
      
      // Fallback for unknown formats
      return this.sanitizeAndValidateHTML(richText.toString() || '');
    } catch (error) {
      console.error('Rich text conversion error:', error);
      return typeof richText === 'string' ? richText : '';
    }
  }

  /**
   * Sanitize and validate HTML content from AI extraction
   */
  private sanitizeAndValidateHTML(html: string): string {
    if (!html || typeof html !== 'string') {
      return '';
    }

    // Basic HTML validation and cleanup
    let cleanHtml = html
      .replace(/\n\s*\n/g, '\n') // Remove excessive line breaks
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Ensure proper paragraph wrapping for plain text
    if (!cleanHtml.includes('<') && cleanHtml.length > 0) {
      cleanHtml = `<p>${cleanHtml}</p>`;
    }

    return cleanHtml;
  }
  
  private convertNode(node: RichTextNode): string {
    if (!node) return '';
    
    // Handle text nodes with enhanced formatting support
    if (node.text !== undefined) {
      let text = this.escapeHtml(node.text);
      
      // Apply formatting in proper order
      if (node.code) text = `<code>${text}</code>`;
      if (node.bold) text = `<strong>${text}</strong>`;
      if (node.italic) text = `<em>${text}</em>`;
      if (node.underline) text = `<u>${text}</u>`;
      if (node.strikethrough) text = `<s>${text}</s>`;
      
      return text;
    }
    
    // Handle element nodes
    const children = node.children ? node.children.map(child => this.convertNode(child)).join('') : '';
    
    switch (node.type) {
      case 'paragraph':
        return `<p>${children}</p>`;
      
      case 'heading':
        const level = Math.min(Math.max(node.level || 1, 1), 6); // Ensure valid heading level
        return `<h${level}>${children}</h${level}>`;
      
      case 'list':
        const listType = node.format === 'ordered' ? 'ol' : 'ul';
        return `<${listType}>${children}</${listType}>`;
      
      case 'list-item':
        return `<li>${children}</li>`;
      
      case 'link':
        const url = this.sanitizeUrl(node.url || '#');
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${children}</a>`;
      
      case 'quote':
      case 'blockquote':
        return `<blockquote>${children}</blockquote>`;
      
      case 'code':
        return `<pre><code>${children}</code></pre>`;
      
      case 'image':
        const imgUrl = this.sanitizeUrl(node.url || '');
        const alt = this.escapeHtml(node.alt || '');
        return `<img src="${imgUrl}" alt="${alt}" loading="lazy" />`;
      
      case 'text':
        return children;
      
      case 'break':
      case 'line-break':
        return '<br />';
      
      case 'horizontal-rule':
      case 'hr':
        return '<hr />';
      
      case 'mark':
        return `<mark>${children}</mark>`;
      
      case 'strong':
        return `<strong>${children}</strong>`;
      
      case 'emphasis':
      case 'em':
        return `<em>${children}</em>`;
      
      case 'div':
        return `<div>${children}</div>`;
      
      case 'span':
        return `<span>${children}</span>`;
      
      default:
        // For unknown types, return children without wrapper
        console.warn(`Unknown rich text node type: ${node.type}`);
        return children;
    }
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    if (typeof text !== 'string') return '';
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Sanitize URLs to prevent XSS
   */
  private sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') return '';
    
    // Remove javascript: and data: protocols for security
    if (url.toLowerCase().startsWith('javascript:') || 
        url.toLowerCase().startsWith('data:')) {
      return '#';
    }
    
    return url.trim();
  }
}

export default new RichTextConverter();

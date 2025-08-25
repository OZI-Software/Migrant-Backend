/**
 * Rich Text to HTML Converter
 * Converts Strapi's rich text format to HTML
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
  [key: string]: any;
}

class RichTextConverter {
  convertToHTML(richText: any): string {
    if (typeof richText === 'string') {
      return richText;
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
    
    // Fallback
    return richText.toString() || '';
  }
  
  private convertNode(node: RichTextNode): string {
    if (!node) return '';
    
    // Handle text nodes
    if (node.text !== undefined) {
      let text = node.text;
      
      if (node.bold) text = `<strong>${text}</strong>`;
      if (node.italic) text = `<em>${text}</em>`;
      if (node.underline) text = `<u>${text}</u>`;
      if (node.strikethrough) text = `<del>${text}</del>`;
      if (node.code) text = `<code>${text}</code>`;
      
      return text;
    }
    
    // Handle block elements
    const children = node.children ? node.children.map(child => this.convertNode(child)).join('') : '';
    
    switch (node.type) {
      case 'paragraph':
        return `<p>${children}</p>`;
      case 'heading':
        const level = node.level || 1;
        return `<h${level}>${children}</h${level}>`;
      case 'list':
        const listType = node.format === 'ordered' ? 'ol' : 'ul';
        return `<${listType}>${children}</${listType}>`;
      case 'list-item':
        return `<li>${children}</li>`;
      case 'link':
        return `<a href="${node.url || '#'}" target="_blank" rel="noopener noreferrer">${children}</a>`;
      case 'blockquote':
        return `<blockquote>${children}</blockquote>`;
      case 'code':
        return `<pre><code>${children}</code></pre>`;
      case 'image':
        const alt = node.alt || '';
        const url = node.url || '';
        return `<img src="${url}" alt="${alt}" style="max-width: 100%; height: auto;" />`;
      case 'hr':
        return '<hr />';
      default:
        return children;
    }
  }
}

export default new RichTextConverter();

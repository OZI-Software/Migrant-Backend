/**
 * Newsletter Templates
 * Pre-built templates for different types of newsletters
 */

import richTextConverter from './rich-text-converter';

interface NewsletterTemplate {
  name: string;
  subject: string;
  content: string;
  description: string;
}

class NewsletterTemplates {
  private baseStyles = `
    <style>
      body { 
        font-family: Arial, sans-serif; 
        line-height: 1.6; 
        color: #333; 
        margin: 0; 
        padding: 0; 
      }
      .container { 
        max-width: 600px; 
        margin: 0 auto; 
        background-color: #ffffff; 
      }
      .header { 
        background-color: #2c3e50; 
        color: white; 
        padding: 30px 20px; 
        text-align: center; 
      }
      .header h1 { 
        margin: 0; 
        font-size: 28px; 
        font-weight: bold; 
      }
      .content { 
        padding: 30px 20px; 
      }
      .footer { 
        background-color: #ecf0f1; 
        padding: 20px; 
        text-align: center; 
        font-size: 12px; 
        color: #7f8c8d; 
      }
      .button { 
        display: inline-block; 
        background-color: #3498db; 
        color: white; 
        padding: 12px 24px; 
        text-decoration: none; 
        border-radius: 5px; 
        margin: 10px 0; 
      }
      .unsubscribe { 
        color: #7f8c8d; 
        text-decoration: none; 
      }
      .social-links { 
        margin: 20px 0; 
      }
      .social-links a { 
        margin: 0 10px; 
        color: #3498db; 
        text-decoration: none; 
      }
    </style>
  `;

  getTemplates(): NewsletterTemplate[] {
    return [
      {
        name: 'news-update',
        subject: 'Latest News Update',
        content: `
          <div class="container">
            ${this.baseStyles}
            <div class="header">
              <h1>📰 Latest News</h1>
              <p>Stay updated with the latest happenings</p>
            </div>
            <div class="content">
              <h2>What's New Today</h2>
              <p>Here are the top stories and updates from around the world...</p>
              
              <h3>Featured Stories</h3>
              <ul>
                <li>Breaking news story 1</li>
                <li>Important update story 2</li>
                <li>Trending topic story 3</li>
              </ul>
              
              <a href="#" class="button">Read More</a>
            </div>
            <div class="footer">
              <p>You received this email because you subscribed to our newsletter.</p>
              <div class="social-links">
                <a href="#">Facebook</a> | <a href="#">Twitter</a> | <a href="#">LinkedIn</a>
              </div>
              <p><a href="#" class="unsubscribe">Unsubscribe</a></p>
            </div>
          </div>
        `,
        description: 'A clean, professional template for news updates'
      },
      {
        name: 'weekly-digest',
        subject: 'Weekly Newsletter Digest',
        content: `
          <div class="container">
            ${this.baseStyles}
            <div class="header">
              <h1>📅 Weekly Digest</h1>
              <p>Your weekly roundup of the best content</p>
            </div>
            <div class="content">
              <h2>This Week's Highlights</h2>
              <p>Here's what you might have missed this week...</p>
              
              <h3>Top Articles</h3>
              <div style="border-left: 3px solid #3498db; padding-left: 15px; margin: 20px 0;">
                <h4>Article Title 1</h4>
                <p>Brief description of the article...</p>
                <a href="#" class="button">Read Article</a>
              </div>
              
              <div style="border-left: 3px solid #3498db; padding-left: 15px; margin: 20px 0;">
                <h4>Article Title 2</h4>
                <p>Brief description of the article...</p>
                <a href="#" class="button">Read Article</a>
              </div>
              
              <h3>Coming Next Week</h3>
              <p>Stay tuned for more exciting content...</p>
            </div>
            <div class="footer">
              <p>You received this email because you subscribed to our newsletter.</p>
              <div class="social-links">
                <a href="#">Facebook</a> | <a href="#">Twitter</a> | <a href="#">LinkedIn</a>
              </div>
              <p><a href="#" class="unsubscribe">Unsubscribe</a></p>
            </div>
          </div>
        `,
        description: 'A comprehensive weekly digest template'
      },
      {
        name: 'announcement',
        subject: 'Important Announcement',
        content: `
          <div class="container">
            ${this.baseStyles}
            <div class="header">
              <h1>📢 Important Announcement</h1>
              <p>We have some exciting news to share</p>
            </div>
            <div class="content">
              <h2>Announcement Title</h2>
              <p>We're excited to announce some important updates and changes...</p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3>Key Points:</h3>
                <ul>
                  <li>Important point 1</li>
                  <li>Important point 2</li>
                  <li>Important point 3</li>
                </ul>
              </div>
              
              <p>We appreciate your continued support and look forward to sharing more updates with you.</p>
              
              <a href="#" class="button">Learn More</a>
            </div>
            <div class="footer">
              <p>You received this email because you subscribed to our newsletter.</p>
              <div class="social-links">
                <a href="#">Facebook</a> | <a href="#">Twitter</a> | <a href="#">LinkedIn</a>
              </div>
              <p><a href="#" class="unsubscribe">Unsubscribe</a></p>
            </div>
          </div>
        `,
        description: 'A template for important announcements and updates'
      }
    ];
  }

  getTemplateByName(name: string): NewsletterTemplate | null {
    return this.getTemplates().find(template => template.name === name) || null;
  }

  generateCustomTemplate(
    title: string,
    content: any,
    templateName: string = 'news-update'
  ): string {
    const template = this.getTemplateByName(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const convertedContent = richTextConverter.convertToHTML(content);
    
    return template.content.replace(
      /<div class="content">[\s\S]*?<\/div>/,
      `<div class="content">
        <h1>${title}</h1>
        ${convertedContent}
      </div>`
    );
  }
}

export default new NewsletterTemplates();

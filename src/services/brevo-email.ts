import * as SibApiV3Sdk from '@getbrevo/brevo';
import richTextConverter from './rich-text-converter';

interface EmailOptions {
  to: string[];
  subject: string;
  htmlContent: string;
  senderName?: string;
  senderEmail?: string;
}

class BrevoEmailService {
  private apiInstance: SibApiV3Sdk.TransactionalEmailsApi;
  private senderEmail: string;
  private senderName: string;

  constructor() {
    this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    this.apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY || '');
    
    this.senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@yourdomain.com';
    this.senderName = process.env.BREVO_SENDER_NAME || 'Newsletter';
  }

  async sendEmail(options: EmailOptions): Promise<any> {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.to = options.to.map(email => ({ email }));
    sendSmtpEmail.subject = options.subject;
    sendSmtpEmail.htmlContent = options.htmlContent;
    sendSmtpEmail.sender = {
      name: options.senderName || this.senderName,
      email: options.senderEmail || this.senderEmail
    };

    try {
      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Email sent successfully:', result);
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendNewsletterToSubscribers(
    newsletter: any,
    subscribers: any[]
  ): Promise<any[]> {
    const results = [];
    
    for (const subscriber of subscribers) {
      if (!subscriber.isActive) continue;
      
      try {
        const result = await this.sendEmail({
          to: [subscriber.email],
          subject: newsletter.subject,
          htmlContent: this.generateNewsletterHTML(newsletter, subscriber),
          senderName: this.senderName,
          senderEmail: this.senderEmail
        });
        
        results.push({
          subscriber: subscriber.email,
          success: true,
          messageId: result.messageId
        });
      } catch (error) {
        results.push({
          subscriber: subscriber.email,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  private generateNewsletterHTML(newsletter: any, subscriber: any): string {
    // Convert Strapi's rich text to HTML
    const content = richTextConverter.convertToHTML(newsletter.content);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${newsletter.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .unsubscribe { color: #666; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${newsletter.title}</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>You received this email because you subscribed to our newsletter.</p>
            <p><a href="#" class="unsubscribe">Unsubscribe</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }


}

export default new BrevoEmailService();

import * as SibApiV3Sdk from "@getbrevo/brevo";

interface Subscriber {
  id: number;
  email: string;
  fullname: string;
  isActive: boolean;
  subscribedAt: string;
}

export default {
  async sendEmail({ to, subject, htmlContent }) {
    try {
      // Initialize Brevo API client
      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
      
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

      sendSmtpEmail.sender = { 
        name: process.env.BREVO_SENDER_NAME || "Your Business", 
        email: process.env.BREVO_SENDER_EMAIL || "your-email@example.com" 
      };
      sendSmtpEmail.to = [{ email: to }];
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = htmlContent;

      // Send the email
      const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
      return response;
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error("Failed to send email");
    }
  },

  async sendNewsletterToSubscribers({ subject, htmlContent }) {
    try {
      // Get all active newsletter subscriptions
      const subscriptions = await strapi.entityService.findMany('api::subscriber.subscriber', {
        filters: {
          isActive: {
            $eq: true
          }
        },
        fields: ['email']
      });

      if (!subscriptions || subscriptions.length === 0) {
        throw new Error('No active subscribers found');
      }

      const brevo = require('@getbrevo/brevo');
       let apiInstance = new brevo.TransactionalEmailsApi();
       let apiKey = apiInstance.authentications['apiKey'];
       apiKey.apiKey = process.env.BREVO_API_KEY;

       const results = [];
       
       // Send email to each subscriber
       for (const subscription of subscriptions as Subscriber[]) {
         let sendSmtpEmail = new brevo.SendSmtpEmail();
        
        sendSmtpEmail.subject = subject;
        sendSmtpEmail.htmlContent = htmlContent;
        sendSmtpEmail.sender = {
          name: process.env.BREVO_SENDER_NAME || 'Newsletter',
          email: process.env.BREVO_SENDER_EMAIL || "your-email@example.com"
        };
        sendSmtpEmail.to = [{ email: subscription.email }];

        try {
          const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
          results.push({ email: subscription.email, success: true, messageId: result.messageId });
        } catch (error) {
          results.push({ email: subscription.email, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      return {
        totalSubscribers: subscriptions.length,
        successCount,
        failureCount,
        results
      };
    } catch (error) {
      throw new Error(`Failed to send newsletter: ${error.message}`);
    }
  }
};
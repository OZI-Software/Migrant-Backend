export default {
  async send(ctx) {
    try {
      const { to, subject, htmlContent } = ctx.request.body;

      if (!to || !subject || !htmlContent) {
        return ctx.badRequest("Missing required fields: to, subject, htmlContent");
      }

      // Access service using `strapi.service()`
      await strapi.service("api::email-news.email-news").sendEmail({ to, subject, htmlContent });

      ctx.send({ message: "Email sent successfully" });
    } catch (error) {
      console.error("Email error:", error);
      ctx.send({ error: "Failed to send email", details: error.message });
    }
  },

  async sendNewsletter(ctx) {
    try {
      const { subject, htmlContent } = ctx.request.body;

      if (!subject || !htmlContent) {
        return ctx.badRequest('Missing required fields: subject, htmlContent');
      }

      const result = await strapi.service('api::email-news.email-news').sendNewsletterToSubscribers({
        subject,
        htmlContent
      });

      ctx.send({
        message: 'Newsletter sent successfully',
        data: result
      });
    } catch (error) {
      ctx.throw(500, `Failed to send newsletter: ${error.message}`);
    }
  }
};
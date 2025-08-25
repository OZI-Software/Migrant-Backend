export default {
  routes: [
    {
      method: 'POST',
      path: '/email-news/send-email',
      handler: 'api::email-news.email-news.send',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/email-news/send-newsletter',
      handler: 'api::email-news.email-news.sendNewsletter',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
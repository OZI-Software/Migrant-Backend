export default {
  routes: [
    {
      method: 'POST',
      path: '/enhanced-news/process-sync',
      handler: 'enhanced-news.processSynchronous',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/enhanced-news/process-category',
      handler: 'enhanced-news.processCategory',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/enhanced-news/status',
      handler: 'enhanced-news.getStatus',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    }
  ],
};
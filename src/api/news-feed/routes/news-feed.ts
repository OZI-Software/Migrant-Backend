export default {
  routes: [
    {
      method: 'POST',
      path: '/news-feed/import',
      handler: 'news-feed.manualImport',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/news-feed/status',
      handler: 'news-feed.getStatus',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/news-feed/start',
      handler: 'news-feed.startJobs',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/news-feed/stop',
      handler: 'news-feed.stopJobs',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/news-feed/test-ai-extraction',
      handler: 'news-feed.testAiExtraction',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/news-feed/test-strapi-operations',
      handler: 'test-strapi-operations.testEntityOperations',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/news-feed/check-science-articles',
      handler: 'test-strapi-operations.checkScienceArticles',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
  ],
};
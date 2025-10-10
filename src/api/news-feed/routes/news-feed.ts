export default {
  routes: [
    {
      method: 'POST',
      path: '/news-feed/import',
      handler: 'news-feed.manualImport',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/news-feed/status',
      handler: 'news-feed.getStatus',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/news-feed/start',
      handler: 'news-feed.startJobs',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/news-feed/stop',
      handler: 'news-feed.stopJobs',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
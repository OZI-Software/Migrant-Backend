/**
 * Custom newsletter routes
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/newsletter/subscribe',
      handler: 'api::newsletter.newsletter.subscribe',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
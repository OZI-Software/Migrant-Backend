import type { StrapiApp } from '@strapi/strapi/admin';
import { Mail } from '@strapi/icons';

export default {
  config: {
    locales: [
      // Add your supported locales here
    ],
  },
  register(app: StrapiApp) {
    app.addMenuLink({
      to: '/plugins/newsletter',
      icon: Mail,
      intlLabel: {
        id: 'newsletter.title',
        defaultMessage: 'Newsletter',
      },
      Component: async () => {
        const component = await import('./pages/App');
        return component;
      },
      permissions: [
        { action: 'plugin::email.settings.read', subject: null }
      ],
    });

    app.registerPlugin({
      id: 'newsletter',
      name: 'Newsletter',
    });
  },
  bootstrap(app: StrapiApp) {
    // console.log(app.features);
  },
};
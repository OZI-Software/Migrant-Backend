import type { StrapiApp } from '@strapi/strapi/admin';
import { Sparkle } from '@strapi/icons';

export default {
  register(app: StrapiApp) {
    app.addMenuLink({
      to: '/plugins/ai-text-generation',
      icon: Sparkle,
      intlLabel: {
        id: 'ai-text-generation.title',
        defaultMessage: 'AI Text Generation',
      },
      Component: async () => {
        const component = await import('./pages/App');
        return component;
      },
      permissions: [
        { action: 'plugin::ai-text-generation.settings.read', subject: null }
      ],
    });

    app.registerPlugin({
      id: 'ai-text-generation',
      name: 'AI Text Generation',
    });
  },
  bootstrap(app: StrapiApp) {
    // console.log(app.features);
  },
};
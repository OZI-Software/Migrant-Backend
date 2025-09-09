'use strict';

import { Sparkle } from '@strapi/icons';
import pluginId from './pluginId';

export default {
  register(app) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: Sparkle,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'AI Text Generation',
      },
      Component: async () => {
        const component = await import(/* webpackChunkName: "ai-text-generation" */ './pages/App.tsx');
        return component.default;
      },
      permissions: [], // Super Admin should have access to all plugins by default
    });

    app.registerPlugin({
      id: pluginId,
      name: 'AI Text Generation',
    });
  },
  bootstrap(app) {
    // Plugin bootstrap logic
  },
};
import { prefixPluginTranslations } from '@strapi/helper-plugin';
import pluginPkg from '../../package.json';
import pluginId from './pluginId';
import PluginIcon from './components/PluginIcon';


const name = pluginPkg.strapi.name;

export default { 
  register(app) {
    
    app.customFields.register({
      name: "text-ai",
      pluginId: "ai-text-generation", 
      type: "string", 
      intlLabel: {
        id: "ai-text-generation.text-ai.label",
        defaultMessage: "Text AI",
      },
      intlDescription: {
        id: "ai-text-generation.text-ai.description",
        defaultMessage: "Let AI do your writing!",
      },
      icon: PluginIcon,
      components: {
        Input: async () => import(/* webpackChunkName: "input-component" */ "./components/Input"),
      },
      options: {
      },
    });
  },

  

  bootstrap(app) {},
  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(
          /* webpackChunkName: "translation-[request]" */ `./translations/${locale}.json`
        )
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, pluginId),
              locale,
            };
          })
          .catch(() => {
            return {
              data: {},
              locale,
            };
          });
      })
    );

    return Promise.resolve(importedTrads);
  },
};
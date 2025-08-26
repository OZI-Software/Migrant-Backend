declare module '@strapi/strapi/admin' {
  export interface FetchClient {
    get: (url: string, config?: any) => Promise<any>;
    post: (url: string, data?: any, config?: any) => Promise<any>;
    put: (url: string, data?: any, config?: any) => Promise<any>;
    delete: (url: string, config?: any) => Promise<any>;
  }

  export function useFetchClient(): FetchClient;

  export interface StrapiApp {
    addMenuLink: (link: any) => void;
    registerPlugin: (plugin: any) => void;
    features: any;
  }
}
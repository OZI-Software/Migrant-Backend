declare module 'rss-parser' {
  interface Item {
    title?: string;
    link?: string;
    pubDate?: string;
    content?: string;
    contentSnippet?: string;
    guid?: string;
    categories?: string[];
    isoDate?: string;
    [key: string]: any;
  }

  interface Output<T> {
    title?: string;
    description?: string;
    link?: string;
    language?: string;
    copyright?: string;
    lastBuildDate?: string;
    items: T[];
    [key: string]: any;
  }

  interface ParserOptions {
    customFields?: {
      feed?: string[];
      item?: string[];
    };
    headers?: { [key: string]: string };
    defaultRSS?: number;
    xml2js?: any;
    requestOptions?: any;
    [key: string]: any;
  }

  class Parser<T = Item> {
    constructor(options?: ParserOptions);
    parseURL(url: string): Promise<Output<T>>;
    parseString(xml: string): Promise<Output<T>>;
  }

  export = Parser;
}
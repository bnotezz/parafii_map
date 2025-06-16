import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { baseUrl, resolveBaseUrl } = require('./env.cjs');

export const siteConfig = {
  name: "ДАРО - Каталог метричних книг",
  description: "Інтерактивний пошук та перегляд метричних книг з архіву Державного архіву Рівненської області",
  url: baseUrl,
  ogImage: `${baseUrl}/og-image.png`,
};
export { baseUrl, resolveBaseUrl };

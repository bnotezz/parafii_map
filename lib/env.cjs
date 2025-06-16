const port = process.env.PORT || 3000;

function resolveBaseUrl() {
  if (process.env.CF_PAGES_URL) return process.env.CF_PAGES_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? `http://localhost:${port}`;
}

const baseUrl = resolveBaseUrl();

module.exports = {
  baseUrl,
  resolveBaseUrl,
};

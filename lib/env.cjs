const port = process.env.PORT || 3000;

function resolveBaseUrl() {
  let url =process?.env?.NEXT_PUBLIC_SITE_URL ??  
  process?.env?.CF_PAGES_URL ??
  process?.env?.VERCEL_PROJECT_PRODUCTION_URL ??
  process?.env?.VERCEL_URL ?? `http://localhost:${port}`;

  // Make sure to include `https://` when not localhost.
  url = url.startsWith('http') ? url : `https://${url}`
  return url
}

const baseUrl = resolveBaseUrl();

module.exports = {
  baseUrl,
  resolveBaseUrl
};

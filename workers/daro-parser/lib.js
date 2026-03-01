import puppeteer from "@cloudflare/puppeteer";

// Shared utilities and parsing logic separated from Cloudflare entrypoint

export const MAIN_URL = "https://rv.archives.gov.ua/ocifrovani-sprav?period=5&fund=5";
export const GITHUB_API_BASE = "https://api.github.com";

// Detect Cloudflare Worker environment
const IS_WORKER = typeof globalThis !== "undefined" && 
                  (typeof caches !== "undefined" || 
                   typeof KV !== "undefined" ||
                   typeof environment !== "undefined");

// Session management for cookie/header reuse to bypass Cloudflare
class CloudflareSession {
  constructor() {
    this.cookies = new Map();
    this.responseHeaders = new Map();
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  // Parse Set-Cookie headers and store them
  addCookies(headerValue) {
    if (!headerValue) return;
    
    // Handle both string and array of cookie headers
    const cookieHeaders = Array.isArray(headerValue) ? headerValue : [headerValue];
    
    for (const cookie of cookieHeaders) {
      // Extract cookie name=value (before semicolon)
      const cookieMatch = cookie.match(/^([^=]+=[^;]+)/);
      if (cookieMatch) {
        const [name, value] = cookieMatch[1].split("=");
        this.cookies.set(name.trim(), value.trim());
        console.log(`   🍪 Captured cookie: ${name.trim()}`);
      }
    }
  }

  // Get all cookies as a Cookie header string
  getCookieHeader() {
    if (this.cookies.size === 0) return "";
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  // Store important CF headers for reuse
  captureHeaders(headers) {
    const cfHeaders = [
      "cf-ray",
      "cf-cache-status",
      "date",
      "server",
      "accept-ranges",
      "cf-request-id",
    ];
    
    for (const header of cfHeaders) {
      const value = headers.get(header);
      if (value) {
        this.responseHeaders.set(header, value);
      }
    }
  }

  // Log session status
  logStatus() {
    console.log(`   📊 Session: ${this.cookies.size} cookies stored`);
    if (this.cookies.size > 0) {
      Array.from(this.cookies.keys()).forEach(name => {
        console.log(`      - ${name}`);
      });
    }
  }

  // Check if we should retry
  shouldRetry(html) {
    // Retry if empty response
    if (html.length === 0) return true;
    
    // Check for Cloudflare error pages
    if (html.includes("challenge")) return true;
    if (html.includes("Just a moment")) return true;
    
    return false;
  }

  // Reset retry counter
  resetRetries() {
    this.retryCount = 0;
  }

  // Get next retry delay with exponential backoff
  getRetryDelay() {
    // 1000ms, 2000ms, 4000ms
    return Math.pow(2, this.retryCount) * 1000;
  }
}

// Global session instance
let session = new CloudflareSession();

export function resetSession() {
  session = new CloudflareSession();
}

export const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "Referer": "https://rv.archives.gov.ua/",
  "Origin": "https://rv.archives.gov.ua",
  "DNT": "1",
  "Connection": "keep-alive",
};

// Browser rendering headers - additional headers to request JS-rendered content
const BROWSER_RENDERING_HEADERS = {
  ...BROWSER_HEADERS,
  "X-Requested-With": "XMLHttpRequest",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

// Helper to build request headers with session cookies
function getHeaders(additionalHeaders = {}) {
  const headers = { ...BROWSER_HEADERS, ...additionalHeaders };
  
  // Add session cookies if we have any
  const cookieHeader = session.getCookieHeader();
  if (cookieHeader) {
    headers["Cookie"] = cookieHeader;
  }
  
  return headers;
}

// Helper to wait (for delays between requests)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// env must be passed in so we can access env.BROWSER binding
export async function fetchPageWithBrowser(url, env, referer = null) {
  console.log(`\n🌐 fetchPageWithBrowser: ${url}`);

  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();

    // Set realistic browser headers
    await page.setExtraHTTPHeaders({
      "Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      ...(referer ? { "Referer": referer } : {}),
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Wait until network is idle so JS-rendered content is present
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    const html = await page.content();
    console.log(`   ✅ Received: ${html.length} bytes`);
    return html;
  } finally {
    await browser.close();
  }
}


export async function fetchMainPage(env) {
  return fetchPageWithBrowser(MAIN_URL, env);
}

export async function downloadAndParseCases(env) {
  try {
    // 1) Завантажуємо головну сторінку
    const html = await fetchMainPage(env);

    // 2) Розпарсити список описів
    const opysList = parseOpysList(html);

    // 3) Розпарсити справи з кожного опису
    const cases = await parseCases(opysList, env);
    return cases;
  } catch (err) {
    console.error("Error during parsing or updating:", err);
    return [];
  }
}

export function parseOpysList(html) {
  const opysList = [];
  const opysRegex =
    /<tr>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
  let match;
  while ((match = opysRegex.exec(html))) {
    const opysNumber = match[1].trim();
    const opysUrl = new URL(match[2].trim(), MAIN_URL).href;
    opysList.push({ opysNumber, opysUrl });
  }
  return opysList;
}

export async function parseCases(opysList, env) {
  const cases = [];
  const caseRegex =
    /<tr>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<p[^>]*>\s*([^<]+?)\s*<\/p>[\s\S]*?<\/a>/g;
  for (const { opysNumber, opysUrl } of opysList) {
    const opysHtml = await fetchOpysPage(opysUrl, env);
    let cMatch;
    while ((cMatch = caseRegex.exec(opysHtml))) {
      const spravaNumber = cMatch[1].trim();
      const pdfUrl = new URL(cMatch[2].trim(), opysUrl).href;
      const caseName = cMatch[3].trim();
      cases.push({
        opys: opysNumber,
        sprava: spravaNumber,
        name: caseName,
        url: pdfUrl,
      });
    }
  }
  return cases;
}

export async function fetchOpysPage(opysUrl, env) {
  return fetchPageWithBrowser(opysUrl, env, MAIN_URL);
}

export async function updateGithubFile(env, newContent, casesCount) {
  const { GITHUB_REPO, GITHUB_TOKEN, GITHUB_BRANCH } = env;
  const GITHUB_FILE_PATH = "data/fond_P720.json";
  const encodedNew = utf8ToBase64(newContent);
  const apiUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "daro-parser-worker/1.0",
    "Content-Type": "application/json",
  };

  // attempt to fetch existing file sha
  let sha = null,
    oldContent = null;
  const getRes = await fetch(apiUrl + `?ref=${GITHUB_BRANCH}`, { headers });
  if (getRes.status === 404) {
    // file doesn't exist yet
  } else if (getRes.ok) {
    const data = await getRes.json();
    sha = data.sha;
    oldContent = base64ToUtf8(data.content || "");
  } else {
    const err = await getRes.text();
    console.error("Error fetching file info:", getRes.status, err);
    throw new Error("Failed to fetch GitHub file info");
  }

  if (oldContent !== null && oldContent === newContent) {
    console.log("No changes – skipping update. Total cases: ", casesCount);
    return;
  }

  const body = {
    message: sha
      ? `update fond_P720 Загалом: ${casesCount} справ`
      : "created fond_P720.json",
    content: encodedNew,
    branch: GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!putRes.ok) {
    const err = await putRes.text();
    console.error("GitHub update failed:", putRes.status, err);
    throw new Error("Failed to update GitHub file");
  } else {
    console.log("GitHub file updated successfully. Total cases :", casesCount);
  }
}

export function utf8ToBase64(str) {
  // Node.js doesn't provide TextEncoder/atob; fall back to Buffer
  if (typeof TextEncoder !== "undefined") {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (let b of bytes) {
      binary += String.fromCharCode(b);
    }
    return btoa(binary);
  } else {
    return Buffer.from(str, "utf8").toString("base64");
  }
}

export function base64ToUtf8(b64) {
  if (typeof TextDecoder !== "undefined") {
    const binary = atob(b64);
    const bytes = new Uint8Array(
      Array.from(binary, (char) => char.charCodeAt(0))
    );
    return new TextDecoder().decode(bytes);
  } else {
    return Buffer.from(b64, "base64").toString("utf8");
  }
}

export function formatCasesAsJSON(cases) {
  return JSON.stringify(cases, null, 2);
}


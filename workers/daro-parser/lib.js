import puppeteer from "@cloudflare/puppeteer";

export const MAIN_URL = "https://rv.archives.gov.ua/ocifrovani-sprav?period=5&fund=5";
export const GITHUB_API_BASE = "https://api.github.com";

export async function fetchPageWithBrowser(url, env, referer = null) {
  console.log(`\n🌐 fetchPageWithBrowser: ${url}`);

  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      "Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      ...(referer ? { "Referer": referer } : {}),
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

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

export async function fetchOpysPage(opysUrl, env) {
  return fetchPageWithBrowser(opysUrl, env, MAIN_URL);
}

export async function downloadAndParseCases(env) {
  try {
    const html = await fetchMainPage(env);
    const opysList = parseOpysList(html);
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
  for (const { opysNumber, opysUrl } of opysList) {
    const opysHtml = await fetchOpysPage(opysUrl, env);
    // Regex must be recreated per page — reusing a /g regex across different
    // strings carries over lastIndex and silently skips matches.
    const caseRegex =
      /<tr>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<p[^>]*>\s*([^<]+?)\s*<\/p>[\s\S]*?<\/a>/g;
    let cMatch;
    while ((cMatch = caseRegex.exec(opysHtml))) {
      cases.push({
        opys: opysNumber,
        sprava: cMatch[1].trim(),
        name: cMatch[3].trim(),
        url: new URL(cMatch[2].trim(), opysUrl).href,
      });
    }
  }
  return cases;
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

  let sha = null, oldContent = null;
  const getRes = await fetch(apiUrl + `?ref=${GITHUB_BRANCH}`, { headers });
  if (getRes.status === 404) {
    // file doesn't exist yet — will be created
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
    console.log("No changes – skipping update. Total cases:", casesCount);
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
    console.log("GitHub file updated successfully. Total cases:", casesCount);
  }
}

export function utf8ToBase64(str) {
  if (typeof TextEncoder !== "undefined") {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (const b of bytes) {
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
    const bytes = new Uint8Array(Array.from(binary, (c) => c.charCodeAt(0)));
    return new TextDecoder().decode(bytes);
  } else {
    return Buffer.from(b64, "base64").toString("utf8");
  }
}

export function formatCasesAsJSON(cases) {
  return JSON.stringify(cases, null, 2);
}

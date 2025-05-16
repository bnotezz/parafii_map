/**
 * Cloudflare Worker: Scheduled twice a month (1-го та 15-го числа)
 * Парсить архів і оновлює файл JSON у зазначеній гілці GitHub
 */
const MAIN_URL = "https://rv.archives.gov.ua/ocifrovani-sprav?period=5&fund=5";
const GITHUB_API_BASE = "https://api.github.com";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
  "Referer": "https://rv.archives.gov.ua/",
  "Origin": "https://rv.archives.gov.ua"
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.searchParams.get("runNow") === "1") {
      ctx.waitUntil(handleSchedule(env));
      return new Response("Scheduled job queued", { status: 200 });
    }
    return new Response("OK", { status: 200 });
  },
  // Викликається за Cron-тригером
  async scheduled(event, env, context) {
    context.waitUntil(handleSchedule(env));
  }
};

async function handleSchedule(env) {
  try {
    // 1) Завантажуємо головну сторінку
    const response = await fetch(MAIN_URL, { headers: BROWSER_HEADERS });
    const html = await response.text();

    // 2) Розпарсити список описів
    const opysList = parseOpysList(html);

    // 3) Розпарсити справи з кожного опису
    const cases = await parseCases(opisList);

    // Log error and skip updating if no cases were parsed.
    if (cases.length === 0) {
      console.error("Parsing error: No cases were parsed.");
      return;
    }

    // 4) Підготувати новий контент і оновити файл у GitHub
    const newContent = JSON.stringify(cases, null, 2);
    await updateGithubFile(env, newContent);
    console.log("GitHub file updated.");
  } catch (err) {
    console.error("Error during parsing or updating:", err);
  }
}

function parseOpysList(html) {
  const opysList = [];
  const opysRegex = /<tr>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
  let match;
  while ((match = opysRegex.exec(html))) {
    const opysNumber = match[1].trim();
    const opysUrl = new URL(match[2].trim(), MAIN_URL).href;
    opysList.push({ opysNumber, opysUrl });
  }
  return opysList;
}

async function parseCases(opysList) {
  const cases = [];
  const caseRegex = /<tr>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<p[^>]*>\s*([^<]+?)\s*<\/p>[\s\S]*?<\/a>/g;
  for (const { opysNumber, opisUrl } of opysList) {
    const caseHeaders = {
      ...BROWSER_HEADERS,
      Referer: MAIN_URL
    };
    const res = await fetch(opisUrl, { headers: caseHeaders });
    const opisHtml = await res.text();
    let cMatch;
    while ((cMatch = caseRegex.exec(opisHtml))) {
      const spravaNumber = cMatch[1].trim();
      const pdfUrl = new URL(cMatch[2].trim(), opisUrl).href;
      const caseName = cMatch[3].trim();
      cases.push({
        opys: opysNumber,
        sprava: spravaNumber,
        name: caseName,
        url: pdfUrl
      });
    }
  }
  return cases;
}

async function updateGithubFile(env, newContent) {
  const { GITHUB_REPO, GITHUB_TOKEN, GITHUB_BRANCH } = env;
  const GITHUB_FILE_PATH = "data/fond_P720.json";
  const encodedNew = utf8ToBase64(newContent);
  const apiUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
  const headers = {
    "Authorization": `Bearer ${GITHUB_TOKEN}`,
    "Accept": "application/vnd.github+json",
    "User-Agent": "daro-parser-worker/1.0",
    "Content-Type": "application/json"
  };

  // Спроба отримати поточний файл
  let sha = null, oldContent = null;
  const getRes = await fetch(apiUrl + `?ref=${GITHUB_BRANCH}`, { headers });
  if (getRes.status === 404) {
    console.log("GitHub file not found – will create a new file.");
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
    console.log("No changes – skipping update");
    return;
  }

  // Готуємо тіло для PUT-запиту
  const body = {
    message: sha
      ? "chore: update fond_P720.json (automated)"
      : "chore: create fond_P720.json (automated)",
    content: encodedNew,
    branch: GITHUB_BRANCH
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify(body)
  });
  if (!putRes.ok) {
    const err = await putRes.text();
    console.error("GitHub update failed:", putRes.status, err);
    throw new Error("Failed to update GitHub file");
  }
}

/**
 * Перетворює Unicode-рядок у Base64 правильно, через UTF-8.
 */
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(
    Array.from(binary, char => char.charCodeAt(0))
  );
  return new TextDecoder().decode(bytes);
}

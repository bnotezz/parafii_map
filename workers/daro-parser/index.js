/**
 * Cloudflare Worker: Scheduled twice a month (1-го та 15-го числа)
 * Парсить архів і оновлює файл JSON у зазначеній гілці GitHub
 */
const MAIN_URL = "https://rv.archives.gov.ua/ocifrovani-sprav?period=5&fund=5";
const GITHUB_API_BASE = "https://api.github.com";

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
    const response = await fetch(MAIN_URL);
    const html = await response.text();

    // 2) Розпарсити список описів
    const opisList = parseOpisList(html);

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

function parseOpisList(html) {
  const opisList = [];
  const opisRegex = /<tr>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
  let match;
  while ((match = opisRegex.exec(html))) {
    const opysNumber = match[1].trim();
    const opisUrl = new URL(match[2].trim(), MAIN_URL).href;
    opisList.push({ opysNumber, opisUrl });
  }
  return opisList;
}

async function parseCases(opisList) {
  const cases = [];
  const caseRegex = /<tr>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
  for (const { opysNumber, opisUrl } of opisList) {
    const res = await fetch(opisUrl);
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
  const encodedNew = btoa(newContent);
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
    oldContent = atob(data.content || "");
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

import { jest } from "@jest/globals";
import fetchMock from "jest-fetch-mock";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.join(__dirname, "tests", "fixtures");

// ─── Mock @cloudflare/puppeteer before any lib imports ────────────────────────
let mockPageContent = "";
let mockPageTitle = "archive";

const makeMockPage = () => ({
  setExtraHTTPHeaders: jest.fn(),
  setUserAgent: jest.fn(),
  goto: jest.fn(),
  content: jest.fn().mockImplementation(async () => mockPageContent),
  title: jest.fn().mockImplementation(async () => mockPageTitle),
  waitForFunction: jest.fn().mockResolvedValue(undefined),
  waitForNetworkIdle: jest.fn().mockResolvedValue(undefined),
});

jest.unstable_mockModule("@cloudflare/puppeteer", () => ({
  default: {
    launch: jest.fn().mockImplementation(async () => ({
      newPage: async () => makeMockPage(),
      close: jest.fn(),
    })),
  },
}));

// ─── Dynamic imports (must come AFTER unstable_mockModule) ────────────────────
const {
  parseOpysList,
  parseCases,
  fetchMainPage,
  fetchOpysPage,
  utf8ToBase64,
  base64ToUtf8,
  updateGithubFile,
  formatCasesAsJSON,
} = await import("./lib.js");

const worker = await import("./index.js");

// ─── Fetch mock setup ─────────────────────────────────────────────────────────
beforeAll(() => {
  fetchMock.enableMocks();
});

beforeEach(() => {
  fetchMock.resetMocks();
  mockPageContent = "";
  mockPageTitle = "archive";
});

// ─── Parsing helpers ──────────────────────────────────────────────────────────
describe("parsing helpers with HTML snapshots", () => {
  const mainHtml = fs.readFileSync(path.join(FIXTURES_DIR, "main.html"), "utf-8");
  const opysHtml = fs.readFileSync(path.join(FIXTURES_DIR, "opys.html"), "utf-8");

  test("parseOpysList returns a non-empty list from the main snapshot", () => {
    const list = parseOpysList(mainHtml);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(6);
    expect(list[0].opysNumber).toBe("4");
    expect(list[0].opysUrl).toMatch(/annotation=6$/);
    list.forEach((o) => {
      expect(o).toHaveProperty("opysNumber");
      expect(o).toHaveProperty("opysUrl");
      expect(o.opysUrl).toMatch(/^https?:\/\//);
    });
  });

  test("parseCases correctly interprets the opys snapshot", async () => {
    const opysList = parseOpysList(mainHtml);
    expect(opysList.length).toBeGreaterThan(0);

    mockPageContent = opysHtml;

    const cases = await parseCases(opysList, makeMockPage());
    expect(Array.isArray(cases)).toBe(true);
    expect(cases.length).toBeGreaterThan(10);

    expect(cases[0].opys).toBe("4");
    expect(cases[0].sprava).toBe("1");
    expect(cases[0].name).toMatch(/Березно/);
    expect(cases[0].url).toMatch(/\/upload\/2021\/April\/OElzU21ITG1HSEExQlE9PQ\.pdf$/);

    cases.forEach((c) => {
      expect(c).toHaveProperty("opys");
      expect(c).toHaveProperty("sprava");
      expect(c).toHaveProperty("name");
      expect(c).toHaveProperty("url");
      expect(c.url).toMatch(/^https?:\/\//);
    });
  });

  test("parseCases resets regex correctly across multiple opys pages", async () => {
    // Two opys entries using the same fixture HTML.
    // Before the bug fix, the shared /g regex lastIndex was left at end-of-string
    // after the first page, causing the second page to yield 0 matches.
    const opysList = [
      { opysNumber: "4", opysUrl: "https://rv.archives.gov.ua/opys/1" },
      { opysNumber: "5", opysUrl: "https://rv.archives.gov.ua/opys/2" },
    ];
    mockPageContent = opysHtml;

    const cases = await parseCases(opysList, makeMockPage());
    const opys4Cases = cases.filter((c) => c.opys === "4");
    const opys5Cases = cases.filter((c) => c.opys === "5");

    expect(opys4Cases.length).toBeGreaterThan(0);
    expect(opys5Cases.length).toBe(opys4Cases.length);
  });

  test("fetchMainPage returns HTML via browser binding", async () => {
    mockPageContent = mainHtml;
    const html = await fetchMainPage(makeMockPage());
    expect(html).toBe(mainHtml);
  });

  test("fetchOpysPage returns HTML via browser binding", async () => {
    mockPageContent = opysHtml;
    const html = await fetchOpysPage("https://rv.archives.gov.ua/opys/1", makeMockPage());
    expect(html).toBe(opysHtml);
  });
});

// ─── Encoding helpers ─────────────────────────────────────────────────────────
describe("encoding helpers", () => {
  test("utf8ToBase64 and base64ToUtf8 round-trip ASCII", () => {
    const plain = "Hello, world!";
    expect(base64ToUtf8(utf8ToBase64(plain))).toBe(plain);
  });

  test("utf8ToBase64 and base64ToUtf8 round-trip Unicode", () => {
    const plain = "Привіт, 世界";
    expect(base64ToUtf8(utf8ToBase64(plain))).toBe(plain);
  });
});

// ─── Formatting helpers ───────────────────────────────────────────────────────
describe("formatting helpers", () => {
  test("formatCasesAsJSON produces valid JSON with 2-space indentation", () => {
    const cases = [
      { opys: "1", sprava: "1", name: "case1", url: "http://example.com/1" },
      { opys: "2", sprava: "2", name: "case2", url: "http://example.com/2" },
    ];
    const json = formatCasesAsJSON(cases);
    expect(JSON.parse(json)).toEqual(cases);
    expect(json).toContain("  ");
  });
});

// ─── GitHub update logic ──────────────────────────────────────────────────────
describe("github update logic", () => {
  const env = {
    GITHUB_REPO: "owner/repo",
    GITHUB_TOKEN: "token",
    GITHUB_BRANCH: "main",
  };

  test("creates file when GET returns 404", async () => {
    fetchMock.mockResponses(
      ["Not found", { status: 404 }],
      ['{"content":"ignored"}', { status: 200 }]
    );

    await expect(updateGithubFile(env, "{}", 0)).resolves.toBeUndefined();

    const putCall = fetchMock.mock.calls[1];
    expect(putCall[0]).toMatch(/repos\/owner\/repo\/contents\//);
    expect(putCall[1].method).toBe("PUT");
    const body = JSON.parse(putCall[1].body);
    expect(body.content).toBe(utf8ToBase64("{}"));
    expect(body.sha).toBeUndefined();
    expect(body.message).toBe("created fond_P720.json");
  });

  test("updates file when content has changed", async () => {
    const existingBase64 = utf8ToBase64("old content");
    fetchMock.mockResponses(
      [JSON.stringify({ sha: "abc123", content: existingBase64 }), { status: 200 }],
      ['{"content":"ignored"}', { status: 200 }]
    );

    await expect(updateGithubFile(env, "new content", 5)).resolves.toBeUndefined();

    expect(fetchMock.mock.calls.length).toBe(2);
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.sha).toBe("abc123");
    expect(body.content).toBe(utf8ToBase64("new content"));
    expect(body.message).toContain("5 справ");
  });

  test("skips update when content is unchanged", async () => {
    const existingBase64 = utf8ToBase64("same");
    fetchMock.mockResponses(
      [JSON.stringify({ sha: "abc", content: existingBase64 }), { status: 200 }]
    );

    await expect(updateGithubFile(env, "same", 1)).resolves.toBeUndefined();
    expect(fetchMock.mock.calls.length).toBe(1);
  });

  test("throws when GET returns unexpected error", async () => {
    fetchMock.mockResponses(["Server error", { status: 500 }]);
    await expect(updateGithubFile(env, "content", 0)).rejects.toThrow("Failed to fetch GitHub file info");
  });

  test("throws when PUT fails", async () => {
    fetchMock.mockResponses(
      ["Not found", { status: 404 }],
      ["Unauthorized", { status: 401 }]
    );
    await expect(updateGithubFile(env, "content", 0)).rejects.toThrow("Failed to update GitHub file");
  });
});

// ─── Worker fetch handler ─────────────────────────────────────────────────────
describe("worker fetch handler", () => {
  const workerFetch = worker.default.fetch.bind(worker.default);

  test("returns 200 OK when SKIP_SCHEDULE is set", async () => {
    const ctx = { waitUntil: jest.fn() };
    const resp = await workerFetch(
      new Request("https://example.com/"),
      { SKIP_SCHEDULE: "1" },
      ctx
    );
    expect(resp.status).toBe(200);
    expect(ctx.waitUntil).not.toHaveBeenCalled();
  });

  test("returns 404 for unknown paths", async () => {
    const ctx = { waitUntil: jest.fn() };
    const resp = await workerFetch(
      new Request("https://example.com/unknown"),
      { WORKER_TRIGGER_SECRET: "secret123" },
      ctx
    );
    expect(resp.status).toBe(404);
    expect(ctx.waitUntil).not.toHaveBeenCalled();
  });

  test("returns 404 when secret in URL does not match", async () => {
    const ctx = { waitUntil: jest.fn() };
    const resp = await workerFetch(
      new Request("https://example.com/trigger/wrong-secret"),
      { WORKER_TRIGGER_SECRET: "correct-secret" },
      ctx
    );
    expect(resp.status).toBe(404);
    expect(ctx.waitUntil).not.toHaveBeenCalled();
  });

  test("triggers schedule and returns 200 on correct secret path", async () => {
    const ctx = { waitUntil: jest.fn() };
    mockPageContent = "<html></html>";

    const resp = await workerFetch(
      new Request("https://example.com/trigger/secret123"),
      { WORKER_TRIGGER_SECRET: "secret123", BROWSER: {} },
      ctx
    );
    expect(resp.status).toBe(200);
    expect(ctx.waitUntil).toHaveBeenCalledTimes(1);
  });
});

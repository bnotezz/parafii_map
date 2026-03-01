import { jest } from "@jest/globals";
import fetchMock from "jest-fetch-mock";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// support __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.join(__dirname, "tests", "fixtures");

// ─── Mock @cloudflare/puppeteer before any lib imports ───────────────────────
// jest.unstable_mockModule is required for ESM mocking
let mockPageContent = "";

jest.unstable_mockModule("@cloudflare/puppeteer", () => ({
  default: {
    launch: jest.fn().mockImplementation(async () => ({
      newPage: async () => ({
        setExtraHTTPHeaders: jest.fn(),
        setUserAgent: jest.fn(),
        goto: jest.fn(),
        content: jest.fn().mockImplementation(async () => mockPageContent),
      }),
      close: jest.fn(),
    })),
  },
}));

// ─── Dynamic imports (must come AFTER unstable_mockModule calls) ──────────────
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

// ─── fetch mock setup ─────────────────────────────────────────────────────────
beforeAll(() => {
  fetchMock.enableMocks();
});

beforeEach(() => {
  fetchMock.resetMocks();
  mockPageContent = ""; // reset browser mock content before each test
});

// ─── Fake env with BROWSER binding ───────────────────────────────────────────
const makeBrowserEnv = () => ({
  BROWSER: {}, // puppeteer.launch receives this; our mock ignores it
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

    // Make the mocked browser page return the opys fixture for every page load
    mockPageContent = opysHtml;

    const env = makeBrowserEnv();
    const cases = await parseCases(opysList, env);

    expect(Array.isArray(cases)).toBe(true);
    expect(cases.length).toBeGreaterThan(10);

    expect(cases[0].opys).toBe("4");
    expect(cases[0].sprava).toBe("1");
    expect(cases[0].name).toMatch(/Березно/);
    expect(cases[0].url).toMatch(/\/upload\/2021\/April\/OElzU21ITG1HSEExQlE9PQ\.pdf$/);

    cases.forEach((caseItem) => {
      expect(caseItem).toHaveProperty("opys");
      expect(caseItem).toHaveProperty("sprava");
      expect(caseItem).toHaveProperty("name");
      expect(caseItem).toHaveProperty("url");
      expect(caseItem.url).toMatch(/^https?:\/\//);
    });
  });

  test("fetchMainPage returns HTML via browser binding", async () => {
    mockPageContent = mainHtml;
    const html = await fetchMainPage(makeBrowserEnv());
    expect(html).toBe(mainHtml);
  });

  test("fetchOpysPage returns HTML via browser binding", async () => {
    mockPageContent = opysHtml;
    const html = await fetchOpysPage("https://rv.archives.gov.ua/opys/1", makeBrowserEnv());
    expect(html).toBe(opysHtml);
  });
});

// ─── Encoding helpers ─────────────────────────────────────────────────────────
describe("encoding helpers", () => {
  test("utf8ToBase64 and base64ToUtf8 round-trip", () => {
    const plain = "Hello, 世界";
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

    const newContent = "{}";
    await expect(updateGithubFile(env, newContent, 0)).resolves.toBeUndefined();

    const putCall = fetchMock.mock.calls[1];
    expect(putCall[0]).toMatch(/repos\/owner\/repo\/contents\//);
    expect(putCall[1].method).toBe("PUT");
    const body = JSON.parse(putCall[1].body);
    expect(body.content).toBe(utf8ToBase64(newContent));
  });

  test("skips update when content is unchanged", async () => {
    const existingBase64 = utf8ToBase64("same");
    fetchMock.mockResponses([JSON.stringify({ sha: "abc", content: existingBase64 }), { status: 200 }]);

    await expect(updateGithubFile(env, "same", 1)).resolves.toBeUndefined();
    expect(fetchMock.mock.calls.length).toBe(1);
  });
});

// ─── Worker fetch handler ─────────────────────────────────────────────────────
describe("worker fetch handler", () => {
  const workerFetch = worker.default.fetch.bind(worker.default);

  test("returns 200 OK when SKIP_SCHEDULE is set", async () => {
    const dummyContext = { waitUntil: jest.fn() };
    const resp = await workerFetch(
      new Request("https://example.com/"),
      { SKIP_SCHEDULE: "1" },
      dummyContext
    );
    expect(resp.status).toBe(200);
    expect(dummyContext.waitUntil).not.toHaveBeenCalled();
  });

  test("returns 404 for unknown paths", async () => {
    const dummyContext = { waitUntil: jest.fn() };
    const resp = await workerFetch(
      new Request("https://example.com/unknown"),
      { WORKER_TRIGGER_SECRET: "secret123" },
      dummyContext
    );
    expect(resp.status).toBe(404);
    expect(dummyContext.waitUntil).not.toHaveBeenCalled();
  });

  test("triggers schedule on correct secret path", async () => {
    const dummyContext = { waitUntil: jest.fn() };
    // fetchMainPage will be called inside handleSchedule - mock the browser content
    mockPageContent = "<html></html>";

    const resp = await workerFetch(
      new Request("https://example.com/trigger/secret123"),
      { WORKER_TRIGGER_SECRET: "secret123", ...makeBrowserEnv() },
      dummyContext
    );
    expect(resp.status).toBe(200);
    expect(dummyContext.waitUntil).toHaveBeenCalledTimes(1);
  });
});
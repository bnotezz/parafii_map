import { jest } from "@jest/globals";
import {
  parseOpysList,
  parseCases,
  fetchMainPage,
  fetchOpysPage,
  utf8ToBase64,
  base64ToUtf8,
  updateGithubFile,
  formatCasesAsJSON,
} from "./lib.js";

// jest fetch mock setup
import fetchMock from "jest-fetch-mock";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// support __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// directory containing HTML snapshots for parsing tests
const FIXTURES_DIR = path.join(__dirname, "tests", "fixtures");


beforeAll(() => {
  fetchMock.enableMocks();
});

beforeEach(() => {
  fetchMock.resetMocks();
});

describe("parsing helpers with HTML snapshots", () => {
  // load fixtures once
  const mainHtml = fs.readFileSync(path.join(FIXTURES_DIR, "main.html"), "utf-8");
  const opysHtml = fs.readFileSync(path.join(FIXTURES_DIR, "opys.html"), "utf-8");

  test("parseOpysList returns a non‑empty list from the main snapshot", () => {
    const list = parseOpysList(mainHtml);
    expect(Array.isArray(list)).toBe(true);
    // fixture contains 6 entries
    expect(list.length).toBe(6);

    // first entry should match the snapshot content
    expect(list[0].opysNumber).toBe("4");
    expect(list[0].opysUrl).toMatch(/annotation=6$/);

    // each entry should look sane
    list.forEach((o) => {
      expect(o).toHaveProperty("opysNumber");
      expect(o).toHaveProperty("opysUrl");
      expect(o.opysUrl).toMatch(/^https?:\/\//);
    });
  });

  test("parseCases correctly interprets the opys snapshot", async () => {
    const opysList = parseOpysList(mainHtml);
    expect(opysList.length).toBeGreaterThan(0);

    // simulate network fetch of the opys page using the second snapshot
    fetchMock.mockResponse(opysHtml);

    const cases = await parseCases(opysList);
    expect(Array.isArray(cases)).toBe(true);
    expect(cases.length).toBeGreaterThan(10);

    // first parsed case should correspond to opys #4 sprava #1 from the fixture
    expect(cases[0].opys).toBe("4");
    expect(cases[0].sprava).toBe("1");
    expect(cases[0].name).toMatch(/Березно/);
    expect(cases[0].url).toMatch(/\/upload\/2021\/April\/OElzU21ITG1HSEExQlE9PQ\.pdf$/);

    // each case should contain all required fields
    cases.forEach((caseItem) => {
      expect(caseItem).toHaveProperty("opys");
      expect(caseItem).toHaveProperty("sprava");
      expect(caseItem).toHaveProperty("name");
      expect(caseItem).toHaveProperty("url");
      expect(caseItem.url).toMatch(/^https?:\/\//);
    });
  });
});

describe("encoding helpers", () => {
  test("utf8ToBase64 and base64ToUtf8 round-trip", () => {
    const plain = "Hello, 世界";
    const encoded = utf8ToBase64(plain);
    const decoded = base64ToUtf8(encoded);
    expect(decoded).toBe(plain);
  });
});

describe("formatting helpers", () => {
  test("formatCasesAsJSON produces valid JSON with proper indentation", () => {
    const cases = [
      { opys: "1", sprava: "1", name: "case1", url: "http://example.com/1" },
      { opys: "2", sprava: "2", name: "case2", url: "http://example.com/2" },
    ];
    const json = formatCasesAsJSON(cases);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(cases);
    expect(json).toContain("  "); // verify 2-space indentation
  });
});

// import fetch handler from index for manual trigger test
import * as worker from "./index.js";
const { fetch: workerFetch, handleSchedule } = worker;

describe("github update logic", () => {
  const env = {
    GITHUB_REPO: "owner/repo",
    GITHUB_TOKEN: "token",
    GITHUB_BRANCH: "main",
  };

  test("create file when 404 returned", async () => {
    // simulate get returning 404 and put returning ok
    fetchMock
      .mockResponses(
        ["Not found", { status: 404 }],
        ["{\"content\":\"ignored\"}", { status: 200 }]
      );

    const newContent = "{}";
    await expect(updateGithubFile(env, newContent, 0)).resolves.toBeUndefined();

    // second call put should have been made
    const putCall = fetchMock.mock.calls[1];
    expect(putCall[0]).toMatch(/repos\/owner\/repo\/contents\//);
    expect(putCall[1].method).toBe("PUT");
    const body = JSON.parse(putCall[1].body);
    expect(body.content).toBe(utf8ToBase64(newContent));
  });

  test("skip update when content is unchanged", async () => {
    const existingBase64 = utf8ToBase64("same");
    const getResp = {
      sha: "abc",
      content: existingBase64,
    };
    fetchMock.mockResponses([JSON.stringify(getResp), { status: 200 }]);

    await expect(updateGithubFile(env, "same", 1)).resolves.toBeUndefined();
    // only the GET call should have been made
    expect(fetchMock.mock.calls.length).toBe(1);
  });
});

// ensure the worker exposes a manual HTTP trigger
describe("worker fetch handler", () => {
  test("returns 200 OK (skip schedule flag)", async () => {
    const dummyContext = { waitUntil: jest.fn() };
    const resp = await workerFetch(new Request("/"), { SKIP_SCHEDULE: "1" }, dummyContext);
    expect(resp.status).toBe(200);
    // skip flag means we don't actually schedule work
    expect(dummyContext.waitUntil).not.toHaveBeenCalled();
  });
});


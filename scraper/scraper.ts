import * as fs from 'fs/promises';
import * as path from 'path';
import crypto from 'crypto';
import { parseOpysList, parseCasesFromHtml, CaseEntry } from './parser';

const RIVNE_MAIN_URL = "https://rv.archives.gov.ua/ocifrovani-sprav?period=5&fund=5";
const RIVNE_OUTPUT = path.resolve(__dirname, '../data/fond_P720.json');
const JEWARCHIVE_OUTPUT = path.resolve(__dirname, '../data/jewarchive.json');
const SCRAPE_DO_TOKEN = process.env.SCRAPE_DO_TOKEN;

const SESSION_ID = crypto.randomBytes(8).toString('hex');

// ==========================================
// UTILS
// ==========================================

function chunkArray<T>(array: T[], size: number): T[][] {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
}

// ==========================================
// 1. RIVNE ARCHIVE SCRAPER (Protected)
// ==========================================

// This function now just does ONE job: makes the request. No loops here.
async function fetchFromScrapeDo(targetUrl: string, render: boolean): Promise<string> {
    const apiUrl = new URL("http://api.scrape.do/");
    apiUrl.searchParams.append("token", SCRAPE_DO_TOKEN!);
    apiUrl.searchParams.append("url", targetUrl);
    apiUrl.searchParams.append("session", SESSION_ID);

    if (render) {
        apiUrl.searchParams.append("render", "true");
    }

    const response = await fetch(apiUrl.toString());
    if (!response.ok) {
        throw new Error(`Scrape.do API returned status ${response.status}`);
    }
    
    return await response.text();
}

async function smartFetchHtml(targetUrl: string, retries = 3): Promise<string> {
    console.log(`\n🌐 Requesting with JS render: ${targetUrl}`);
    
    for (let i = 0; i < retries; i++) {
        try {
            // Go straight to the 5-credit request. The 1-credit request is a proven trap here.
            const html = await fetchFromScrapeDo(targetUrl, true);
            
            // Validate that we actually got past the Turnstile page
            if (html.includes('Just a moment...') || html.includes('зачекайте')) {
                console.log(`   ⚠️ Render solved, but hit challenge text. Retrying (${i + 1}/${retries})...`);
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }
            
            console.log(`   ⚡ Success!`);
            return html;
            
        } catch (e: any) {
            console.log(`   ⚠️ Request failed (${e.message}). Retrying (${i + 1}/${retries})...`);
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    throw new Error(`Cloudflare bypass failed completely after ${retries} render attempts for ${targetUrl}`);
}

async function scrapeRivneArchive() {
    console.log("\n==========================================");
    console.log("🚀 Starting Rivne Archive Scraper...");
    console.log("==========================================");

    if (!SCRAPE_DO_TOKEN) {
        console.error("❌ Error: SCRAPE_DO_TOKEN is not set. Skipping Rivne scrape.");
        return;
    }

    try {
        const mainHtml = await smartFetchHtml(RIVNE_MAIN_URL);
        const opysList = parseOpysList(mainHtml, RIVNE_MAIN_URL);

        if (opysList.length === 0) {
            console.error("❌ No opys entries found. Structure might have changed.");
            return;
        }

        const MAX_CONCURRENT = 4;
        const chunks = chunkArray(opysList, MAX_CONCURRENT);
        const allCasesNested: CaseEntry[][] = [];

        console.log(`\n📦 Processing ${opysList.length} subpages in ${chunks.length} batches...`);

        for (const [index, chunk] of chunks.entries()) {
            console.log(`\n🔄 Batch ${index + 1}/${chunks.length}`);
            
            const chunkPromises = chunk.map(async (opys) => {
                const opysHtml = await smartFetchHtml(opys.opysUrl);
                const pageCases = parseCasesFromHtml(opysHtml, opys.opysNumber, opys.opysUrl);
                console.log(`   ✅ Found ${pageCases.length} cases for opys ${opys.opysNumber}`);
                return pageCases;
            });

            const chunkResults = await Promise.all(chunkPromises);
            allCasesNested.push(...chunkResults);
            
            if (index < chunks.length - 1) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        const newCases: CaseEntry[] = allCasesNested.flat();

        let oldCasesData = "";
        try { oldCasesData = await fs.readFile(RIVNE_OUTPUT, 'utf-8'); } catch (e) {}

        const newCasesData = JSON.stringify(newCases, null, 2);

        if (oldCasesData === newCasesData) {
            console.log(`\n🛑 Rivne data is identical (${newCases.length} records). Skipping save.`);
        } else {
            await fs.mkdir(path.dirname(RIVNE_OUTPUT), { recursive: true });
            await fs.writeFile(RIVNE_OUTPUT, newCasesData, 'utf-8');
            console.log(`\n🎉 Rivne data saved! ${newCases.length} records to ${RIVNE_OUTPUT}`);
        }

    } catch (error) {
        console.error("❌ Rivne scraping failed:", error);
    }
}

// ==========================================
// 2. JEWARCHIVE SCRAPER (Unprotected API)
// ==========================================

interface JewArchiveItem {
    name: string;
    path: string;
    isDirectory: boolean;
    size: number;
    uri: string;
    [key: string]: any; 
}

async function scrapeJewArchive() {
    console.log("\n==========================================");
    console.log("🚀 Starting JewArchive API Fetcher...");
    console.log("==========================================");

    const url = "https://jewarchive.cdn.express/~/api/directory?path=/spravy";

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`JewArchive API failed with status ${response.status}`);
        }

        const json = await response.json();
        
        if (!json.status || !Array.isArray(json.data)) {
            throw new Error("JewArchive returned unexpected JSON structure.");
        }

        const parsedData = json.data
            .filter((item: JewArchiveItem) => !item.isDirectory && item.name.endsWith('.pdf'))
            .map((item: JewArchiveItem) => {
                // Remove '.pdf' and split by '-'
                const nameWithoutExt = item.name.replace(/\.pdf$/i, '');
                const parts = nameWithoutExt.split('-');

                return {
                    name: item.name,
                    fond: parts[0] || "",
                    opys: parts[1] || "",
                    // If sprava has internal dashes (e.g., "1-a"), join the remaining parts
                    sprava: parts.slice(2).join('-') || "",
                    size: item.size,
                    url: `https://jewarchive.cdn.express${item.uri}`
                };
            });

        let oldData = "";
        try { oldData = await fs.readFile(JEWARCHIVE_OUTPUT, 'utf-8'); } catch (e) {}

        const newDataString = JSON.stringify(parsedData, null, 2);

        if (oldData === newDataString) {
            console.log(`\n🛑 JewArchive data is identical (${parsedData.length} records). Skipping save.`);
        } else {
            await fs.mkdir(path.dirname(JEWARCHIVE_OUTPUT), { recursive: true });
            await fs.writeFile(JEWARCHIVE_OUTPUT, newDataString, 'utf-8');
            console.log(`\n🎉 JewArchive data saved! ${parsedData.length} records to ${JEWARCHIVE_OUTPUT}`);
        }

    } catch (error) {
        console.error("❌ JewArchive fetching failed:", error);
    }
}

// ==========================================
// MAIN RUNNER
// ==========================================

async function runAllScrapers() {
    // Run sequentially so logs don't overlap wildly
    await scrapeJewArchive();
    await scrapeRivneArchive();
}

runAllScrapers();
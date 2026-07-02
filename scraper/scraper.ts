import * as fs from 'fs/promises';
import * as path from 'path';
import crypto from 'crypto';
import { parseOpysList, parseCasesFromHtml, CaseEntry } from './parser';

const RIVNE_MAIN_URL = "https://rv.archives.gov.ua/ocifrovani-sprav?period=5&fund=5";
const RIVNE_OUTPUT = path.resolve(__dirname, '../data/fond_P720.json');
const JEWARCHIVE_OUTPUT = path.resolve(__dirname, '../data/jewarchive.json');
const SCRAPE_DO_TOKEN = process.env.SCRAPE_DO_TOKEN;

const SESSION_ID = crypto.randomBytes(8).toString('hex');

// Файли для збору логів під Healthchecks.io
const ERROR_LOG_PATH = path.resolve(__dirname, 'error.log');
const SUMMARY_PATH = path.resolve(__dirname, 'summary.txt');

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

// Функція для логування критичних помилок
async function logError(context: string, error: any) {
    const errorMessage = `[${new Date().toISOString()}] ❌ Error in ${context}:\n${error?.stack || error?.message || error}\n\n`;
    await fs.appendFile(ERROR_LOG_PATH, errorMessage, 'utf-8');
}

// Функція для накопичення успішних метрик
async function appendSummary(text: string) {
    await fs.appendFile(SUMMARY_PATH, text + "\n", 'utf-8');
}

// ==========================================
// 1. RIVNE ARCHIVE SCRAPER (Protected)
// ==========================================

async function fetchHTML(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    const body = await response.text();
    if(body.includes('Just a moment...') || body.includes('зачекайте')) {
        throw new Error(`Cloudflare challenge detected for ${url}`);
    }
    else if(body.includes('Access Denied') || body.includes('403 Forbidden')) {
        throw new Error(`Access denied for ${url}`);
    }
    else if(!body.includes('decision-files-wrapper')) {
        throw new Error(`No results available for ${url}`);
    }
    return body;
}

// This function now just does ONE job: makes the request. No loops here.
async function fetchFromScrapeDo(targetUrl: string, render: boolean): Promise<string> {
    const apiUrl = new URL("http://api.scrape.do/");
    apiUrl.searchParams.append("token", SCRAPE_DO_TOKEN!);
    apiUrl.searchParams.append("url", targetUrl);
    apiUrl.searchParams.append("session", SESSION_ID);

    if (render) {
        apiUrl.searchParams.append("render", "true");
        apiUrl.searchParams.append("waitUntil", "networkidle2");
        apiUrl.searchParams.append("blockResources", "false"); // 30 seconds
    }

    const response = await fetch(apiUrl.toString());
    if (!response.ok) {
        throw new Error(`Scrape.do API returned status ${response.status}`);
    }
    
    return await response.text();
}

async function smartFetchHtml(targetUrl: string, retries = 3): Promise<string> {
    console.log(`\n🌐 Requesting with JS render: ${targetUrl}`);

    //try simple fetch first
    try {
        const html = await fetchHTML(targetUrl);
        console.log(`   ⚡ Success with simple fetch!`);
        return html;
    } catch (e: any) {
        console.log(`   ⚠️ Simple fetch failed (${e.message}). Falling back to Scrape.do...`);
    }
    
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
        const errStr = "SCRAPE_DO_TOKEN is not set. Skipping Rivne scrape.";
        console.error(`❌ Error: ${errStr}`);
        await logError("Rivne Scraper Init", new Error(errStr));
        return;
    }

    try {
        const mainHtml = await smartFetchHtml(RIVNE_MAIN_URL);
        const opysList = parseOpysList(mainHtml, RIVNE_MAIN_URL);

        if (opysList.length === 0) {
            const errStr = "No opys entries found. Structure might have changed.";
            console.error(`❌ ${errStr}`);
            throw new Error(errStr);
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

        let oldCasesCount = 0;
        try { 
            const oldCasesData = await fs.readFile(RIVNE_OUTPUT, 'utf-8'); 
            const oldCases = JSON.parse(oldCasesData);
            if (Array.isArray(oldCases)) oldCasesCount = oldCases.length;
        } catch (e) {}

        const newCasesData = JSON.stringify(newCases, null, 2);

        if (oldCasesCount === newCasesData.length) {
            console.log(`\n⚪ Rivne data is identical (${newCases.length} records). Skipping save.`);
            await appendSummary(`📊 Rivne Archive: No changes. Identical records count: ${newCases.length}`);
        } else {
            await fs.mkdir(path.dirname(RIVNE_OUTPUT), { recursive: true });
            await fs.writeFile(RIVNE_OUTPUT, newCasesData, 'utf-8');
            console.log(`\n🎉 Rivne data saved! ${newCases.length} records to ${RIVNE_OUTPUT}`);

            const diff = newCases.length - oldCasesCount;
            await appendSummary(`📊 Rivne Archive Updated:\n   - Was: ${oldCasesCount} records\n   - Now: ${newCases.length} records\n   - Diff: ${diff > 0 ? '+' : ''}${diff}`);
        }

    } catch (error) {
        console.error("❌ Rivne scraping failed:", error);
        await logError("Rivne Scraper Core", error);
        throw error; // Кидаємо виключення далі, щоб крок Actions зафейлився
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

       let oldDataCount = 0;
        try { 
            const oldData = await fs.readFile(JEWARCHIVE_OUTPUT, 'utf-8'); 
            const oldDataJson = JSON.parse(oldData);
            if (Array.isArray(oldDataJson)) oldDataCount = oldDataJson.length;
        } catch (e) {}
        
        const newDataString = JSON.stringify(parsedData, null, 2);

        if (oldDataCount === parsedData.length) {
            console.log(`\n⚪ JewArchive data is identical (${parsedData.length} records). Skipping save.`);
            await appendSummary(`📊 JewArchive: No changes. Identical records count: ${parsedData.length}`);
        } else {
            await fs.mkdir(path.dirname(JEWARCHIVE_OUTPUT), { recursive: true });
            await fs.writeFile(JEWARCHIVE_OUTPUT, newDataString, 'utf-8');
            console.log(`\n🎉 JewArchive data saved! ${parsedData.length} records to ${JEWARCHIVE_OUTPUT}`);
            
            const diff = parsedData.length - oldDataCount;
            await appendSummary(`📊 JewArchive Updated:\n   - Was: ${oldDataCount} records\n   - Now: ${parsedData.length} records\n   - Diff: ${diff > 0 ? '+' : ''}${diff}`);
        }

    } catch (error) {
        console.error("❌ JewArchive fetching failed:", error);
        await logError("JewArchive Fetcher", error);
        throw error;
    }
}

// ==========================================
// MAIN RUNNER
// ==========================================

async function runAllScrapers() {
    try{
        // Очищаємо старі тимчасові файли
        await fs.rm(SUMMARY_PATH, { force: true });
        await fs.rm(ERROR_LOG_PATH, { force: true });
        // Run sequentially so logs don't overlap wildly
        await scrapeJewArchive();
        await scrapeRivneArchive();
    } catch (criticalError) {
        // Якщо хоч один скрапер кинув помилку, завершуємо процес з кодом 1, 
        // щоб GitHub Actions зрозумів, що сталась аварія.
        process.exit(1);
    }
}

runAllScrapers();
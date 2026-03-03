export interface OpysEntry {
    opysNumber: string;
    opysUrl: string;
}

export interface CaseEntry {
    opys: string;
    sprava: string;
    name: string;
    url: string;
}

export function parseOpysList(html: string, baseUrl: string): OpysEntry[] {
    const opysList: OpysEntry[] = [];
    const opysRegex = /<tr>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    
    let match;
    while ((match = opysRegex.exec(html))) {
        opysList.push({
            opysNumber: match[1].trim(),
            // Decode HTML entities in the URL
            opysUrl: new URL(match[2].trim().replace(/&amp;/g, '&'), baseUrl).href
        });
    }
    return opysList;
}

export function parseCasesFromHtml(html: string, opysNumber: string, baseUrl: string): CaseEntry[] {
    const pageCases: CaseEntry[] = [];
    // Creating regex inside the function ensures lastIndex resets properly on each call
    const caseRegex = /<tr>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<p[^>]*>\s*([^<]+?)\s*<\/p>[\s\S]*?<\/a>/g;
    
    let match;
    while ((match = caseRegex.exec(html))) {
        pageCases.push({
            opys: opysNumber,
            sprava: match[1].trim(),
            name: match[3].trim(),
            // Decode HTML entities in the URL
            url: new URL(match[2].trim().replace(/&amp;/g, '&'), baseUrl).href,
        });
    }
    return pageCases;
}
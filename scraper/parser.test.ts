import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parseOpysList, parseCasesFromHtml } from './parser';

const MAIN_URL = "https://rv.archives.gov.ua/ocifrovani-sprav?period=5&fund=5";
const MOCK_DIR = path.join(__dirname, '__mocks__');

describe('Archive Parser', () => {
    let mainHtml: string;
    let opysHtml: string;

    // Load mock HTML files once before running the tests
    beforeAll(async () => {
        mainHtml = await fs.readFile(path.join(MOCK_DIR, 'main.html'), 'utf-8');
        opysHtml = await fs.readFile(path.join(MOCK_DIR, 'opys.html'), 'utf-8');
    });

    describe('parseOpysList', () => {
        it('should correctly extract opys entries from the main page', () => {
            const result = parseOpysList(mainHtml, MAIN_URL);
            
            // Assert we found entries
            expect(result.length).toBeGreaterThan(0);
            
            // Validate the shape and data of the first entry
            expect(result[0]).toHaveProperty('opysNumber');
            expect(result[0]).toHaveProperty('opysUrl');
            expect(result[0].opysUrl).toContain('https://rv.archives.gov.ua/');

            // Check if data parsed correctly (using known values from the mock)
            expect(result.length).toBe(6);
            expect(result[0].opysNumber).toBe('4');
            expect(result[0].opysUrl).toBe('https://rv.archives.gov.ua/ocifrovani-sprav?period=5&&fund=5&&annotation=6');

        });

        it('should return an empty array if no matches are found', () => {
            const emptyHtml = `<html><body><table><tr><td>No data here</td></tr></table></body></html>`;
            const result = parseOpysList(emptyHtml, MAIN_URL);
            expect(result).toHaveLength(0);
        });
    });

    describe('parseCasesFromHtml', () => {
        it('should correctly extract case entries from an opys page', () => {
            const testOpysNumber = "1";
            const result = parseCasesFromHtml(opysHtml, testOpysNumber, MAIN_URL);
            
            // Assert we found cases
            expect(result.length).toBeGreaterThan(0);
            
            // Validate the first case
            const firstCase = result[0];
            expect(firstCase.opys).toBe(testOpysNumber);
            expect(firstCase).toHaveProperty('sprava');
            expect(firstCase).toHaveProperty('name');
            expect(firstCase).toHaveProperty('url');
            expect(firstCase.url).toContain('https://rv.archives.gov.ua/');

            // Check if data parsed correctly (using known values from the mock)
            expect(result.length).toBe(827);
            expect(firstCase.sprava).toBe('1');
            expect(firstCase.name).toBe('Церковно-метрична книга  про народження, шлюб, смерть,  м. Березно, 1903-1908рр.');
            expect(firstCase.url).toBe('https://rv.archives.gov.ua/upload/2021/April/OElzU21ITG1HSEExQlE9PQ.pdf');

            const lastCase = result[result.length - 1];
            expect(lastCase.sprava).toBe('825');
            expect(lastCase.name).toBe('Церковно-метрична книга про народження, шлюб, смерть, с. Тинне (с. Золотіїв), 1925-1925 рр');
            expect(lastCase.url).toBe('https://rv.archives.gov.ua/upload/2022/March/UE5kdFBLalN4SDJZNFE9PQ.pdf');
        });
    });
});
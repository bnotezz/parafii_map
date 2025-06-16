import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { baseUrl } from '../lib/env.cjs';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to get today's date in YYYY-MM-DD format
function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

// Function to safely encode URI components
function safeEncodeURIComponent(str) {
  return encodeURIComponent(str).replace(/%20/g, '+');
}

// Function to generate sitemap XML content
async function generateSitemap() {
  const parafiiTree = (
    await import("../data/parafii_tree.json", {
      with: { type: "json" },
    })
  ).default;
  const catalog = (
    await import("../data/catalog.json", {
      with: { type: "json" },
    })
  ).default;
  
  const today = getTodayDate();

  // Start XML content
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/hierarchy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/search</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/hierarchy/others</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;

  // Add region pages
  parafiiTree.forEach((region) => {
    if (region.name !== "Інші") {
      sitemap += `  <url>
    <loc>${baseUrl}/hierarchy/${safeEncodeURIComponent(region.name)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;

      // Add district pages
      region.districts.forEach((district) => {
        sitemap += `  <url>
    <loc>${baseUrl}/hierarchy/${safeEncodeURIComponent(region.name)}/${safeEncodeURIComponent(district.name)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;

        // Add hromada pages
        district.hromadas.forEach((hromada) => {
          sitemap += `  <url>
    <loc>${baseUrl}/hierarchy/${safeEncodeURIComponent(region.name)}/${safeEncodeURIComponent(district.name)}/${safeEncodeURIComponent(hromada.name)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;
        });
      });
    }
  });

  // Add parish pages
  catalog.forEach((parish) => {
    sitemap += `  <url>
    <loc>${baseUrl}/parafia/${parish.id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
`;
  });

  // Close XML
  sitemap += `</urlset>`;

  return sitemap;
}

// Write sitemap to file
async function writeSitemap() {
  try {
    const sitemap = await generateSitemap();
    const filePath = path.join(process.cwd(), "public", "sitemap.xml");

    fs.writeFileSync(filePath, sitemap);
    console.log(`Sitemap generated at ${filePath}`);
    return true;
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return false;
  }
}

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeSitemap().catch(console.error);
}

export { generateSitemap, writeSitemap };

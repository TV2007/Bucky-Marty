#!/usr/bin/env node
// THE SCANNER — reads comics/ and writes manifest.json + sitemap.xml
// Run this after adding or changing any comic content: node scan.js

const fs = require('fs');
const path = require('path');

// 🔧 Replace this with your actual GitHub Pages URL before you go live
const BASE_URL = 'https://YOUR-USERNAME.github.io/YOUR-REPO-NAME';

const ROOT = __dirname;
const COMICS_DIR = path.join(ROOT, 'comics');
const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;

function readJSON(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return fallback;
  }
}

function findAsset(dir, baseName) {
  const exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  for (const ext of exts) {
    if (fs.existsSync(path.join(dir, baseName + ext))) {
      return baseName + ext;
    }
  }
  return null;
}

function scanChapter(seriesSlug, chapterSlug, chapterDir) {
  const chapterJson = readJSON(path.join(chapterDir, 'chapter.json'), {});
  const files = fs.readdirSync(chapterDir);

  const pages = files
    .filter((f) => IMAGE_EXT.test(f))
    .filter((f) => !/^bg(-pause)?\.(jpe?g|png|gif|webp)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const bg = findAsset(chapterDir, 'bg');

  return {
    slug: chapterSlug,
    title: chapterJson.title || chapterSlug,
    date: chapterJson.date || null,
    pages,
    bg: bg || null,
  };
}

function scanSeries(seriesSlug, seriesDir) {
  const seriesJson = readJSON(path.join(seriesDir, 'series.json'), {});
  const assetsDir = path.join(seriesDir, 'assets');

  let cover = null;
  let header = null;
  let bg = null;
  let bgPause = null;

  if (fs.existsSync(assetsDir)) {
    cover = findAsset(assetsDir, 'cover');
    header = findAsset(assetsDir, 'header');
    bg = findAsset(assetsDir, 'bg');
    bgPause = findAsset(assetsDir, 'bg-pause');
  }

  const entries = fs.readdirSync(seriesDir, { withFileTypes: true });
  const chapters = entries
    .filter((e) => e.isDirectory())
    .map((e) => scanChapter(seriesSlug, e.name, path.join(seriesDir, e.name)))
    .filter((ch) => ch.pages.length > 0)
    .sort((a, b) => {
      if (a.date && b.date) return a.date.localeCompare(b.date);
      return a.slug.localeCompare(b.slug, undefined, { numeric: true });
    });

  return {
    slug: seriesSlug,
    title: seriesJson.title || seriesSlug,
    shortName: seriesJson.shortName || seriesSlug.slice(0, 4).toUpperCase(),
    description: seriesJson.description || '',
    accentColor: seriesJson.accentColor || '#7b61ff',
    theme: seriesJson.theme || null,
    backgroundMode: seriesJson.backgroundMode || 'cover',
    cover,
    header,
    bg,
    bgPause,
    chapters,
  };
}

function main() {
  console.log('Scanning comics/…\n');

  if (!fs.existsSync(COMICS_DIR)) {
    console.error('  ✗  No comics/ folder found.');
    process.exit(1);
  }

  const seriesFolders = fs
    .readdirSync(COMICS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory());

  const series = [];

  for (const folder of seriesFolders) {
    const seriesDir = path.join(COMICS_DIR, folder.name);
    const seriesJsonPath = path.join(seriesDir, 'series.json');
    if (!fs.existsSync(seriesJsonPath)) {
      console.log(`  ⚠  Skipping "${folder.name}" — no series.json found`);
      continue;
    }
    const s = scanSeries(folder.name, seriesDir);
    series.push(s);
    console.log(`  ✓  ${s.title} (${s.chapters.length} chapter${s.chapters.length === 1 ? '' : 's'})`);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    series,
  };

  fs.writeFileSync(path.join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Build sitemap.xml
  const urls = [`${BASE_URL}/`, `${BASE_URL}/about.html`, `${BASE_URL}/archive.html`];
  for (const s of series) {
    urls.push(`${BASE_URL}/series.html?s=${s.slug}`);
    for (const ch of s.chapters) {
      urls.push(`${BASE_URL}/reader.html?s=${s.slug}&ch=${ch.slug}`);
    }
  }

  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
    `\n</urlset>\n`;

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

  console.log(`\nmanifest.json written — ${series.length} series total.`);
  console.log(`sitemap.xml written — ${urls.length} URLs.`);
}

main();

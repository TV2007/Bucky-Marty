// Powers the series page — loads one series' chapter list.
// 💡 Browser tab title for this page is set below — update "Your Comic Site" if you rename your site.
const SITE_NAME = 'Your Comic Site';

function setFooterYear() {
  document.querySelectorAll('.js-year').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

async function loadManifest() {
  const res = await fetch('manifest.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('manifest missing');
  return res.json();
}

function readProgress(seriesSlug) {
  try {
    return JSON.parse(localStorage.getItem(`progress:${seriesSlug}`) || 'null');
  } catch {
    return null;
  }
}

function renderSeries(series) {
  document.body.setAttribute('data-theme', series.theme || '');
  document.title = `${series.title} — ${SITE_NAME}`;

  const header = document.getElementById('series-header');
  const bgMode = series.backgroundMode || 'cover';
  const bgUrl = series.bg ? `comics/${series.slug}/assets/${series.bg}` : null;
  const bgLayer = bgUrl
    ? `<div class="bg-layer ${bgMode === 'tile' ? 'tile' : ''}" style="background-image:url('${bgUrl}')"></div>`
    : '';

  const logoHtml = series.header
    ? `<img class="series-logo" src="comics/${series.slug}/assets/${series.header}" alt="${series.title}">`
    : `<h1>${series.title}</h1>`;

  header.style.setProperty('--card-accent', series.accentColor);
  header.innerHTML = `
    ${bgLayer}
    <div class="header-content">
      ${logoHtml}
      <p>${series.description || ''}</p>
    </div>`;

  const progress = readProgress(series.slug);
  const list = document.getElementById('chapter-list');

  if (!series.chapters.length) {
    list.innerHTML = '<div class="empty-state">No chapters yet.</div>';
    return;
  }

  list.innerHTML = series.chapters
    .map((ch) => {
      const isContinue = progress && progress.chapter === ch.slug;
      return `
      <a class="chapter-row" href="reader.html?s=${encodeURIComponent(series.slug)}&ch=${encodeURIComponent(ch.slug)}">
        <div>
          <div class="chapter-title">${ch.title}${isContinue ? '<span class="continue-badge">Continue</span>' : ''}</div>
          <div class="chapter-meta">${ch.pages.length} page${ch.pages.length === 1 ? '' : 's'}${ch.date ? ' · ' + ch.date : ''}</div>
        </div>
      </a>`;
    })
    .join('');
}

async function init() {
  setFooterYear();
  const slug = getParam('s');
  const grid = document.getElementById('chapter-list');

  try {
    const manifest = await loadManifest();
    const series = (manifest.series || []).find((s) => s.slug === slug);
    if (!series) {
      document.getElementById('series-header').innerHTML = '<div class="header-content"><h1>Series not found</h1></div>';
      grid.innerHTML = '<div class="empty-state">That series doesn\'t exist. <a href="index.html">Back home</a></div>';
      return;
    }
    renderSeries(series);
  } catch (err) {
    grid.innerHTML = '<div class="empty-state">Could not load series. Run <code>node scan.js</code>.</div>';
    console.error(err);
  }
}

init();

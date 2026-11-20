// Powers the homepage — loads series cards + the latest updates feed.

function setFooterYear() {
  document.querySelectorAll('.js-year').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

async function loadManifest() {
  const res = await fetch('manifest.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('manifest missing');
  return res.json();
}

function coverSrc(series) {
  if (series.cover) return `comics/${series.slug}/assets/${series.cover}`;
  return null;
}

function renderSeriesGrid(series) {
  const grid = document.getElementById('series-grid');
  if (!series.length) {
    grid.innerHTML = '<div class="empty-state">No series yet. Add one in comics/ and run node scan.js.</div>';
    return;
  }

  grid.innerHTML = series
    .map((s) => {
      const cover = coverSrc(s);
      const coverHtml = cover
        ? `<img src="${cover}" alt="${s.title} cover" loading="lazy">`
        : `<div class="cover-placeholder">📖</div>`;
      return `
        <a class="series-card" style="--card-accent:${s.accentColor}" href="series.html?s=${encodeURIComponent(s.slug)}">
          <div class="cover-wrap">${coverHtml}</div>
          <div class="card-body">
            <h3>${s.title}</h3>
            <p>${s.description || ''}</p>
          </div>
        </a>`;
    })
    .join('');
}

function renderUpdates(series) {
  const list = document.getElementById('updates-list');
  const updates = [];

  series.forEach((s) => {
    s.chapters.forEach((ch) => {
      updates.push({
        seriesTitle: s.title,
        seriesSlug: s.slug,
        shortName: s.shortName,
        accentColor: s.accentColor,
        chapterTitle: ch.title,
        chapterSlug: ch.slug,
        date: ch.date,
      });
    });
  });

  updates.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (!updates.length) {
    list.innerHTML = '<div class="empty-state">No updates yet.</div>';
    return;
  }

  list.innerHTML = updates
    .slice(0, 8)
    .map(
      (u) => `
      <a class="update-row" href="reader.html?s=${encodeURIComponent(u.seriesSlug)}&ch=${encodeURIComponent(u.chapterSlug)}">
        <span class="tag" style="--tag-color:${u.accentColor}">${u.shortName}</span>
        <span class="update-title">${u.chapterTitle}</span>
        <span class="update-date">${u.date || ''}</span>
      </a>`
    )
    .join('');
}

async function init() {
  setFooterYear();
  try {
    const manifest = await loadManifest();
    renderSeriesGrid(manifest.series || []);
    renderUpdates(manifest.series || []);
  } catch (err) {
    document.getElementById('series-grid').innerHTML =
      '<div class="empty-state">Could not load series. Run <code>node scan.js</code>.</div>';
    document.getElementById('updates-list').innerHTML = '';
    console.error(err);
  }
}

init();

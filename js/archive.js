// Powers the archive page — every chapter from every series in one list.

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

function renderArchive(series) {
  const wrap = document.getElementById('archive-wrap');

  if (!series.length) {
    wrap.innerHTML = '<div class="empty-state">No comics yet.</div>';
    return;
  }

  wrap.innerHTML = series
    .map((s) => {
      if (!s.chapters.length) return '';
      const rows = s.chapters
        .map(
          (ch) => `
          <a class="chapter-row" href="reader.html?s=${encodeURIComponent(s.slug)}&ch=${encodeURIComponent(ch.slug)}">
            <div>
              <div class="chapter-title">${ch.title}</div>
              <div class="chapter-meta">${ch.pages.length} page${ch.pages.length === 1 ? '' : 's'}${ch.date ? ' · ' + ch.date : ''}</div>
            </div>
          </a>`
        )
        .join('');
      return `
        <div class="archive-group">
          <h3>${s.title}</h3>
          <div class="chapter-list">${rows}</div>
        </div>`;
    })
    .join('');
}

async function init() {
  setFooterYear();
  try {
    const manifest = await loadManifest();
    renderArchive(manifest.series || []);
  } catch (err) {
    document.getElementById('archive-wrap').innerHTML =
      '<div class="empty-state">Could not load archive. Run <code>node scan.js</code>.</div>';
    console.error(err);
  }
}

init();

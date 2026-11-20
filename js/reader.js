// Powers the reader — page navigation, swipe, zoom, keyboard shortcuts, chapter jump.
const SITE_NAME = 'Your Comic Site';

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function setParam(name, value) {
  const url = new URL(window.location.href);
  url.searchParams.set(name, value);
  window.history.replaceState({}, '', url);
}

async function loadManifest() {
  const res = await fetch('manifest.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('manifest missing');
  return res.json();
}

function saveProgress(seriesSlug, chapterSlug, pageIndex) {
  localStorage.setItem(
    `progress:${seriesSlug}`,
    JSON.stringify({ chapter: chapterSlug, page: pageIndex })
  );
}

const state = {
  manifest: null,
  series: null,
  chapter: null,
  pageIndex: 0,
};

function pageSrc() {
  const file = state.chapter.pages[state.pageIndex];
  return `comics/${state.series.slug}/${state.chapter.slug}/${file}`;
}

function renderBackground() {
  const wrap = document.getElementById('reader-bg');
  const bgFile = state.chapter.bg || state.series.bg;
  const bgMode = state.series.backgroundMode || 'cover';
  if (!bgFile) {
    wrap.style.backgroundImage = 'none';
    return;
  }
  const dir = state.chapter.bg ? `comics/${state.series.slug}/${state.chapter.slug}` : `comics/${state.series.slug}/assets`;
  wrap.style.backgroundImage = `url('${dir}/${bgFile}')`;
  wrap.classList.toggle('tile', bgMode === 'tile');
}

function renderChapterSelect() {
  const select = document.getElementById('chapter-select');
  select.innerHTML = state.series.chapters
    .map(
      (ch) =>
        `<option value="${ch.slug}" ${ch.slug === state.chapter.slug ? 'selected' : ''}>${ch.title}</option>`
    )
    .join('');
}

function renderPage() {
  const img = document.getElementById('page-image');
  img.src = pageSrc();
  img.alt = `${state.chapter.title} — page ${state.pageIndex + 1}`;

  document.getElementById('page-counter').textContent = `Page ${state.pageIndex + 1} of ${state.chapter.pages.length}`;
  document.title = `${state.chapter.title} — ${state.series.title}`;

  document.getElementById('prev-btn').disabled = state.pageIndex === 0 && isFirstChapter();
  document.getElementById('next-btn').disabled = state.pageIndex === state.chapter.pages.length - 1 && isLastChapter();

  setParam('p', state.pageIndex + 1);
  saveProgress(state.series.slug, state.chapter.slug, state.pageIndex);
}

function chapterIndex() {
  return state.series.chapters.findIndex((c) => c.slug === state.chapter.slug);
}
function isFirstChapter() {
  return chapterIndex() === 0;
}
function isLastChapter() {
  return chapterIndex() === state.series.chapters.length - 1;
}

function goToChapter(slug, pageIndex = 0) {
  const ch = state.series.chapters.find((c) => c.slug === slug);
  if (!ch) return;
  state.chapter = ch;
  state.pageIndex = Math.max(0, Math.min(pageIndex, ch.pages.length - 1));
  setParam('ch', slug);
  renderChapterSelect();
  renderBackground();
  renderPage();
}

function nextPage() {
  if (state.pageIndex < state.chapter.pages.length - 1) {
    state.pageIndex++;
    renderPage();
  } else if (!isLastChapter()) {
    const next = state.series.chapters[chapterIndex() + 1];
    goToChapter(next.slug, 0);
  }
}

function prevPage() {
  if (state.pageIndex > 0) {
    state.pageIndex--;
    renderPage();
  } else if (!isFirstChapter()) {
    const prev = state.series.chapters[chapterIndex() - 1];
    goToChapter(prev.slug, prev.pages.length - 1);
  }
}

function openLightbox() {
  const overlay = document.getElementById('lightbox');
  document.getElementById('lightbox-img').src = pageSrc();
  overlay.classList.add('open');
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
}
function toggleLightbox() {
  const overlay = document.getElementById('lightbox');
  overlay.classList.contains('open') ? closeLightbox() : openLightbox();
}

function toggleShortcuts() {
  document.getElementById('shortcuts-panel').classList.toggle('open');
}

function setupSwipe() {
  const wrap = document.getElementById('reader-page-wrap');
  let startX = null;

  wrap.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  });

  wrap.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) {
      dx < 0 ? nextPage() : prevPage();
    }
    startX = null;
  });
}

function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      nextPage();
    } else if (e.key === 'ArrowLeft') {
      prevPage();
    } else if (e.key.toLowerCase() === 'z') {
      toggleLightbox();
    } else if (e.key === '?') {
      toggleShortcuts();
    } else if (e.key === 'Escape') {
      closeLightbox();
      document.getElementById('shortcuts-panel').classList.remove('open');
    }
  });
}

function setupClicks() {
  document.getElementById('zone-prev').addEventListener('click', prevPage);
  document.getElementById('zone-next').addEventListener('click', nextPage);
  document.getElementById('page-image').addEventListener('click', openLightbox);
  document.getElementById('lightbox').addEventListener('click', closeLightbox);
  document.getElementById('prev-btn').addEventListener('click', prevPage);
  document.getElementById('next-btn').addEventListener('click', nextPage);
  document.getElementById('zoom-btn').addEventListener('click', openLightbox);
  document.getElementById('help-btn').addEventListener('click', toggleShortcuts);
  document.getElementById('chapter-select').addEventListener('change', (e) => goToChapter(e.target.value, 0));
}

async function init() {
  document.querySelectorAll('.js-year').forEach((el) => (el.textContent = new Date().getFullYear()));

  const seriesSlug = getParam('s');
  const chapterSlug = getParam('ch');
  const pageParam = parseInt(getParam('p'), 10);
  const main = document.getElementById('reader-main');

  try {
    const manifest = await loadManifest();
    const series = (manifest.series || []).find((s) => s.slug === seriesSlug);
    if (!series) throw new Error('series not found');

    document.body.setAttribute('data-theme', series.theme || '');

    const chapter = series.chapters.find((c) => c.slug === chapterSlug) || series.chapters[0];
    if (!chapter) throw new Error('no chapters');

    state.manifest = manifest;
    state.series = series;
    state.chapter = chapter;
    state.pageIndex = Number.isInteger(pageParam) && pageParam > 0 ? pageParam - 1 : 0;

    renderChapterSelect();
    renderBackground();
    renderPage();
    setupClicks();
    setupSwipe();
    setupKeyboard();

    document.getElementById('series-link').href = `series.html?s=${encodeURIComponent(series.slug)}`;
    document.getElementById('series-link').textContent = series.title;
  } catch (err) {
    main.innerHTML = '<div class="empty-state">Could not load this comic. Run <code>node scan.js</code> or check the link.</div>';
    console.error(err);
  }
}

init();

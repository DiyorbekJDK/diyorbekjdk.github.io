/* ================================================
   DIYORBEK JDK — Portfolio v2.5 | script.js
   ================================================ */

'use strict';

// ── Utilities ──────────────────────────────────
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// ── Device / capability flags ──────────────────
const isTouchDevice  = window.matchMedia('(pointer: coarse)').matches;
const isMobile       = isTouchDevice || window.innerWidth <= 900;
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/*
 * Rain: 35 drops on desktop / 10 on mobile.
* Duration 2–5 seconds — faster than before, but still atmospheric.
*
* Particles: 55 / 25 (increased on mobile for visibility).
* Speed ​​reduced: 10–18 seconds to ensure a slower hover.
 */
const RAIN_COUNT     = isMobile ? 10 : 35;
const PARTICLE_COUNT = isMobile ? 25 : 55;

// ── DOM refs ───────────────────────────────────
const html          = document.documentElement;
const worldsEl      = $('#worldsContainer');
const btnCode       = $('#btn-code');
const btnDesign     = $('#btn-design');
const navPill       = $('#navPill');
const cursorDot     = $('.cursor-dot');
const cursorRing    = $('.cursor-ring');
const themeToggle   = $('#theme-toggle');
const moonIcon      = $('.icon-moon');
const sunIcon       = $('.icon-sun');
const repoGrid      = $('#repo-grid');
const codeWorldEl   = $('#codeWorld');
const designWorldEl = $('#designWorld');
const backToTopBtn  = $('#back-to-top');

// ── Accent colours per world ───────────────────
const ACCENTS = {
  code:   { accent: '#39ff8a', dim: 'rgba(57,255,138,0.15)',  glow: 'rgba(57,255,138,0.35)'  },
  design: { accent: '#ff2d78', dim: 'rgba(255,45,120,0.15)',  glow: 'rgba(255,45,120,0.35)'  },
};

function setAccent(world) {
  const a = ACCENTS[world];
  html.style.setProperty('--accent',      a.accent);
  html.style.setProperty('--accent-dim',  a.dim);
  html.style.setProperty('--accent-glow', a.glow);
}
setAccent('code');

// ── Custom Cursor (desktop only) ───────────────
let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

if (!isTouchDevice && cursorDot && cursorRing) {
  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorDot.style.transform = `translate(${mouseX}px,${mouseY}px) translate(-50%,-50%)`;
  });

  (function animateRing() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    cursorRing.style.transform = `translate(${ringX}px,${ringY}px) translate(-50%,-50%)`;
    requestAnimationFrame(animateRing);
  })();

  document.addEventListener('mouseover', e => {
    if (e.target.closest('a,button,.repo-card,.bento-card,.slide,.carousel-btn,.cert-card'))
      cursorRing.classList.add('hovering');
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('a,button,.repo-card,.bento-card,.slide,.carousel-btn,.cert-card'))
      cursorRing.classList.remove('hovering');
  });
}

// ── Theme Toggle ───────────────────────────────
let isDark = true;
themeToggle?.addEventListener('click', () => {
  isDark = !isDark;
  html.setAttribute('data-theme', isDark ? 'dark' : 'light');
  moonIcon.style.display = isDark ? 'block' : 'none';
  sunIcon.style.display  = isDark ? 'none'  : 'block';
});

// ── World Navigation ───────────────────────────
let currentWorld = 0;

function scrollToWorld(index) {
  worldsEl.scrollTo({ left: window.innerWidth * index, behavior: 'smooth' });
}

function updateNav(index) {
  if (index === currentWorld) return;
  currentWorld = index;
  const isCode = index === 0;
  btnCode.classList.toggle('active',   isCode);
  btnDesign.classList.toggle('active', !isCode);
  btnCode.setAttribute('aria-pressed',   String(isCode));
  btnDesign.setAttribute('aria-pressed', String(!isCode));
  navPill.style.transform = isCode ? 'translateX(0)' : 'translateX(100%)';
  setAccent(isCode ? 'code' : 'design');
  triggerReveal(isCode ? '#codeWorld' : '#designWorld');
  updateBackToTop();
}

let scrollTicking = false;
worldsEl.addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    updateNav(worldsEl.scrollLeft / window.innerWidth > 0.5 ? 1 : 0);
    scrollTicking = false;
  });
}, { passive: true });

// ── Nav pill — mirror actual button width ──────
function syncNavPill() {
  if (!navPill || !btnCode) return;
  const w = btnCode.getBoundingClientRect().width;
  if (w > 0) navPill.style.width = w + 'px';
}

// ── Reveal Animations ──────────────────────────
function triggerReveal(selector) {
  const world = $(selector);
  if (!world) return;
  $$('.reveal-up', world).forEach(el => {
    el.classList.remove('playing');
    void el.offsetWidth;
    el.classList.add('playing');
  });
}

const io = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('playing'); }),
    { threshold: 0.12 }
);
$$('.reveal-up').forEach(el => io.observe(el));

$$('.world').forEach(world => {
  world.addEventListener('scroll', () => {
    $$('.reveal-up', world).forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9)
        el.classList.add('playing');
    });
  }, { passive: true });
});

// ── Rain (Code World) ──────────────────────────
function initRain() {
  const container = $('#rainContainer');
  if (!container || prefersReduced) return;
  container.innerHTML = '';
  const frag = document.createDocumentFragment();

  for (let i = 0; i < RAIN_COUNT; i++) {
    const drop = document.createElement('div');
    drop.className = 'drop';

    const dur    = (Math.random() * 3  + 2).toFixed(1);       // 2 – 5 s
    const delay  = (Math.random() * 10).toFixed(1);
    const height = Math.floor(Math.random() * 40 + 40);        // 40 – 80 px
    const opa    = (Math.random() * 0.25 + 0.30).toFixed(2);  // 0.30 – 0.55
    const width  = Math.random() > 0.70 ? '2' : '1.5';

    drop.style.cssText = `
      left:               ${(Math.random() * 100).toFixed(1)}%;
      animation-duration: ${dur}s;
      animation-delay:   -${delay}s;
      height:             ${height}px;
      opacity:            ${opa};
      width:              ${width}px;
    `;
    frag.appendChild(drop);
  }
  container.appendChild(frag);
}

// ── Particles (Design World) ───────────────────
function initParticles() {
  const container = $('#particlesContainer');
  if (!container || prefersReduced) return;
  container.innerHTML = '';
  const symbols = ['✦', '+', '◇', '○', '×', '△', '◦'];
  const frag = document.createDocumentFragment();

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = document.createElement('div');
    p.className   = 'particle';
    p.textContent = symbols[Math.floor(Math.random() * symbols.length)];

    // Extended time: 10-18 seconds for slow vaping
    const dur   = (Math.random() * 8 + 10).toFixed(1);
    const delay = (Math.random() * 12).toFixed(1);

    p.style.cssText = `
      left:               ${(Math.random() * 100).toFixed(1)}%;
      animation-duration: ${dur}s;
      animation-delay:   -${delay}s;
      font-size:          ${Math.floor(Math.random() * 8 + 10)}px;
    `;
    frag.appendChild(p);
  }
  container.appendChild(frag);
}

// ── GitHub Repos ───────────────────────────────
async function fetchRepos() {
  if (!repoGrid) return;
  try {
    const res = await fetch(
        'https://api.github.com/users/diyorbekjdk/repos?sort=updated&per_page=6',
        { headers: { Accept: 'application/vnd.github.v3+json' } }
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const repos = await res.json();
    if (!repos.length) throw new Error('No repos');

    const langColors = {
      Kotlin:'#A97BFF', Python:'#3572A5', JavaScript:'#F1E05A',
      TypeScript:'#3178C6', 'C#':'#178600', 'C++':'#F34B7D',
      Java:'#B07219', HTML:'#E34C26', CSS:'#563D7C', Dart:'#00B4AB',
    };

    repoGrid.innerHTML = repos.map(r => {
      const lang  = r.language || 'Code';
      const color = langColors[lang] || '#888';
      return `
        <a href="${r.html_url}" target="_blank" rel="noopener noreferrer" class="repo-card">
          <h4>${r.name}</h4>
          <p class="repo-desc">${r.description || 'No description available.'}</p>
          <div class="repo-meta">
            <span class="repo-lang" style="background:${color}22;color:${color};border-color:${color}44;">${lang}</span>
            <span class="repo-arrow" aria-hidden="true">→</span>
          </div>
        </a>`;
    }).join('');

    if (!isTouchDevice) {
      $$('.repo-card', repoGrid).forEach(c => {
        c.addEventListener('mouseenter', () => cursorRing?.classList.add('hovering'));
        c.addEventListener('mouseleave', () => cursorRing?.classList.remove('hovering'));
      });
    }
  } catch (err) {
    console.warn('GitHub fetch failed:', err.message);
    repoGrid.innerHTML = `
      <p style="grid-column:1/-1;text-align:center;color:var(--text-muted);font-size:.9rem;padding:40px 0;">
        Could not load repositories.
        <a href="https://github.com/diyorbekjdk" target="_blank" rel="noopener noreferrer"
           style="color:var(--code-accent);">View on GitHub →</a>
      </p>`;
  }
}

// ── Certificate Lightbox ───────────────────────
function initLightbox() {
  const lightbox    = $('#cert-lightbox');
  const overlay     = $('#lb-overlay');
  const closeBtn    = $('#lb-close');
  const img         = $('#lb-img');
  const placeholder = $('#lb-placeholder');
  const caption     = $('#lb-caption');
  if (!lightbox) return;

  function open(src, title) {
    img.style.display         = 'none';
    placeholder.style.display = 'none';
    if (caption) caption.textContent = title || '';

    lightbox.style.display = 'flex';
    requestAnimationFrame(() =>
        requestAnimationFrame(() => lightbox.classList.add('lb-open'))
    );

    img.onload  = () => { img.style.display = 'block'; };
    img.onerror = () => {
      img.style.display         = 'none';
      placeholder.style.display = 'flex';
    };
    img.alt = title || 'Certificate';
    img.src = src;
  }

  function close() {
    lightbox.classList.remove('lb-open');
    setTimeout(() => { lightbox.style.display = 'none'; img.src = ''; }, 310);
  }

  $$('.cert-card').forEach(card => {
    card.addEventListener('click', () => open(card.dataset.img || '', card.dataset.title || ''));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(card.dataset.img || '', card.dataset.title || ''); }
    });
  });

  closeBtn?.addEventListener('click', close);
  overlay?.addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && lightbox.classList.contains('lb-open')) close();
  });

  lightbox.style.display = 'none';
}

// ── Carousel ───────────────────────────────────
(function initCarousel() {
  const track   = $('#carouselTrack');
  const dotsEl  = $('#carouselDots');
  const prevBtn = $('#prevBtn');
  const nextBtn = $('#nextBtn');
  if (!track) return;

  const slides = $$('.slide', track);
  const total  = slides.length;
  let current  = Math.floor(total / 2);
  let timer    = null;
  let dragStart= null;
  let dragging = false;
  let dragAxis = null;

  function slideGap() {
    const vw = window.innerWidth;
    if (vw <= 480) return 220;
    if (vw <= 760) return 260;
    return 320;
  }

  // ── Dots ──
  slides.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'carousel-dot' + (i === current ? ' active' : '');
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Slide ${i + 1}`);
    dot.setAttribute('aria-selected', String(i === current));
    dot.addEventListener('click', () => { goTo(i); startAuto(); });
    dotsEl.appendChild(dot);
  });

  function updateDots() {
    $$('.carousel-dot', dotsEl).forEach((d, i) => {
      d.classList.toggle('active', i === current);
      d.setAttribute('aria-selected', String(i === current));
    });
  }

  function layout() {
    const gap = slideGap();
    slides.forEach((slide, i) => {
      let diff = i - current;
      if (diff < -Math.floor(total / 2)) diff += total;
      if (diff >  Math.floor(total / 2)) diff -= total;

      const absD    = Math.abs(diff);
      const tx      = diff * gap;
      const scale   = diff === 0 ? 1.18 : clamp(1 - absD * 0.12, 0.7, 1);
      const opacity = diff === 0 ? 1    : clamp(1 - absD * 0.25, 0.35, 0.7);
      const z       = diff === 0 ? 10   : 10 - absD;

      const blur = isMobile
          ? (absD > 0 ? 2 : 0)
          : absD * 3;

      slide.style.transform = `translateX(${tx}px) scale(${scale})`;
      slide.style.opacity   = opacity;
      slide.style.filter    = blur > 0 ? `blur(${blur}px)` : '';
      slide.style.zIndex    = z;
    });
    updateDots();
  }

  function goTo(i)  { current = ((i % total) + total) % total; layout(); }
  function next()   { goTo(current + 1); }
  function prev()   { goTo(current - 1); }
  function startAuto() { stopAuto(); timer = setInterval(next, 3800); }
  function stopAuto()  { clearInterval(timer); }

  nextBtn?.addEventListener('click', () => { next(); startAuto(); });
  prevBtn?.addEventListener('click', () => { prev(); startAuto(); });
  document.addEventListener('keydown', e => {
    if (currentWorld !== 1) return;
    if (e.key === 'ArrowRight') { next(); startAuto(); }
    if (e.key === 'ArrowLeft')  { prev(); startAuto(); }
  });

  // ── Drag / Swipe ──
  const dragEl = $('#carouselOuter') || track;

  function onDragStart(x, y) {
    dragStart = { x, y };
    dragging  = true;
    dragAxis  = null;
    stopAuto();
  }

  function onDragMove(x, y) {
    if (!dragging || !dragStart) return false;
    if (!dragAxis) {
      const dx = Math.abs(x - dragStart.x);
      const dy = Math.abs(y - dragStart.y);
      if (dx > 8 || dy > 8) dragAxis = dx >= dy ? 'x' : 'y';
    }
    return dragAxis === 'x';
  }

  function onDragEnd(x) {
    if (!dragging || dragStart === null) return;
    dragging = false;
    const d = x - dragStart.x;
    const shouldSlide = (dragAxis === null || dragAxis === 'x') && Math.abs(d) > 40;
    if (shouldSlide) d < 0 ? next() : prev();
    dragStart = null;
    dragAxis  = null;
    startAuto();
  }

  // Mouse
  dragEl.addEventListener('mousedown', e => { e.preventDefault(); onDragStart(e.pageX, e.pageY); });
  window.addEventListener('mouseup',   e => onDragEnd(e.pageX));

  // Touch
  dragEl.addEventListener('touchstart', e => {
    onDragStart(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  dragEl.addEventListener('touchmove', e => {
    if (onDragMove(e.touches[0].clientX, e.touches[0].clientY)) e.preventDefault();
  }, { passive: false });

  dragEl.addEventListener('touchend', e => onDragEnd(e.changedTouches[0].clientX));

  dragEl.addEventListener('mouseenter', stopAuto);
  dragEl.addEventListener('mouseleave', startAuto);
  window.addEventListener('resize', layout, { passive: true });

  layout();
  startAuto();
})();

// ── Smooth Tilt on bento cards (desktop only) ──
if (!isTouchDevice && window.matchMedia('(hover: hover)').matches) {
  $$('.bento-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const rx = clamp((e.clientY - r.top  - r.height / 2) / (r.height / 2) * -6, -6, 6);
      const ry = clamp((e.clientX - r.left - r.width  / 2) / (r.width  / 2) *  6, -6, 6);
      card.style.transform = `translateY(-5px) perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

// ── Progress bar animation ──────────────────────
function animateProgressBars() {
  $$('.prog-fill').forEach(bar => {
    const target = bar.style.width;
    bar.style.width = '0%';
    requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = target; }));
  });
}

// ── Mobile Notice ──────────────────────────────
function initMobileNotice() {
  if (!isMobile && !isTouchDevice) return;
  if (sessionStorage.getItem('notice-dismissed')) return;
  const notice   = $('#mobile-notice');
  const closeBtn = $('#close-notice');
  if (!notice) return;

  setTimeout(() => {
    notice.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => notice.classList.add('is-visible')));
  }, 1200);

  function dismiss() {
    notice.classList.remove('is-visible');
    sessionStorage.setItem('notice-dismissed', '1');
    setTimeout(() => { notice.hidden = true; }, 460);
  }
  closeBtn?.addEventListener('click', dismiss);
}

// ── Back to Top ────────────────────────────────
function updateBackToTop() {
  if (!backToTopBtn) return;
  const world   = currentWorld === 0 ? codeWorldEl : designWorldEl;
  const visible = world && world.scrollTop > 380;
  if (visible) {
    backToTopBtn.hidden = false;
    requestAnimationFrame(() => backToTopBtn.classList.add('is-visible'));
  } else {
    backToTopBtn.classList.remove('is-visible');
    setTimeout(() => {
      if (!backToTopBtn.classList.contains('is-visible')) backToTopBtn.hidden = true;
    }, 360);
  }
}

function initBackToTop() {
  if (!backToTopBtn) return;
  [codeWorldEl, designWorldEl].forEach(w =>
      w?.addEventListener('scroll', updateBackToTop, { passive: true })
  );
  backToTopBtn.addEventListener('click', () => {
    const w = currentWorld === 0 ? codeWorldEl : designWorldEl;
    w?.scrollTo({ top: 0, behavior: 'smooth' });
  });
  backToTopBtn.hidden = true;
}

// ── Boot ───────────────────────────────────────
window.addEventListener('load', () => {
  syncNavPill();
  initRain();
  initParticles();
  fetchRepos();
  animateProgressBars();
  initMobileNotice();
  initBackToTop();
  initLightbox();
  triggerReveal('#codeWorld');
});

window.addEventListener('resize', syncNavPill, { passive: true });
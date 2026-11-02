const boxes = [...document.querySelectorAll('.checks input[type="checkbox"]')];
const count = document.getElementById('count');
const meter = document.getElementById('meter');
const storageKey = 'digital-noise-guide-plan-v1';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

document.querySelectorAll('a[data-smooth-scroll]').forEach(link => {
  link.addEventListener('click', event => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', link.getAttribute('href'));
  });
});

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
  boxes.forEach((box, index) => { box.checked = saved[index] === true; });
} catch {
  // Хранилище может быть отключено; чек-лист при этом продолжит работать.
}

const hint = document.getElementById('plan-hint');
const resetButton = document.getElementById('plan-reset');
const defaultHint = hint ? hint.textContent : '';

function hintFor(selected) {
  if (selected === 0) return defaultHint;
  if (selected <= 2) return 'Хорошее начало. Попробуй выбранное несколько дней и посмотри, удобно ли тебе.';
  if (selected < boxes.length) return 'Неплохой набор. Если станет тяжело, оставь один-два шага и начни с них.';
  return 'Выбрано всё. Не обязательно начинать сразу со всего: пробуй по одному шагу.';
}

function updatePlan() {
  const selected = boxes.filter(box => box.checked).length;
  count.textContent = `Выбрано: ${selected} из ${boxes.length}`;
  if (hint) hint.textContent = hintFor(selected);
  if (resetButton) resetButton.hidden = selected === 0;
  meter.style.width = `${selected / boxes.length * 100}%`;
  meter.parentElement.setAttribute('aria-label', `Выбрано ${selected} из ${boxes.length}`);
  meter.parentElement.setAttribute('aria-valuenow', String(selected));
  try {
    localStorage.setItem(storageKey, JSON.stringify(boxes.map(box => box.checked)));
  } catch {
    // Сохранение необязательно: отметки останутся активны до закрытия страницы.
  }
}

boxes.forEach(box => box.addEventListener('change', updatePlan));
resetButton?.addEventListener('click', () => {
  boxes.forEach(box => { box.checked = false; });
  updatePlan();
  boxes[0]?.focus();
});

// Ссылки [1], [2], [3] раскрывают нужный источник
function openSource(id) {
  const item = document.getElementById(id);
  if (!item || item.tagName !== 'DETAILS') return;
  item.open = true;
  item.classList.remove('is-cited');
  void item.offsetWidth;
  item.classList.add('is-cited');
}
document.querySelectorAll('a.cite').forEach(link => {
  link.addEventListener('click', () => openSource(link.getAttribute('href').slice(1)));
});
if (location.hash.startsWith('#src-')) openSource(location.hash.slice(1));
updatePlan();

// Плавное появление блоков при прокрутке
if ('IntersectionObserver' in window && !reduceMotion.matches) {
  document.documentElement.classList.add('js');
  const revealItems = document.querySelectorAll('.section-head, .definition, .film, .card, .step, .note, .plan, .sources details');
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  revealItems.forEach((item, index) => {
    item.classList.add('reveal');
    item.style.transitionDelay = `${(index % 3) * 60}ms`;
    revealObserver.observe(item);
  });
}

// Подсветка текущего раздела в навигации
const navLinks = [...document.querySelectorAll('.nav-links a')];
if ('IntersectionObserver' in window && navLinks.length) {
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => {
        if (link.getAttribute('href') === `#${entry.target.id}`) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main > section[id]').forEach(section => sectionObserver.observe(section));
}

// При печати раскрываем источники, затем возвращаем как было
let closedDetails = [];
window.addEventListener('beforeprint', () => {
  closedDetails = [...document.querySelectorAll('details:not([open])')];
  closedDetails.forEach(item => { item.open = true; });
});
window.addEventListener('afterprint', () => {
  closedDetails.forEach(item => { item.open = false; });
});

// Главный экран: шум, который можно сделать тише
(() => {
  const canvas = document.getElementById('signal');
  const figure = canvas ? canvas.closest('.hero-art') : null;
  const toggle = document.getElementById('quiet-toggle');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  if (!ctx || !figure) return;

  const quietKey = 'digital-noise-guide-quiet-v1';
  const hero = canvas.closest('.hero');
  const still = reduceMotion.matches;
  let quiet = false;
  try { quiet = localStorage.getItem(quietKey) === '1'; } catch { /* настройка просто не запомнится */ }

  let W = 0, H = 0, heroH = 1, lines = 9, points = [], colors = {};
  let level = quiet ? 0 : 1; // 1 — шум, 0 — тишина
  let t = 0, last = 0, raf = 0, visible = true;

  function random(seed) {
    return () => {
      seed = seed + 0x6D2B79F5 | 0;
      let x = Math.imul(seed ^ seed >>> 15, 1 | seed);
      x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
      return ((x ^ x >>> 14) >>> 0) / 4294967296;
    };
  }

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const v = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
    colors = { ink: v('--ink', '#17152b'), violet: v('--violet', '#5b4ddb'), mint: v('--mint', '#2fb894') };
  }

  function build() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height; heroH = hero ? hero.offsetHeight : H;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lines = W < 520 ? 7 : 9;
    const perLine = Math.round(Math.min(84, Math.max(40, W / 7)));
    const rand = random(20261102);
    points = [];
    for (let l = 0; l < lines; l++) {
      for (let i = 0; i < perLine; i++) {
        points.push({ l, u: i / (perLine - 1), sx: rand(), sy: rand(), a: rand() * 6.283, b: rand() * 6.283, fa: .5 + rand() * .9, fb: .4 + rand() * .8, lag: rand() });
      }
    }
  }

  function draw(n) {
    ctx.clearRect(0, 0, W, H);
    if (!W || !H) return;
    const mx = W * .05, my = H * .1, spanX = W - mx * 2, spanY = H - my * 2;
    const mid = (lines - 1) / 2, gap = spanY * .62 / (lines - 1), amp = H * .055;
    const normal = [], signal = [];
    for (const p of points) {
      const env = Math.pow(Math.sin(Math.PI * p.u), 1.3);
      const cx = mx + p.u * spanX;
      const cy = H / 2 + (p.l - mid) * gap * (.28 + .72 * env) + amp * env * Math.sin(p.u * 7.5 + t * .55 + p.l * .5);
      const nx = mx + p.sx * spanX + 10 * Math.sin(t * p.fa + p.a) + 4 * Math.sin(t * 3.1 * p.fb + p.b);
      const ny = my + p.sy * spanY + 10 * Math.cos(t * p.fb + p.b) + 4 * Math.cos(t * 2.7 * p.fa + p.a);
      const k = Math.min(1, Math.max(0, n * 1.35 - p.lag * .35)); // точки успокаиваются не одновременно
      const e = k * k * (3 - 2 * k);
      (p.l === mid ? signal : normal).push(cx + (nx - cx) * e, cy + (ny - cy) * e);
    }
    const dots = (list, r) => { ctx.beginPath(); for (let i = 0; i < list.length; i += 2) { ctx.moveTo(list[i] + r, list[i + 1]); ctx.arc(list[i], list[i + 1], r, 0, 6.283); } ctx.fill(); };
    ctx.globalAlpha = .2 + .3 * (1 - n);
    ctx.fillStyle = colors.ink;
    dots(normal, 1.3);
    const g = ctx.createLinearGradient(mx, 0, W - mx, 0);
    g.addColorStop(0, colors.violet); g.addColorStop(1, colors.mint);
    const lineAlpha = Math.max(0, 1 - n / .55);
    if (lineAlpha > 0) {
      ctx.globalAlpha = lineAlpha * .9;
      ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < signal.length; i += 2) { if (i) ctx.lineTo(signal[i], signal[i + 1]); else ctx.moveTo(signal[i], signal[i + 1]); }
      ctx.stroke();
    }
    ctx.globalAlpha = .95;
    ctx.fillStyle = g;
    dots(signal, 2.1);
    ctx.globalAlpha = 1;
  }

  const scrollCalm = () => still ? 1 : 1 - .75 * Math.min(1, Math.max(0, window.scrollY / (heroH * .9)));
  const render = () => draw(level * scrollCalm());

  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
    last = now; t += dt;
    level += ((quiet ? 0 : 1) - level) * (1 - Math.exp(-dt * 1.8));
    render();
    if (visible) raf = requestAnimationFrame(frame);
  }
  function start() { if (!still && visible && !raf) { last = 0; raf = requestAnimationFrame(frame); } }

  function sync() { if (toggle) toggle.setAttribute('aria-pressed', String(quiet)); }

  readColors(); build();
  if (still) { level = quiet ? 0 : .55; t = 1.2; }
  render();
  figure.classList.add('is-live');
  sync();
  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      quiet = !quiet;
      try { localStorage.setItem(quietKey, quiet ? '1' : '0'); } catch { /* без сохранения */ }
      sync();
      if (still) { level = quiet ? 0 : .55; render(); } else start();
    });
  }

  if ('ResizeObserver' in window) new ResizeObserver(() => { build(); render(); }).observe(canvas);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { readColors(); render(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) start(); }).observe(canvas);
  }
  if (still) window.addEventListener('resize', () => { build(); render(); });
  start();
})();

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

// Плавное появление блоков при прокрутке. Только с мышью или тачпадом:
// на телефоне свайп обгоняет любую анимацию, и текст проявлялся с опозданием, уже на экране
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
if ('IntersectionObserver' in window && !reduceMotion.matches && finePointer) {
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

  let W = 0, H = 0, heroH = 1, lines = 9, mid = 4, points = [], colors = {}, gradient = null;
  let plain = new Float32Array(0), signal = new Float32Array(0); // координаты точек: без нового мусора на каждом кадре
  let level = quiet ? 0 : 1; // 1 — шум, 0 — тишина
  let t = 0, last = 0, raf = 0, visible = true, calm = 1, busyUntil = 0;

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
    gradient = null;
  }

  function build() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height; heroH = hero ? hero.offsetHeight : H;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lines = W < 520 ? 7 : 9;
    mid = (lines - 1) / 2;
    const perLine = Math.round(Math.min(84, Math.max(40, W / 7)));
    const mx = W * .05, my = H * .1, spanX = W - mx * 2, spanY = H - my * 2, gap = spanY * .62 / (lines - 1);
    const rand = random(20261102);
    points = [];
    for (let l = 0; l < lines; l++) {
      for (let i = 0; i < perLine; i++) {
        // Всё, что не меняется от кадра к кадру, считаем один раз
        const u = i / (perLine - 1), env = Math.pow(Math.sin(Math.PI * u), 1.3);
        points.push({
          cx: mx + u * spanX, cy: H / 2 + (l - mid) * gap * (.28 + .72 * env), wave: H * .055 * env, phase: u * 7.5 + l * .5,
          sx: mx + rand() * spanX, sy: my + rand() * spanY, a: rand() * 6.283, b: rand() * 6.283, fa: .5 + rand() * .9, fb: .4 + rand() * .8, lag: rand(),
          signal: l === mid
        });
      }
    }
    plain = new Float32Array((lines - 1) * perLine * 2);
    signal = new Float32Array(perLine * 2);
    gradient = null;
  }

  function dots(list, count, r) {
    ctx.beginPath();
    for (let i = 0; i < count; i += 2) { ctx.moveTo(list[i] + r, list[i + 1]); ctx.arc(list[i], list[i + 1], r, 0, 6.283); }
    ctx.fill();
  }

  function draw(n) {
    ctx.clearRect(0, 0, W, H);
    if (!W || !H) return;
    const wt = t * .55;
    let a = 0, s = 0;
    for (const p of points) {
      let x = p.cx, y = p.cy + p.wave * Math.sin(p.phase + wt);
      const k = Math.min(1, Math.max(0, n * 1.35 - p.lag * .35)); // точки успокаиваются не одновременно
      if (k > 0) {
        const e = k * k * (3 - 2 * k);
        const nx = p.sx + 10 * Math.sin(t * p.fa + p.a) + 4 * Math.sin(t * 3.1 * p.fb + p.b);
        const ny = p.sy + 10 * Math.cos(t * p.fb + p.b) + 4 * Math.cos(t * 2.7 * p.fa + p.a);
        x += (nx - x) * e; y += (ny - y) * e;
      }
      if (p.signal) { signal[s++] = x; signal[s++] = y; } else { plain[a++] = x; plain[a++] = y; }
    }
    if (!gradient) {
      gradient = ctx.createLinearGradient(W * .05, 0, W * .95, 0);
      gradient.addColorStop(0, colors.violet); gradient.addColorStop(1, colors.mint);
    }
    ctx.globalAlpha = .2 + .3 * (1 - n);
    ctx.fillStyle = colors.ink;
    dots(plain, a, 1.3);
    const lineAlpha = Math.max(0, 1 - n / .55);
    if (lineAlpha > 0 && s) {
      ctx.globalAlpha = lineAlpha * .9;
      ctx.strokeStyle = gradient; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(signal[0], signal[1]);
      for (let i = 2; i < s; i += 2) ctx.lineTo(signal[i], signal[i + 1]);
      ctx.stroke();
    }
    ctx.globalAlpha = .95;
    ctx.fillStyle = gradient;
    dots(signal, s, 2.1);
    ctx.globalAlpha = 1;
  }

  // Чем ниже прокрутили главный экран, тем спокойнее точки
  const calmTarget = () => still ? 1 : 1 - .75 * Math.min(1, Math.max(0, window.scrollY / (heroH * .9)));
  const render = () => draw(level * calm);

  // Точки не замирают, даже пока страницу листают. Когда они перестраиваются (переключатель,
  // прокрутка главного экрана), рисуем каждый кадр экрана, на 120 Гц — через один.
  // Когда просто плавают, хватает 30 кадров в секунду: такое медленное движение глаз не отличит
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const target = quiet ? 0 : 1, ct = calmTarget();
    if (Math.abs(target - level) > .005 || Math.abs(ct - calm) > .005) busyUntil = now + 600;
    if (last && now - last < (now < busyUntil ? 10 : 26)) return;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
    last = now; t += dt;
    level += (target - level) * (1 - Math.exp(-dt * 1.8));
    calm += (ct - calm) * (1 - Math.exp(-dt * 3));
    render();
  }
  function start() { if (!still && visible && !document.hidden && !raf) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  function sync() { if (toggle) toggle.setAttribute('aria-pressed', String(quiet)); }

  readColors(); build();
  calm = calmTarget();
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
    new IntersectionObserver(entries => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) start(); else stop();
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  if (still) window.addEventListener('resize', () => { build(); render(); });
  start();
})();

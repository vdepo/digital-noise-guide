const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const storageKey = 'digital-noise-guide-plan-v1';
const quietKey = 'digital-noise-guide-quiet-v1';

// ---------- Режим «Тише»: один переключатель на всю страницу ----------
let quiet = root.dataset.mode === 'quiet';
const quietToggles = [...document.querySelectorAll('.quiet-toggle')];
const quietListeners = [];
let switchTimer = 0;

function syncThemeColor() {
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  if (bg) document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.setAttribute('content', bg));
}

function setQuiet(next) {
  quiet = next;
  if (!reduceMotion.matches) {
    root.classList.add('is-switching');
    clearTimeout(switchTimer);
    switchTimer = setTimeout(() => root.classList.remove('is-switching'), 800);
  }
  root.dataset.mode = quiet ? 'quiet' : 'noise';
  try { localStorage.setItem(quietKey, quiet ? '1' : '0'); } catch { /* настройка просто не запомнится */ }
  quietToggles.forEach(button => button.setAttribute('aria-pressed', String(quiet)));
  syncThemeColor();
  quietListeners.forEach(listener => listener(quiet));
}

quietToggles.forEach(button => {
  button.hidden = false;
  button.setAttribute('aria-pressed', String(quiet));
  button.addEventListener('click', () => setQuiet(!quiet));
});
syncThemeColor();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', syncThemeColor);

// ---------- Плавная прокрутка по ссылкам внутри страницы ----------
document.querySelectorAll('a[data-smooth-scroll]').forEach(link => {
  link.addEventListener('click', event => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', link.getAttribute('href'));
  });
});

// ---------- Копирование: navigator.clipboard работает только по https, поэтому есть запасной путь ----------
function legacyCopy(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(area);
  area.focus();
  area.select();
  area.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  document.body.removeChild(area);
  return ok;
}

async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* попробуем по-старому */ }
  }
  return legacyCopy(text);
}

// ---------- Мини-план ----------
const boxes = [...document.querySelectorAll('.checks input[type="checkbox"]')];
const count = document.getElementById('count');
const meter = document.getElementById('meter');
const hint = document.getElementById('plan-hint');
const resetButton = document.getElementById('plan-reset');
const copyButton = document.getElementById('plan-copy');
const defaultHint = hint ? hint.textContent : '';

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
  boxes.forEach((box, index) => { box.checked = saved[index] === true; });
} catch {
  // Хранилище может быть отключено; чек-лист при этом продолжит работать.
}

function hintFor(selected) {
  if (selected === 0) return defaultHint;
  if (selected <= 2) return 'Хорошее начало. Попробуй выбранное несколько дней и посмотри, удобно ли тебе.';
  if (selected < boxes.length) return 'Неплохой набор. Если станет тяжело, оставь один-два шага и начни с них.';
  return 'Выбрано всё. Не обязательно начинать сразу со всего: пробуй по одному шагу.';
}

function updatePlan() {
  const selected = boxes.filter(box => box.checked).length;
  if (count) count.textContent = `Выбрано: ${selected} из ${boxes.length}`;
  if (hint) hint.textContent = hintFor(selected);
  if (resetButton) resetButton.hidden = selected === 0;
  if (copyButton) copyButton.hidden = selected === 0;
  if (meter) {
    meter.style.width = `${selected / boxes.length * 100}%`;
    meter.parentElement.setAttribute('aria-label', `Выбрано ${selected} из ${boxes.length}`);
    meter.parentElement.setAttribute('aria-valuenow', String(selected));
  }
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

copyButton?.addEventListener('click', async () => {
  const chosen = boxes.filter(box => box.checked).map(box => `— ${box.closest('label').textContent.trim()}`);
  const text = ['Мой мини-план («Тише в цифре»):', ...chosen].join('\n');
  const ok = await copyText(text);
  const label = copyButton.dataset.label || copyButton.textContent;
  copyButton.dataset.label = label;
  copyButton.dataset.state = ok ? 'copied' : '';
  copyButton.textContent = ok ? 'Скопировано' : 'Не получилось';
  clearTimeout(copyButton.timer);
  copyButton.timer = setTimeout(() => { copyButton.dataset.state = ''; copyButton.textContent = label; }, 1800);
});

// ---------- Ссылки [1], [2], [3] раскрывают нужный источник ----------
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

// ---------- Бегущая строка: в режиме «Тише» замирает, важное остаётся ярким ----------
(() => {
  const ticker = document.querySelector('.ticker');
  const list = ticker?.querySelector('.ticker-list');
  if (!ticker || !list) return;
  list.parentElement.appendChild(list.cloneNode(true));
  if (!reduceMotion.matches) ticker.classList.add('is-running');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      ticker.style.animationPlayState = '';
      ticker.querySelector('.ticker-track').style.animationPlayState = entries[entries.length - 1].isIntersecting ? '' : 'paused';
    }).observe(ticker);
  }
})();

// ---------- Плавное появление блоков. Только с мышью или тачпадом: на телефоне свайп обгоняет анимацию ----------
if ('IntersectionObserver' in window && !reduceMotion.matches && finePointer) {
  root.classList.add('js');
  const revealItems = document.querySelectorAll('.band-head, .band-copy, .film, .card, .step, .note, .cta, .plan, .sources details, .outro-headline, .outro-grid');
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  revealItems.forEach((item, index) => {
    item.classList.add('reveal');
    item.style.transitionDelay = `${(index % 3) * 70}ms`;
    revealObserver.observe(item);
  });
}

// ---------- Подсветка текущего раздела и плавающая навигация ----------
const navLinks = [...document.querySelectorAll('.topnav a, .dock a[href^="#"]:not(.dock-mark)')];
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
(() => {
  const dock = document.querySelector('.dock');
  const anchor = document.querySelector('.hero-body');
  if (!dock || !anchor || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(entries => {
    const entry = entries[entries.length - 1];
    const past = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    dock.classList.toggle('is-shown', past);
    if (!past) navLinks.forEach(link => link.removeAttribute('aria-current'));
  }).observe(anchor);
})();

// ---------- При печати раскрываем источники, затем возвращаем как было ----------
let closedDetails = [];
window.addEventListener('beforeprint', () => {
  closedDetails = [...document.querySelectorAll('details:not([open])')];
  closedDetails.forEach(item => { item.open = true; });
});
window.addEventListener('afterprint', () => {
  closedDetails.forEach(item => { item.open = false; });
});

// ---------- Видео на главном экране ----------
(() => {
  const video = document.getElementById('hero-vid');
  const playButton = document.getElementById('hero-playback');
  const muteButton = document.getElementById('hero-mute');
  if (!video || !playButton || !muteButton) return;

  // manual: null — решает страница (играет без звука, в режиме «Тише» стоит), 'play'/'pause' — решил человек
  let manual = null, inView = true;

  function syncPlay() {
    const label = video.paused ? 'Включить видео' : 'Поставить видео на паузу';
    playButton.dataset.mode = video.paused ? 'play' : 'pause';
    playButton.setAttribute('aria-label', label);
    playButton.title = label;
  }
  function syncMute() {
    muteButton.setAttribute('aria-pressed', String(video.muted));
    muteButton.setAttribute('aria-label', video.muted ? 'Включить звук' : 'Выключить звук');
    muteButton.querySelector('.hero-mute-label').textContent = video.muted ? 'со звуком' : 'звук включён';
  }
  function play() { const p = video.play(); if (p && p.catch) p.catch(syncPlay); }
  function decide() {
    const wants = manual === 'play' || (manual === null && !quiet && !reduceMotion.matches);
    if (wants && inView && !document.hidden) { if (video.paused) play(); } else if (!video.paused) video.pause();
  }

  playButton.addEventListener('click', () => {
    manual = video.paused ? 'play' : 'pause';
    decide();
  });
  muteButton.addEventListener('click', () => {
    video.muted = !video.muted;
    syncMute();
    if (!video.muted && video.paused) { manual = 'play'; decide(); }
  });
  video.addEventListener('play', syncPlay);
  video.addEventListener('pause', syncPlay);
  quietListeners.push(() => { manual = null; decide(); });
  reduceMotion.addEventListener?.('change', decide);
  document.addEventListener('visibilitychange', decide);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { inView = entries[entries.length - 1].isIntersecting; decide(); }, { threshold: 0.15 }).observe(video);
  }
  video.muted = true;
  syncMute();
  syncPlay();
  decide();
})();

// ---------- Главный экран: шум, который можно сделать тише ----------
(() => {
  const canvas = document.getElementById('signal');
  const hero = canvas ? canvas.closest('.hero') : null;
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  if (!ctx || !hero) return;

  const probes = [...hero.querySelectorAll('.probe')];
  const still = reduceMotion.matches;
  let W = 0, H = 0, heroH = 1, lines = 9, mid = 4, points = [], colors = {}, gradient = null;
  let plain = new Float32Array(0), signal = new Float32Array(0); // координаты точек: без нового мусора на каждом кадре
  let level = quiet ? 0 : 1; // 1 — шум, 0 — тишина
  let t = 0, last = 0, raf = 0, visible = true, calm = 1, busyUntil = 0, colorUntil = 0;

  function random(seed) {
    return () => {
      seed = seed + 0x6D2B79F5 | 0;
      let x = Math.imul(seed ^ seed >>> 15, 1 | seed);
      x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
      return ((x ^ x >>> 14) >>> 0) / 4294967296;
    };
  }

  // Цвета берём у невидимых элементов: при смене режима CSS плавно их меняет, а холст подхватывает
  function readColors() {
    const get = (name, fallback) => {
      const probe = probes.find(item => item.dataset.probe === name);
      return probe ? getComputedStyle(probe).color : fallback;
    };
    colors = { ink: get('dot', '#1d0a03'), a: get('a', '#fff6ee'), b: get('b', '#ffd9c2') };
    gradient = null;
  }

  function build() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height; heroH = hero.offsetHeight || H;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lines = W < 520 ? 7 : 9;
    mid = (lines - 1) / 2;
    const perLine = Math.round(Math.min(120, Math.max(40, W / 9)));
    const mx = W * .02, my = H * .06, spanX = W - mx * 2, spanY = H - my * 2, gap = spanY * .66 / (lines - 1);
    const rand = random(20261102);
    points = [];
    for (let l = 0; l < lines; l++) {
      for (let i = 0; i < perLine; i++) {
        // Всё, что не меняется от кадра к кадру, считаем один раз
        const u = i / (perLine - 1), env = Math.pow(Math.sin(Math.PI * u), 1.1);
        points.push({
          cx: mx + u * spanX, cy: H / 2 + (l - mid) * gap * (.3 + .7 * env), wave: H * .06 * env, phase: u * 9 + l * .5,
          sx: mx + rand() * spanX, sy: my + rand() * spanY, a: rand() * 6.283, b: rand() * 6.283, fa: .5 + rand() * .9, fb: .4 + rand() * .8, lag: rand(),
          signal: l === mid
        });
      }
    }
    plain = new Float32Array((lines - 1) * perLine * 2);
    signal = new Float32Array(perLine * 2);
    gradient = null;
  }

  function dots(list, n, r) {
    ctx.beginPath();
    for (let i = 0; i < n; i += 2) { ctx.moveTo(list[i] + r, list[i + 1]); ctx.arc(list[i], list[i + 1], r, 0, 6.283); }
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
        const nx = p.sx + 12 * Math.sin(t * p.fa + p.a) + 5 * Math.sin(t * 3.1 * p.fb + p.b);
        const ny = p.sy + 12 * Math.cos(t * p.fb + p.b) + 5 * Math.cos(t * 2.7 * p.fa + p.a);
        x += (nx - x) * e; y += (ny - y) * e;
      }
      if (p.signal) { signal[s++] = x; signal[s++] = y; } else { plain[a++] = x; plain[a++] = y; }
    }
    if (!gradient) {
      gradient = ctx.createLinearGradient(W * .05, 0, W * .95, 0);
      gradient.addColorStop(0, colors.a); gradient.addColorStop(1, colors.b);
    }
    ctx.globalAlpha = .22 + .3 * (1 - n);
    ctx.fillStyle = colors.ink;
    dots(plain, a, 1.4);
    const lineAlpha = Math.max(0, 1 - n / .22);
    if (lineAlpha > 0 && s) {
      ctx.globalAlpha = lineAlpha * .9;
      ctx.strokeStyle = gradient; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(signal[0], signal[1]);
      for (let i = 2; i < s; i += 2) ctx.lineTo(signal[i], signal[i + 1]);
      ctx.stroke();
    }
    ctx.globalAlpha = .95;
    ctx.fillStyle = gradient;
    dots(signal, s, 2.3);
    ctx.globalAlpha = 1;
  }

  // Чем ниже прокрутили главный экран, тем спокойнее точки
  const calmTarget = () => still ? 1 : 1 - .75 * Math.min(1, Math.max(0, window.scrollY / (heroH * .9)));
  const render = () => draw(level * calm);

  // Пока точки перестраиваются, рисуем каждый кадр (на 120 Гц — через один),
  // а когда просто плавают, хватает 30 кадров в секунду
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const target = quiet ? 0 : 1, ct = calmTarget();
    if (Math.abs(target - level) > .005 || Math.abs(ct - calm) > .005) busyUntil = now + 600;
    if (last && now - last < (now < busyUntil ? 10 : 26)) return;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
    last = now; t += dt;
    if (now < colorUntil) readColors();
    level += (target - level) * (1 - Math.exp(-dt * 1.8));
    calm += (ct - calm) * (1 - Math.exp(-dt * 3));
    render();
  }
  function start() { if (!still && visible && !document.hidden && !raf) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  readColors(); build();
  calm = calmTarget();
  if (still) { level = quiet ? 0 : .55; t = 1.2; }
  render();
  hero.classList.add('is-live');

  quietListeners.push(() => {
    colorUntil = performance.now() + 900;
    if (still) { readColors(); level = quiet ? 0 : .55; render(); } else start();
  });

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

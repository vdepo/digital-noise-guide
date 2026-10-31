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
  const revealItems = document.querySelectorAll('.hero-art, .section-head, .definition, .card, .step, .note, .plan, .sources details');
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

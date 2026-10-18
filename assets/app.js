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

function updatePlan() {
  const selected = boxes.filter(box => box.checked).length;
  count.textContent = `Выбрано: ${selected} из ${boxes.length}`;
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
updatePlan();

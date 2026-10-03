// Временная версия: только переключение экранов.
const SCREENS = ['entry', 'feed', 'more'];

function show(name) {
  for (const s of SCREENS) {
    document.getElementById(`screen-${s}`).hidden = s !== name;
    const tab = document.querySelector(`.tab[data-tab="${s}"]`);
    if (s === name) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
}

for (const s of SCREENS) document.getElementById(`screen-${s}`).textContent = `Экран: ${s}`;
document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => show(tab.dataset.tab)));

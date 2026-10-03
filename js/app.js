// Запуск трекера: база, данные в памяти, переключение экранов.
import * as db from './db.js';
import { seedEmotions, seedBodyItems } from './model.js';
import { renderEntry } from './ui/entry.js';
import { renderFeed } from './ui/feed.js';
import { renderMore } from './ui/more.js';

const SCREENS = ['entry', 'feed', 'more'];
const store = { entries: [], daySummaries: [], emotions: [], bodyItems: [] };
const state = { screen: 'entry', entryId: null };

const ctx = {
  store,
  db,
  async refresh() {
    Object.assign(store, await db.exportAll());
    render();
  },
  rerender() {
    render();
  },
  navigate(screen, { entryId = null } = {}) {
    state.screen = screen;
    state.entryId = entryId;
    render();
    window.scrollTo(0, 0);
  },
};

function render() {
  for (const s of SCREENS) {
    document.getElementById(`screen-${s}`).hidden = s !== state.screen;
    const tab = document.querySelector(`.tab[data-tab="${s}"]`);
    if (s === state.screen) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
  const root = document.getElementById(`screen-${state.screen}`);
  if (state.screen === 'entry') renderEntry(root, ctx, state.entryId);
  if (state.screen === 'feed') renderFeed(root, ctx);
  if (state.screen === 'more') renderMore(root, ctx);
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => ctx.navigate(tab.dataset.tab));
});

// Вернулась в приложение (например, утром) — пересчитать «сегодня».
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) render();
});

async function start() {
  await db.seedIfEmpty({ emotions: seedEmotions(), bodyItems: seedBodyItems() });
  db.requestPersistence();
  await ctx.refresh();
}

start();

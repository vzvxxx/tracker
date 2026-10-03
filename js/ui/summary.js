// Блок «Итог дня»: автоматическая часть + своя оценка и текст.
import { h, decor } from './dom.js';
import { scale, scoreSquare } from './chips.js';
import { daySummary } from '../stats.js';
import { TEARS_LABELS, newId, nowIso, toggleCoping } from '../model.js';
import { formatSigned, formatRange, plural } from '../format.js';

let editingDay = null;
let form = null; // { ownScore, text }

export function isEditingSummary(day) {
  return editingDay === day;
}

function startEdit(day, own, ctx) {
  editingDay = day;
  form = { ownScore: own ? own.ownScore : null, text: own ? own.text : '' };
  ctx.rerender();
}

export function summaryButton(day, ctx) {
  return h('button', { type: 'button', class: 'button button--ghost', onclick: () => startEdit(day, null, ctx) },
    decor('flower'), 'Подвести итог дня');
}

const tile = (cls, value, label) => h('div', { class: `tile ${cls}` }, h('b', {}, value), h('span', {}, label));
const row = (label, value) => h('div', { class: 'summary-row' }, h('span', {}, label), h('span', {}, value));

export function summaryBlock(day, entries, ctx, maps) {
  const own = maps.summaryByDay.get(day) ?? null;
  const s = daySummary(entries, maps.emotionsById, maps.bodyById);

  const tiles = [];
  if (s.copingAvg !== null) {
    tiles.push(tile('tile--avg', formatSigned(s.copingAvg), 'справляюсь, средняя'));
    tiles.push(tile('tile--range', formatRange(s.copingMin, s.copingMax), 'разброс'));
  }
  if (s.hasEmotions) {
    tiles.push(tile('tile--load', String(s.load), 'нагрузка'));
    tiles.push(tile('tile--light', String(s.light), 'лёгкие'));
  }

  const rows = [];
  if (s.mixedCount) rows.push(row('смешанно', `${s.mixedCount} из ${s.count}`));
  if (s.frequent.length) rows.push(row('чаще всего', s.frequent.join(', ')));
  if (s.body.length) rows.push(row('тело', s.body.map((b) => `${b.name} ×${b.count}`).join(', ')));
  if (s.tears) rows.push(row('слёзы', `${s.tears.count} ${plural(s.tears.count, ['раз', 'раза', 'раз'])} · ${TEARS_LABELS[s.tears.max]}`));

  return h('section', { class: 'summary' },
    h('h3', { class: 'summary-title' }, 'Итог дня', decor('flower', 'decor decor--inline')),
    tiles.length ? h('div', { class: 'tiles' }, tiles) : null,
    rows.length ? h('div', { class: 'summary-rows' }, rows) : null,
    editingDay === day ? ownForm(day, own, ctx) : ownView(day, own, ctx));
}

function ownView(day, own, ctx) {
  if (!own) {
    return h('button', { type: 'button', class: 'button button--ghost', onclick: () => startEdit(day, null, ctx) }, 'Подвести итог дня');
  }
  return h('div', { class: 'own' },
    own.ownScore !== null ? scoreSquare(own.ownScore) : null,
    h('div', { class: 'own-text' },
      h('span', { class: 'muted' }, 'моя оценка'),
      own.text ? h('p', {}, own.text) : null),
    h('button', { type: 'button', class: 'link', onclick: () => startEdit(day, own, ctx) }, 'Изменить'));
}

function ownForm(day, own, ctx) {
  const text = h('textarea', {
    class: 'textarea',
    rows: '3',
    placeholder: 'Как прошёл день…',
    'aria-label': 'Итог дня',
    oninput: (e) => { form.text = e.target.value; },
  });
  text.value = form.text;
  return h('div', { class: 'own-form' },
    h('p', { class: 'muted' }, 'Моя оценка дня'),
    scale(form.ownScore, (v) => { form.ownScore = toggleCoping(form.ownScore, v); ctx.rerender(); }),
    text,
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'button button--small', onclick: () => saveOwn(day, own, ctx) }, 'Сохранить итог'),
      h('button', { type: 'button', class: 'link', onclick: () => { editingDay = null; form = null; ctx.rerender(); } }, 'Отмена')));
}

async function saveOwn(day, own, ctx) {
  const isEmpty = form.ownScore === null && form.text.trim() === '';
  if (isEmpty) {
    if (own) await ctx.db.deleteDaySummary(own.id);
  } else {
    const t = nowIso();
    await ctx.db.putDaySummary({
      id: own ? own.id : newId(),
      createdAt: own ? own.createdAt : t,
      updatedAt: t,
      date: day,
      ownScore: form.ownScore,
      text: form.text.trim() === '' ? '' : form.text,
    });
  }
  editingDay = null;
  form = null;
  await ctx.refresh();
}

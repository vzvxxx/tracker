// Экран «Лента»: сегодня развёрнуто, прошлые дни свёрнуты с итогом и мини-полоской.
import { h, mount, decor } from './dom.js';
import { emotionChip, scoreSquare } from './chips.js';
import { summaryBlock, summaryButton, isEditingSummary } from './summary.js';
import { downloadBackup } from './backup-actions.js';
import { backupReminder, reminderText } from '../backup.js';
import { groupByDay, isMixed, daySummary } from '../stats.js';
import { dayKey, isNight, TEARS_LABELS } from '../model.js';
import { formatDayTitle, formatTime, formatSigned } from '../format.js';

const expanded = new Set(); // какие прошлые дни сейчас развёрнуты

export function renderFeed(root, ctx) {
  const now = new Date();
  const today = dayKey(now);
  const maps = {
    emotionsById: new Map(ctx.store.emotions.map((e) => [e.id, e])),
    bodyById: new Map(ctx.store.bodyItems.map((b) => [b.id, b])),
    summaryByDay: new Map(ctx.store.daySummaries.map((s) => [s.date, s])),
  };
  const byDay = new Map(groupByDay(ctx.store.entries).map((g) => [g.day, g.entries]));
  for (const s of ctx.store.daySummaries) if (!byDay.has(s.date)) byDay.set(s.date, []);

  const todayEntries = byDay.get(today) ?? [];
  const otherDays = [...byDay.keys()].filter((d) => d !== today).sort().reverse();
  const todayHasSummary = maps.summaryByDay.has(today) || isEditingSummary(today);

  const reminder = backupReminder({
    now,
    entriesCount: ctx.store.entries.length,
    backup: ctx.store.backup,
    snoozeDay: ctx.store.backupSnooze,
    currentFingerprint: ctx.store.fingerprint,
  });

  mount(root,
    h('h1', {}, 'Лента', decor('flower', 'decor decor--inline')),
    reminder ? backupBanner(reminder, ctx) : null,
    h('h2', { class: 'day-title' }, formatDayTitle(today, today) + (isNight(now) ? ' · ночь' : '')),
    todayHasSummary ? summaryBlock(today, todayEntries, ctx, maps) : null,
    todayEntries.length ? todayEntries.map((e) => entryCard(e, ctx, maps)) : emptyDay(),
    todayHasSummary ? null : summaryButton(today, ctx),
    otherDays.length ? h('div', { class: 'decor-divider', 'aria-hidden': 'true' }, decor('flower'), decor('heart'), decor('flower')) : null,
    otherDays.map((day) => (expanded.has(day)
      ? openDay(day, byDay.get(day), ctx, maps, today)
      : dayRow(day, byDay.get(day), ctx, maps, today))));
}

// Плашка «пора сделать копию». «Позже» прячет её до завтра (граница дня 6:00).
function backupBanner(reminder, ctx) {
  const later = async () => {
    await ctx.db.putSetting({ id: 'backupSnooze', day: dayKey(new Date()) });
    await ctx.refresh();
  };
  return h('section', { class: 'backup-banner', role: 'status' },
    h('p', { class: 'backup-banner-msg' }, decor('heart'), h('span', {}, reminderText(reminder)), decor('flower')),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'button button--small', onclick: () => downloadBackup(ctx) }, 'Скачать копию'),
      h('button', { type: 'button', class: 'link', onclick: later }, 'Позже')));
}

function emptyDay() {
  return h('div', { class: 'empty-day' },
    h('div', { 'aria-hidden': 'true' }, decor('flower'), decor('heart'), decor('flower')),
    h('p', { class: 'empty-title' }, 'Сегодня пока тихо'),
    h('p', { class: 'muted' }, 'Запиши, как ты, когда захочется'));
}

function entryCard(entry, ctx, maps) {
  const chips = entry.emotions
    .map((x) => {
      const em = maps.emotionsById.get(x.emotionId);
      return em ? emotionChip(em, x.strong ? 'strong' : 'on', { small: true }) : null;
    });
  const extras = entry.body.map((id) => maps.bodyById.get(id)?.name).filter(Boolean);
  if (entry.tears) extras.push(TEARS_LABELS[entry.tears]);
  return h('button', { type: 'button', class: 'entry-card', onclick: () => ctx.navigate('entry', { entryId: entry.id }) },
    scoreSquare(entry.coping),
    h('span', { class: 'entry-card-body' },
      h('span', { class: 'entry-card-meta' },
        formatTime(entry.time),
        isMixed(entry, maps.emotionsById) ? h('span', { class: 'badge-mixed' }, 'смешанно') : null),
      chips.some(Boolean) ? h('span', { class: 'chips' }, chips) : null,
      extras.length ? h('span', { class: 'muted' }, extras.join(' · ')) : null,
      entry.text.trim() ? h('span', { class: 'entry-card-text' }, entry.text) : null));
}

function dayRow(day, entries, ctx, maps, today) {
  const s = daySummary(entries, maps.emotionsById, maps.bodyById);
  const own = maps.summaryByDay.get(day);
  const parts = [];
  if (s.copingAvg !== null) parts.push(`справляюсь ${formatSigned(s.copingAvg)}`);
  if (s.hasEmotions) parts.push(`нагрузка ${s.load}`);
  if (own && own.ownScore !== null) parts.push(`моя оценка ${formatSigned(own.ownScore)}`);
  const ordered = [...entries].sort((a, b) => (a.time < b.time ? -1 : 1));
  return h('button', {
    type: 'button',
    class: 'day-row',
    'aria-expanded': 'false',
    onclick: () => { expanded.add(day); ctx.rerender(); },
  },
  h('span', { class: 'day-row-head' }, formatDayTitle(day, today), own ? decor('heart', 'decor decor--inline') : null),
  parts.length ? h('span', { class: 'muted' }, parts.join(' · ')) : null,
  ordered.length ? h('span', { class: 'strip', 'aria-hidden': 'true' },
    ordered.map((e) => h('i', { class: 'tone strip-cell', 'data-v': e.coping === null ? 'none' : String(e.coping) }))) : null);
}

function openDay(day, entries, ctx, maps, today) {
  const own = maps.summaryByDay.get(day);
  return h('section', { class: 'day-open' },
    h('button', {
      type: 'button',
      class: 'day-row-head day-open-head',
      'aria-expanded': 'true',
      onclick: () => { expanded.delete(day); ctx.rerender(); },
    }, formatDayTitle(day, today), own ? decor('heart', 'decor decor--inline') : null),
    summaryBlock(day, entries, ctx, maps),
    entries.map((e) => entryCard(e, ctx, maps)));
}

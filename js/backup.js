// Файл резервной копии: собрать, прочитать, проверить.
import { CATS, TEARS, toYmd, dayKey } from './model.js';
import { formatDayShort, plural } from './format.js';

export const BACKUP_FORMAT = 'mood-diary-backup';
export const BACKUP_VERSION = 1;
const KEYS = ['entries', 'daySummaries', 'emotions', 'bodyItems'];

export function buildBackup(data, now = new Date()) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    entries: data.entries,
    daySummaries: data.daySummaries,
    emotions: data.emotions,
    bodyItems: data.bodyItems,
  };
}

export function backupFileName(now = new Date()) {
  return `mood-backup-${toYmd(now)}.json`;
}

const isStr = (v) => typeof v === 'string';
const isScore = (v) => v === null || (Number.isInteger(v) && v >= -5 && v <= 5);
const hasMeta = (x) => x && isStr(x.id) && isStr(x.createdAt) && isStr(x.updatedAt);

const VALID = {
  entries: (e) => hasMeta(e) && isStr(e.time) && !Number.isNaN(Date.parse(e.time)) && isScore(e.coping)
    && Array.isArray(e.emotions) && e.emotions.every((x) => x && isStr(x.emotionId) && typeof x.strong === 'boolean')
    && isStr(e.text) && Array.isArray(e.body) && e.body.every(isStr)
    && (e.tears === null || TEARS.includes(e.tears)),
  daySummaries: (s) => hasMeta(s) && /^\d{4}-\d{2}-\d{2}$/.test(s.date) && isScore(s.ownScore) && isStr(s.text),
  emotions: (e) => hasMeta(e) && isStr(e.name) && e.name.trim() !== '' && ['heavy', 'light'].includes(e.type)
    && CATS.includes(e.cat) && typeof e.order === 'number' && typeof e.hidden === 'boolean' && typeof e.favorite === 'boolean',
  bodyItems: (b) => hasMeta(b) && isStr(b.name) && b.name.trim() !== '' && typeof b.order === 'number' && typeof b.hidden === 'boolean',
};

const fail = (error) => ({ ok: false, error });

export function parseBackup(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    return fail('Это не файл копии: его не получается прочитать.');
  }
  if (!obj || obj.format !== BACKUP_FORMAT) return fail('Это не файл копии дневника.');
  if (typeof obj.version !== 'number' || obj.version > BACKUP_VERSION) {
    return fail('Копия сделана в более новой версии трекера. Обнови трекер и попробуй снова.');
  }
  for (const k of KEYS) {
    if (!Array.isArray(obj[k]) || !obj[k].every(VALID[k])) return fail('Файл копии повреждён.');
  }
  const exportedAt = isStr(obj.exportedAt) && !Number.isNaN(Date.parse(obj.exportedAt)) ? obj.exportedAt : null;
  return {
    ok: true,
    exportedAt, // когда сделана копия — станет «последней копией» после восстановления
    data: { entries: obj.entries, daySummaries: obj.daySummaries, emotions: obj.emotions, bodyItems: obj.bodyItems },
  };
}

export function describeData(data) {
  const days = data.entries.map((e) => dayKey(e.time)).sort();
  return { count: data.entries.length, from: days[0] ?? null, to: days[days.length - 1] ?? null };
}

export function describeRange({ count, from, to }) {
  const base = `${count} ${plural(count, ['запись', 'записи', 'записей'])}`;
  if (!from) return base;
  if (from === to) return `${base} (за ${formatDayShort(from)})`;
  return `${base} (с ${formatDayShort(from)} по ${formatDayShort(to)})`;
}

// ---------- Напоминание о копии ----------

export const BACKUP_EVERY_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

// Отпечаток дневника: любое изменение данных (даже одна буква или удаление) даёт другой.
export async function fingerprint(data) {
  const text = JSON.stringify(KEYS.map((k) => data[k]));
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Показывать ли плашку в «Ленте». null — не показывать.
// backup: { lastAt, fingerprint } | null; snoozeDay — день (граница 6:00), когда нажато «Позже».
export function backupReminder({ now = new Date(), entriesCount, backup, snoozeDay, currentFingerprint }) {
  if (entriesCount === 0) return null;
  if (snoozeDay === dayKey(now)) return null;
  if (!backup) return { kind: 'first' };
  if (backup.fingerprint === currentFingerprint) return null; // с прошлой копии ничего не изменилось
  const days = Math.floor((now - new Date(backup.lastAt)) / DAY_MS);
  return days >= BACKUP_EVERY_DAYS ? { kind: 'stale', days } : null;
}

export function reminderText(reminder) {
  if (reminder.kind === 'first') return 'Копий ещё не было. Сделай первую — так дневник не потеряется.';
  const days = `${reminder.days} ${plural(reminder.days, ['день', 'дня', 'дней'])}`;
  return `Последняя копия — ${days} назад. С тех пор в дневнике появилось новое.`;
}

export function describeLastBackup(backup) {
  return backup ? `Последняя копия: ${formatDayShort(toYmd(new Date(backup.lastAt)))}` : 'Копий ещё не было';
}

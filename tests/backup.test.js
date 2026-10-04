import { test, assert, assertEqual } from './runner.js';
import {
  buildBackup, backupFileName, parseBackup, describeData, describeRange,
  fingerprint, backupReminder, reminderText, describeLastBackup,
} from '../js/backup.js';
import { seedEmotions, seedBodyItems, draftToEntry, emptyDraft } from '../js/model.js';

const data = () => ({
  entries: [draftToEntry({ ...emptyDraft(), coping: -1, tears: 'cried' }, null, new Date(2026, 9, 3, 12, 0))],
  daySummaries: [{ id: 's', createdAt: 'x', updatedAt: 'x', date: '2026-10-03', ownScore: 0, text: 'ok' }],
  emotions: seedEmotions(),
  bodyItems: seedBodyItems(),
});

test('копия: формат, версия, имя файла', () => {
  const b = buildBackup(data(), new Date('2026-10-03T12:00:00.000Z'));
  assertEqual(b.format, 'mood-diary-backup');
  assertEqual(b.version, 1);
  assertEqual(b.exportedAt, '2026-10-03T12:00:00.000Z');
  assertEqual(backupFileName(new Date(2026, 9, 3, 12, 0)), 'mood-backup-2026-10-03.json');
});

test('копия: туда и обратно без потерь', () => {
  const d = data();
  const parsed = parseBackup(JSON.stringify(buildBackup(d, new Date('2026-10-03T12:00:00.000Z'))));
  assert(parsed.ok);
  assertEqual(parsed.exportedAt, '2026-10-03T12:00:00.000Z', 'дата копии нужна для «Последняя копия: …» после восстановления');
  const noDate = { ...buildBackup(d), exportedAt: 'не дата' };
  assertEqual(parseBackup(JSON.stringify(noDate)).exportedAt, null, 'нет понятной даты — null');
  assertEqual(parsed.data, d);
});

test('копия: понятные ошибки на плохих файлах', () => {
  assertEqual(parseBackup('не json'), { ok: false, error: 'Это не файл копии: его не получается прочитать.' });
  assertEqual(parseBackup('{"a":1}'), { ok: false, error: 'Это не файл копии дневника.' });
  const newer = { ...buildBackup(data()), version: 99 };
  assertEqual(parseBackup(JSON.stringify(newer)).error, 'Копия сделана в более новой версии трекера. Обнови трекер и попробуй снова.');
  const broken = { ...buildBackup(data()), entries: 'нет' };
  assertEqual(parseBackup(JSON.stringify(broken)).error, 'Файл копии повреждён.');
  const badEntry = buildBackup(data());
  badEntry.entries = [{ text: 'без id' }];
  assertEqual(parseBackup(JSON.stringify(badEntry)).error, 'Файл копии повреждён.');
  const badEmotion = buildBackup(data());
  badEmotion.emotions[0].type = 'средняя';
  assertEqual(parseBackup(JSON.stringify(badEmotion)).error, 'Файл копии повреждён.');
});

test('копия: описание для предупреждения', () => {
  assertEqual(describeData(data()), { count: 1, from: '2026-10-03', to: '2026-10-03' });
  assertEqual(describeRange({ count: 0, from: null, to: null }), '0 записей');
  assertEqual(describeRange({ count: 1, from: '2026-10-03', to: '2026-10-03' }), '1 запись (за 3 октября)');
  assertEqual(describeRange({ count: 140, from: '2026-09-01', to: '2026-10-03' }), '140 записей (с 1 сентября по 3 октября)');
});

test('отпечаток: одинаковые данные — одинаковый, любое изменение — другой', async () => {
  const d = data();
  const a = await fingerprint(d);
  assertEqual(a, await fingerprint(JSON.parse(JSON.stringify(d))), 'та же копия данных');
  assertEqual(a.length, 64, 'SHA-256 в шестнадцатеричном виде');
  const oneLetter = JSON.parse(JSON.stringify(d));
  oneLetter.daySummaries[0].text = 'ok!';
  assert(a !== await fingerprint(oneLetter), 'изменилась одна буква');
  assert(a !== await fingerprint({ ...d, entries: [] }), 'удалена запись');
});

// Напоминание о копии. Сейчас — 10 октября, 12:00.
const now = new Date(2026, 9, 10, 12, 0);
const ago = (days, hours = 0) => new Date(now.getTime() - (days * 24 + hours) * 3600 * 1000).toISOString();
const remind = (over) => backupReminder({ now, entriesCount: 5, backup: null, snoozeDay: null, currentFingerprint: 'B', ...over });

test('напоминание о копии: когда показывать', () => {
  assertEqual(remind({}), { kind: 'first' }, 'копий не было, записи есть — сразу');
  assertEqual(remind({ entriesCount: 0 }), null, 'дневник пуст — не напоминаем');
  assertEqual(remind({ backup: { lastAt: ago(6, 23), fingerprint: 'A' } }), null, 'прошло меньше 7 суток');
  assertEqual(remind({ backup: { lastAt: ago(7), fingerprint: 'A' } }), { kind: 'stale', days: 7 }, '7 суток и изменилось');
  assertEqual(remind({ backup: { lastAt: ago(30), fingerprint: 'B' } }), null, 'ничего не изменилось — терять нечего');
});

test('напоминание о копии: «Позже» прячет до завтра (граница дня 6:00)', () => {
  const stale = { lastAt: ago(9), fingerprint: 'A' };
  assertEqual(remind({ backup: stale, snoozeDay: '2026-10-10' }), null, '«Позже» нажато сегодня');
  assertEqual(remind({ backup: stale, snoozeDay: '2026-10-09' }), { kind: 'stale', days: 9 }, '«Позже» было вчера');
  const night = backupReminder({ now: new Date(2026, 9, 11, 2, 0), entriesCount: 5, backup: null, snoozeDay: '2026-10-10', currentFingerprint: 'B' });
  assertEqual(night, null, 'в 2:00 ночи ещё тот же день, что и в 23:00');
  const morning = backupReminder({ now: new Date(2026, 9, 11, 6, 0), entriesCount: 5, backup: null, snoozeDay: '2026-10-10', currentFingerprint: 'B' });
  assertEqual(morning, { kind: 'first' }, 'в 6:00 уже новый день');
});

test('напоминание о копии: тексты', () => {
  assertEqual(reminderText({ kind: 'first' }), 'Копий ещё не было. Сделай первую — так дневник не потеряется.');
  assertEqual(reminderText({ kind: 'stale', days: 8 }), 'Последняя копия — 8 дней назад. С тех пор в дневнике появилось новое.');
  assertEqual(reminderText({ kind: 'stale', days: 21 }), 'Последняя копия — 21 день назад. С тех пор в дневнике появилось новое.');
  assertEqual(reminderText({ kind: 'stale', days: 22 }), 'Последняя копия — 22 дня назад. С тех пор в дневнике появилось новое.');
  assertEqual(describeLastBackup(null), 'Копий ещё не было');
  assertEqual(describeLastBackup({ lastAt: new Date(2026, 9, 3, 21, 15).toISOString(), fingerprint: 'A' }), 'Последняя копия: 3 октября');
});

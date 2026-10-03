import { test, assert, assertEqual } from './runner.js';
import { buildBackup, backupFileName, parseBackup, describeData, describeRange } from '../js/backup.js';
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
  const parsed = parseBackup(JSON.stringify(buildBackup(d)));
  assert(parsed.ok);
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

import { test, assert, assertEqual } from './runner.js';
import * as db from '../js/db.js';
import { seedEmotions, seedBodyItems, draftToEntry, emptyDraft } from '../js/model.js';

const NAME = `test-${Date.now()}`;
const sample = () => draftToEntry({ ...emptyDraft(), coping: 1, text: 'первая' }, null);

test('база: засев стартовых справочников только один раз', async () => {
  db.useDatabase(NAME);
  assertEqual(await db.seedIfEmpty({ emotions: seedEmotions(), bodyItems: seedBodyItems() }), true);
  assertEqual(await db.seedIfEmpty({ emotions: seedEmotions(), bodyItems: seedBodyItems() }), false);
  const all = await db.exportAll();
  assertEqual(all.emotions.length, 22);
  assertEqual(all.bodyItems.length, 4);
  assertEqual(all.entries, []);
  assertEqual(all.daySummaries, []);
});

test('база: сохранить, изменить и удалить запись', async () => {
  const e = sample();
  await db.putEntry(e);
  await db.putEntry({ ...e, text: 'исправленная' });
  let all = await db.exportAll();
  assertEqual(all.entries.length, 1);
  assertEqual(all.entries[0].text, 'исправленная');
  await db.deleteEntry(e.id);
  all = await db.exportAll();
  assertEqual(all.entries.length, 0);
});

test('база: итог дня сохраняется и удаляется', async () => {
  const s = { id: 's1', createdAt: 'x', updatedAt: 'x', date: '2026-10-03', ownScore: -1, text: '' };
  await db.putDaySummary(s);
  assertEqual((await db.exportAll()).daySummaries, [s]);
  await db.deleteDaySummary('s1');
  assertEqual((await db.exportAll()).daySummaries, []);
});

test('база: replaceAll заменяет всё', async () => {
  const e = sample();
  const em = seedEmotions()[0];
  await db.replaceAll({ entries: [e], daySummaries: [], emotions: [em], bodyItems: [] });
  const all = await db.exportAll();
  assertEqual(all.entries, [e]);
  assertEqual(all.emotions, [em]);
  assertEqual(all.bodyItems, []);
});

test('база: неудачный replaceAll ничего не меняет', async () => {
  const before = await db.exportAll();
  let failed = false;
  try {
    await db.replaceAll({ entries: [{ text: 'без id' }], daySummaries: [], emotions: [], bodyItems: [] });
  } catch {
    failed = true;
  }
  assert(failed, 'должна быть ошибка');
  assertEqual(await db.exportAll(), before);
});

test('база: эмоция и пункт «Тела» удаляются насовсем', async () => {
  const em = seedEmotions()[1];
  const b = seedBodyItems()[0];
  await db.putEmotion(em);
  await db.putBodyItem(b);
  await db.deleteEmotion(em.id);
  await db.deleteBodyItem(b.id);
  const all = await db.exportAll();
  assert(!all.emotions.some((x) => x.id === em.id), 'эмоции нет');
  assert(!all.bodyItems.some((x) => x.id === b.id), 'пункта нет');
});

test('база: удаление тестовой базы', async () => {
  await db.deleteDatabase(NAME);
  db.useDatabase('mood-diary');
});

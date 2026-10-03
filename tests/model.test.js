import { test, assert, assertEqual } from './runner.js';
import {
  seedEmotions, seedBodyItems, emptyDraft, isDraftEmpty, draftToEntry, entryToDraft,
  cycleEmotion, toggleCoping, toggleTears, toggleInList, dayKey, isNight, shiftDay,
  findByName, nextOrder, byOrder, makeEmotion, defaultCat,
} from '../js/model.js';

test('стартовый справочник: 22 эмоции, 15 тяжёлых, 10 избранных', () => {
  const list = seedEmotions();
  assertEqual(list.length, 22);
  assertEqual(list.filter((e) => e.type === 'heavy').length, 15);
  assertEqual(list.filter((e) => e.favorite).length, 10);
  assertEqual(new Set(list.map((e) => e.name)).size, 22, 'названия уникальны');
  assertEqual(list[0].name, 'тревога');
  assertEqual(list.find((e) => e.name === 'равнодушие').cat, 'tired');
  assertEqual(list.find((e) => e.name === 'ревность').cat, 'angry');
  assert(list.every((e) => e.hidden === false), 'ничего не скрыто');
  assertEqual(list.map((e) => e.order), [...Array(22).keys()]);
});

test('стартовое «Тело»: 4 пункта', () => {
  assertEqual(seedBodyItems().map((b) => b.name), ['ломит руки', 'сердцебиение', 'замирание дыхания', 'тремор']);
});

test('цикл касаний эмоции: нет → есть → сильная → нет', () => {
  const a = cycleEmotion([], 'x');
  assertEqual(a, [{ emotionId: 'x', strong: false }]);
  const b = cycleEmotion(a, 'x');
  assertEqual(b, [{ emotionId: 'x', strong: true }]);
  assertEqual(cycleEmotion(b, 'x'), []);
});

test('шкала и слёзы: повторное нажатие снимает выбор', () => {
  assertEqual(toggleCoping(null, 3), 3);
  assertEqual(toggleCoping(3, 3), null);
  assertEqual(toggleCoping(3, -1), -1);
  assertEqual(toggleTears(null, 'sobbed'), 'sobbed');
  assertEqual(toggleTears('sobbed', 'sobbed'), null);
  assertEqual(toggleInList(['a'], 'b'), ['a', 'b']);
  assertEqual(toggleInList(['a', 'b'], 'a'), ['b']);
});

test('пустой черновик: любое из пяти полей делает его не пустым', () => {
  assert(isDraftEmpty(emptyDraft()));
  assert(isDraftEmpty({ ...emptyDraft(), text: '   ' }), 'одни пробелы — пусто');
  assert(!isDraftEmpty({ ...emptyDraft(), coping: 0 }), 'шкала 0 — не пусто');
  assert(!isDraftEmpty({ ...emptyDraft(), tears: 'sobbed' }), 'только «рыдала» — не пусто');
  assert(!isDraftEmpty({ ...emptyDraft(), body: ['b1'] }));
  assert(!isDraftEmpty({ ...emptyDraft(), emotions: [{ emotionId: 'x', strong: false }] }));
  assert(!isDraftEmpty({ ...emptyDraft(), text: 'слово' }));
});

test('пустой черновик нельзя превратить в запись', () => {
  let thrown = false;
  try { draftToEntry(emptyDraft(), null); } catch { thrown = true; }
  assert(thrown, 'должна быть ошибка');
});

test('новая запись: время «сейчас», id и даты ставятся сами', () => {
  const now = new Date('2026-10-03T10:00:00.000Z');
  const e = draftToEntry({ ...emptyDraft(), coping: -2, text: '  ' }, null, now);
  assertEqual(e.time, '2026-10-03T10:00:00.000Z');
  assertEqual(e.createdAt, '2026-10-03T10:00:00.000Z');
  assertEqual(e.updatedAt, '2026-10-03T10:00:00.000Z');
  assertEqual(e.coping, -2);
  assertEqual(e.text, '', 'пробелы сохраняются как пустой текст');
  assertEqual(typeof e.id, 'string');
  assertEqual(e.id.length, 36);
});

test('правка записи: id и createdAt сохраняются, updatedAt новый', () => {
  const old = draftToEntry({ ...emptyDraft(), coping: 1 }, null, new Date('2026-10-03T10:00:00.000Z'));
  const draft = { ...entryToDraft(old), coping: 2 };
  const e = draftToEntry(draft, old, new Date('2026-10-03T12:00:00.000Z'));
  assertEqual(e.id, old.id);
  assertEqual(e.createdAt, old.createdAt);
  assertEqual(e.updatedAt, '2026-10-03T12:00:00.000Z');
  assertEqual(e.time, old.time);
  assertEqual(e.coping, 2);
});

test('граница дня 06:00', () => {
  assertEqual(dayKey(new Date(2026, 9, 4, 2, 10)), '2026-10-03', '2:10 ночи — ещё 3 октября');
  assertEqual(dayKey(new Date(2026, 9, 4, 5, 59)), '2026-10-03');
  assertEqual(dayKey(new Date(2026, 9, 4, 6, 0)), '2026-10-04');
  assertEqual(dayKey(new Date(2026, 9, 3, 23, 30)), '2026-10-03');
  assertEqual(dayKey(new Date(2026, 9, 1, 3, 0)), '2026-09-30', 'переход через месяц');
  assertEqual(dayKey(new Date(2026, 9, 4, 2, 10).toISOString()), '2026-10-03', 'принимает ISO-строку');
  assert(isNight(new Date(2026, 9, 4, 5, 59)));
  assert(!isNight(new Date(2026, 9, 4, 6, 0)));
  assertEqual(shiftDay('2026-10-01', -1), '2026-09-30');
  assertEqual(shiftDay('2026-12-31', 1), '2027-01-01');
});

test('поиск по названию, порядок, котик по умолчанию', () => {
  const list = [{ name: 'тревога', order: 3 }, { name: 'грусть', order: 7 }];
  assertEqual(findByName(list, '  Тревога ').name, 'тревога');
  assertEqual(findByName(list, 'злость'), undefined);
  assertEqual(nextOrder([]), 0);
  assertEqual(nextOrder(list), 8);
  assertEqual([...list].reverse().sort(byOrder).map((x) => x.order), [3, 7]);
  assertEqual(defaultCat('heavy'), 'crying');
  assertEqual(defaultCat('light'), 'wideeyed');
  assertEqual(makeEmotion({ name: ' зависть ', type: 'heavy', order: 22 }).cat, 'crying');
  assertEqual(makeEmotion({ name: ' зависть ', type: 'heavy', order: 22 }).name, 'зависть');
});

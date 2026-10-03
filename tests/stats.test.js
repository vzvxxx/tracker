import { test, assert, assertEqual } from './runner.js';
import { isMixed, groupByDay, daySummary, usageCounts } from '../js/stats.js';

const at = (d, h, m) => new Date(2026, 9, d, h, m).toISOString();
const emotions = [
  { id: 'A', name: 'тревога', type: 'heavy', order: 0 },
  { id: 'B', name: 'грусть', type: 'heavy', order: 1 },
  { id: 'C', name: 'радость', type: 'light', order: 2 },
];
const emotionsById = new Map(emotions.map((e) => [e.id, e]));
const bodyById = new Map([['X', { id: 'X', name: 'сердцебиение', order: 1 }], ['Y', { id: 'Y', name: 'тремор', order: 0 }]]);
const entry = (over) => ({ id: Math.random().toString(), time: at(3, 12, 0), coping: null, emotions: [], text: '', body: [], tears: null, ...over });

const e1 = entry({ time: at(3, 10, 30), coping: 2, emotions: [{ emotionId: 'C', strong: false }] });
const e2 = entry({ time: at(3, 16, 10), coping: 1, emotions: [{ emotionId: 'A', strong: false }, { emotionId: 'C', strong: false }], body: ['X'] });
const e3 = entry({ time: at(3, 21, 40), coping: -2, emotions: [{ emotionId: 'B', strong: true }, { emotionId: 'A', strong: false }], tears: 'cried', body: ['X', 'Y'] });
const e4 = entry({ time: at(3, 23, 0), text: 'не спится', tears: 'sobbed' });

test('смешанно: есть и тяжёлые, и лёгкие', () => {
  assert(isMixed(e2, emotionsById));
  assert(!isMixed(e3, emotionsById));
  assert(!isMixed(e4, emotionsById));
});

test('итог дня считается по всем слоям', () => {
  const s = daySummary([e1, e2, e3, e4], emotionsById, bodyById);
  assertEqual(s.count, 4);
  assertEqual(s.copingAvg, 0.3, 'средняя без пустых оценок: (2+1−2)/3');
  assertEqual(s.copingMin, -2);
  assertEqual(s.copingMax, 2);
  assertEqual(s.hasEmotions, true);
  assertEqual(s.load, 4, 'тревога 1 + грусть сильная 2 + тревога 1');
  assertEqual(s.light, 2);
  assertEqual(s.mixedCount, 1);
  assertEqual(s.frequent, ['тревога', 'радость'], 'обе в 2 записях, порядок по справочнику');
  assertEqual(s.body, [{ name: 'тремор', count: 1 }, { name: 'сердцебиение', count: 2 }], 'порядок по справочнику');
  assertEqual(s.tears, { count: 2, max: 'sobbed' });
});

test('средняя: половинки округляются от нуля, одинаково для плюса и минуса', () => {
  const avg = (scores) => daySummary(scores.map((coping) => entry({ coping })), emotionsById, bodyById).copingAvg;
  assertEqual(avg([2, 3, -2, -4]), -0.3, '−0,25 → −0,3');
  assertEqual(avg([-1, 0, 0, 0]), -0.3, '−0,25 → −0,3');
  assertEqual(avg([1, 0, 0, 0]), 0.3, '+0,25 → +0,3');
  const twenty = [5, 5, 5, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  assertEqual(avg(twenty), 1.2, '1,15 → 1,2');
  assert(Object.is(avg([-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 0), 'почти ноль — ровно 0, без «−0»');
});

test('сколько записей используют эмоцию и пункт «Тела»', () => {
  const u = usageCounts([e1, e2, e3, e4]);
  assertEqual(u.emotions.get('A'), 2, 'тревога в двух записях');
  assertEqual(u.emotions.get('B'), 1);
  assertEqual(u.emotions.get('C'), 2);
  assertEqual(u.emotions.get('Z'), undefined, 'нигде не отмечена — можно удалить');
  assertEqual(u.body.get('X'), 2);
  assertEqual(u.body.get('Y'), 1);
  assertEqual(usageCounts([]).emotions.size, 0);
});

test('итог пустого дня', () => {
  assertEqual(daySummary([], emotionsById, bodyById), {
    count: 0, copingAvg: null, copingMin: null, copingMax: null, hasEmotions: false,
    load: 0, light: 0, mixedCount: 0, frequent: [], body: [], tears: null,
  });
});

test('группировка по дням с границей 6:00', () => {
  const a = entry({ id: 'a', time: at(4, 2, 10) });
  const b = entry({ id: 'b', time: at(3, 23, 0) });
  const c = entry({ id: 'c', time: at(4, 9, 0) });
  const groups = groupByDay([b, a, c]);
  assertEqual(groups.map((g) => g.day), ['2026-10-04', '2026-10-03']);
  assertEqual(groups[0].entries.map((e) => e.id), ['c']);
  assertEqual(groups[1].entries.map((e) => e.id), ['a', 'b'], 'внутри дня новые сверху');
});

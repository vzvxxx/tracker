import { test, assertEqual } from './runner.js';
import {
  formatSigned, formatRange, formatDayShort, formatDayTitle, formatTime, toLocalInput, fromLocalInput, plural,
} from '../js/format.js';

test('числа со знаком и запятой', () => {
  assertEqual(formatSigned(0.3), '+0,3');
  assertEqual(formatSigned(-2), '−2');
  assertEqual(formatSigned(-0.5), '−0,5');
  assertEqual(formatSigned(0), '0');
  assertEqual(formatSigned(null), '—');
  assertEqual(formatRange(-2, 2), '−2 … +2');
  assertEqual(formatRange(1, 1), '+1');
});

test('даты и время', () => {
  assertEqual(formatDayShort('2026-10-03'), '3 октября');
  assertEqual(formatDayTitle('2026-10-03', '2026-10-03'), 'Сегодня, 3 октября');
  assertEqual(formatDayTitle('2026-10-02', '2026-10-03'), 'Вчера, 2 октября');
  assertEqual(formatDayTitle('2026-10-01', '2026-10-03'), '1 октября');
  assertEqual(formatTime(new Date(2026, 9, 3, 9, 5).toISOString()), '09:05');
  assertEqual(toLocalInput(new Date(2026, 9, 3, 14, 20).toISOString()), '2026-10-03T14:20');
  assertEqual(fromLocalInput('2026-10-03T14:20'), new Date(2026, 9, 3, 14, 20).toISOString());
});

test('склонения', () => {
  const f = ['запись', 'записи', 'записей'];
  assertEqual(plural(1, f), 'запись');
  assertEqual(plural(2, f), 'записи');
  assertEqual(plural(5, f), 'записей');
  assertEqual(plural(11, f), 'записей');
  assertEqual(plural(21, f), 'запись');
  assertEqual(plural(22, f), 'записи');
  assertEqual(plural(0, f), 'записей');
});

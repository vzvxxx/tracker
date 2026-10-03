// Как числа и даты выглядят на экране.
import { shiftDay } from './model.js';

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export function formatSigned(n) {
  if (n === null || n === undefined) return '—';
  if (n === 0) return '0';
  const abs = String(Math.abs(n)).replace('.', ',');
  return (n > 0 ? '+' : '−') + abs;
}

export function formatRange(min, max) {
  return min === max ? formatSigned(min) : `${formatSigned(min)} … ${formatSigned(max)}`;
}

export function formatDayShort(ymd) {
  const [, m, d] = ymd.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

export function formatDayTitle(ymd, todayYmd) {
  if (ymd === todayYmd) return `Сегодня, ${formatDayShort(ymd)}`;
  if (ymd === shiftDay(todayYmd, -1)) return `Вчера, ${formatDayShort(ymd)}`;
  return formatDayShort(ymd);
}

const pad = (n) => String(n).padStart(2, '0');

export function formatTime(iso) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Для поля <input type="datetime-local">: местное время без секунд.
export function toLocalInput(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value) {
  return new Date(value).toISOString();
}

export function plural(n, [one, few, many]) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

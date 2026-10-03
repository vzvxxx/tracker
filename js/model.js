// Модель данных дневника. Только данные и правила — без экрана и без базы.

export const CATS = ['crying', 'angry', 'scared', 'tired', 'wideeyed'];
export const CAT_FILES = {
  crying: 'assets/cat-crying.png',
  angry: 'assets/cat-angry.png',
  scared: 'assets/cat-scared.png',
  tired: 'assets/cat-tired.png',
  wideeyed: 'assets/cat-wideeyed.png',
};
export const CAT_NAMES = {
  crying: 'плачущий',
  angry: 'злой',
  scared: 'испуганный',
  tired: 'вялый',
  wideeyed: 'глазастый',
};
export const TEARS = ['cried', 'sobbed', 'hysteria'];
export const TEARS_LABELS = { cried: 'поплакала', sobbed: 'рыдала', hysteria: 'истерика' };
export const DAY_START_HOUR = 6;

export function newId() {
  return crypto.randomUUID();
}

export function nowIso(now = new Date()) {
  return now.toISOString();
}

export function defaultCat(type) {
  return type === 'heavy' ? 'crying' : 'wideeyed';
}

export function byOrder(a, b) {
  return a.order - b.order;
}

export function nextOrder(list) {
  return list.length ? Math.max(...list.map((x) => x.order)) + 1 : 0;
}

const normalize = (name) => name.trim().toLowerCase();

export function findByName(list, name) {
  return list.find((x) => normalize(x.name) === normalize(name));
}

// [название, тип, котик, избранная]. Порядок здесь = стартовый порядок на экране.
const START_EMOTIONS = [
  ['тревога', 'heavy', 'scared', true],
  ['грусть', 'heavy', 'crying', true],
  ['равнодушие', 'heavy', 'tired', true],
  ['злость', 'heavy', 'angry', true],
  ['усталость', 'heavy', 'tired', true],
  ['страх', 'heavy', 'scared', false],
  ['страх потери', 'heavy', 'scared', false],
  ['вина / стыд', 'heavy', 'crying', false],
  ['одиночество', 'heavy', 'crying', false],
  ['обида', 'heavy', 'crying', false],
  ['ревность', 'heavy', 'angry', false],
  ['паранойя', 'heavy', 'scared', false],
  ['ностальгия', 'heavy', 'crying', false],
  ['апатия', 'heavy', 'tired', false],
  ['возбуждение / суета', 'heavy', 'scared', false],
  ['радость', 'light', 'wideeyed', true],
  ['спокойствие', 'light', 'wideeyed', true],
  ['гордость за себя', 'light', 'wideeyed', true],
  ['надежда', 'light', 'wideeyed', true],
  ['интерес', 'light', 'wideeyed', true],
  ['благодарность', 'light', 'wideeyed', false],
  ['уверенность', 'light', 'wideeyed', false],
];

const START_BODY = ['ломит руки', 'сердцебиение', 'замирание дыхания', 'тремор'];

export function makeEmotion({ name, type, cat = defaultCat(type), order, favorite = false }, now = new Date()) {
  const t = nowIso(now);
  return { id: newId(), createdAt: t, updatedAt: t, name: name.trim(), type, cat, order, hidden: false, favorite };
}

export function makeBodyItem({ name, order }, now = new Date()) {
  const t = nowIso(now);
  return { id: newId(), createdAt: t, updatedAt: t, name: name.trim(), order, hidden: false };
}

export function seedEmotions(now = new Date()) {
  return START_EMOTIONS.map(([name, type, cat, favorite], order) => makeEmotion({ name, type, cat, order, favorite }, now));
}

export function seedBodyItems(now = new Date()) {
  return START_BODY.map((name, order) => makeBodyItem({ name, order }, now));
}

// Черновик — то, что сейчас на экране записи. time: null значит «сейчас».
export function emptyDraft() {
  return { time: null, coping: null, emotions: [], text: '', body: [], tears: null };
}

export function isDraftEmpty(d) {
  return d.coping === null
    && d.emotions.length === 0
    && d.text.trim() === ''
    && d.body.length === 0
    && d.tears === null;
}

export function draftToEntry(draft, existing = null, now = new Date()) {
  if (isDraftEmpty(draft)) throw new Error('empty');
  const t = nowIso(now);
  return {
    id: existing ? existing.id : newId(),
    createdAt: existing ? existing.createdAt : t,
    updatedAt: t,
    time: draft.time ?? t,
    coping: draft.coping,
    emotions: draft.emotions.map((e) => ({ emotionId: e.emotionId, strong: Boolean(e.strong) })),
    text: draft.text.trim() === '' ? '' : draft.text,
    body: [...draft.body],
    tears: draft.tears,
  };
}

export function entryToDraft(entry) {
  return {
    time: entry.time,
    coping: entry.coping,
    emotions: entry.emotions.map((e) => ({ ...e })),
    text: entry.text,
    body: [...entry.body],
    tears: entry.tears,
  };
}

// Касания по эмоции: нет → есть → сильная → нет.
export function cycleEmotion(list, emotionId) {
  const i = list.findIndex((e) => e.emotionId === emotionId);
  if (i === -1) return [...list, { emotionId, strong: false }];
  if (!list[i].strong) return list.map((e, j) => (j === i ? { ...e, strong: true } : e));
  return list.filter((_, j) => j !== i);
}

export function toggleCoping(current, value) {
  return current === value ? null : value;
}

export function toggleTears(current, value) {
  return current === value ? null : value;
}

export function toggleInList(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function toYmd(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// День заканчивается в 06:00: сдвигаем время на 6 часов назад и берём дату.
export function dayKey(dateOrIso) {
  const d = new Date(dateOrIso);
  const shifted = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() - DAY_START_HOUR, d.getMinutes());
  return toYmd(shifted);
}

export function isNight(now = new Date()) {
  return new Date(now).getHours() < DAY_START_HOUR;
}

export function shiftDay(ymd, delta) {
  const [y, m, d] = ymd.split('-').map(Number);
  return toYmd(new Date(y, m - 1, d + delta));
}

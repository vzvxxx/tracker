// Всё, что считается само. Ничего не хранится — только вычисляется из записей.
import { dayKey, TEARS, byOrder } from './model.js';

export function isMixed(entry, emotionsById) {
  let heavy = false;
  let light = false;
  for (const x of entry.emotions) {
    const em = emotionsById.get(x.emotionId);
    if (!em) continue;
    if (em.type === 'heavy') heavy = true;
    else light = true;
  }
  return heavy && light;
}

export function groupByDay(entries) {
  const map = new Map();
  for (const e of entries) {
    const key = dayKey(e.time);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, list]) => ({ day, entries: list.sort((a, b) => (a.time < b.time ? 1 : -1)) }));
}

export function daySummary(entries, emotionsById, bodyById) {
  const scores = entries.map((e) => e.coping).filter((v) => v !== null);
  const copingAvg = scores.length
    ? Math.round((scores.reduce((sum, v) => sum + v, 0) / scores.length) * 10) / 10
    : null;

  let load = 0;
  let light = 0;
  const inEntries = new Map(); // эмоция → в скольких записях встретилась
  for (const e of entries) {
    for (const x of e.emotions) {
      const em = emotionsById.get(x.emotionId);
      if (!em) continue;
      const points = x.strong ? 2 : 1;
      if (em.type === 'heavy') load += points;
      else light += points;
      inEntries.set(em.id, (inEntries.get(em.id) ?? 0) + 1);
    }
  }
  const max = Math.max(0, ...inEntries.values());
  const frequent = max === 0 ? [] : [...inEntries.entries()]
    .filter(([, count]) => count === max)
    .map(([id]) => emotionsById.get(id))
    .sort(byOrder)
    .slice(0, 3)
    .map((em) => em.name);

  const bodyCounts = new Map();
  for (const e of entries) for (const id of e.body) bodyCounts.set(id, (bodyCounts.get(id) ?? 0) + 1);
  const body = [...bodyCounts.entries()]
    .map(([id, count]) => ({ item: bodyById.get(id), count }))
    .filter((x) => x.item)
    .sort((a, b) => byOrder(a.item, b.item))
    .map((x) => ({ name: x.item.name, count: x.count }));

  const tearsList = entries.map((e) => e.tears).filter(Boolean);
  const tears = tearsList.length
    ? { count: tearsList.length, max: tearsList.reduce((m, t) => (TEARS.indexOf(t) > TEARS.indexOf(m) ? t : m)) }
    : null;

  return {
    count: entries.length,
    copingAvg,
    copingMin: scores.length ? Math.min(...scores) : null,
    copingMax: scores.length ? Math.max(...scores) : null,
    hasEmotions: entries.some((e) => e.emotions.length > 0),
    load,
    light,
    mixedCount: entries.filter((e) => isMixed(e, emotionsById)).length,
    frequent,
    body,
    tears,
  };
}

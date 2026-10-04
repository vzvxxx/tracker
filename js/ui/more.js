// Экран «Ещё»: резервная копия и справочники.
import { h, mount, showToast } from './dom.js';
import { nameForm } from './forms.js';
import { CATS, CAT_NAMES, makeEmotion, makeBodyItem, findByName, nextOrder, byOrder, nowIso } from '../model.js';
import { parseBackup, describeData, describeRange, describeLastBackup } from '../backup.js';
import { downloadBackup, markBackedUp } from './backup-actions.js';
import { usageCounts } from '../stats.js';

export function renderMore(root, ctx) {
  const usage = usageCounts(ctx.store.entries);
  mount(root,
    h('h1', {}, 'Ещё'),
    h('p', { class: 'card-warn' }, 'Не удаляй иконку трекера: вместе с ней удалится дневник. Делай копии.'),
    backupSection(ctx),
    emotionsSection(ctx, usage.emotions),
    bodySection(ctx, usage.body));
}

// ---------- Резервная копия ----------

function backupSection(ctx) {
  const fileInput = h('input', {
    type: 'file',
    accept: '.json,application/json',
    class: 'visually-hidden',
    'aria-label': 'Файл копии',
    onchange: (e) => restore(e.target, ctx),
  });
  return h('section', { class: 'section' },
    h('h2', {}, 'Резервная копия'),
    h('p', { class: 'muted' }, 'Сохрани файл в «Файлы», iCloud или отправь себе в Telegram.'),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'button', onclick: () => downloadBackup(ctx) }, 'Скачать копию'),
      h('button', { type: 'button', class: 'button', onclick: () => fileInput.click() }, 'Восстановить из копии')),
    h('p', { class: 'muted backup-last' }, describeLastBackup(ctx.store.backup)),
    fileInput);
}

async function restore(input, ctx) {
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  const parsed = parseBackup(await file.text());
  if (!parsed.ok) { window.alert(parsed.error); return; }
  const current = describeData(await ctx.db.exportAll());
  const incoming = describeData(parsed.data);
  const question = `Сейчас в трекере ${describeRange(current)}.\nВ копии ${describeRange(incoming)}.\n\nВсё текущее будет заменено. Продолжить?`;
  if (!window.confirm(question)) return;
  try {
    await ctx.db.replaceAll(parsed.data);
  } catch {
    window.alert('Не получилось восстановить. Ничего не изменилось.');
    return;
  }
  // Дневник теперь совпадает с файлом копии: терять нечего, «последняя копия» — дата файла.
  await markBackedUp(ctx, parsed.exportedAt ?? undefined);
  showToast('Копия восстановлена');
}

// ---------- Справочники: общие действия ----------

async function update(ctx, method, item, patch) {
  await ctx.db[method]({ ...item, ...patch, updatedAt: nowIso() });
  await ctx.refresh();
}

async function rename(ctx, method, item, list) {
  const answer = window.prompt('Новое название', item.name);
  if (answer === null) return;
  const name = answer.trim();
  if (!name || name === item.name) return;
  const dup = findByName(list, name);
  if (dup && dup.id !== item.id) { window.alert('Такое название уже есть'); return; }
  await update(ctx, method, item, { name });
}

async function swap(ctx, method, a, b) {
  const t = nowIso();
  await ctx.db[method]({ ...a, order: b.order, updatedAt: t });
  await ctx.db[method]({ ...b, order: a.order, updatedAt: t });
  await ctx.refresh();
}

function orderButtons(ctx, method, item, prev, next) {
  return h('span', { class: 'order' },
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Выше', disabled: !prev, onclick: () => swap(ctx, method, item, prev) }, '↑'),
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Ниже', disabled: !next, onclick: () => swap(ctx, method, item, next) }, '↓'));
}

// Насовсем удаляем только то, чего нет ни в одной записи (used — сколько записей ссылаются).
async function removeForever(ctx, method, item) {
  if (!window.confirm(`Удалить «${item.name}» насовсем? В записях этого нет, но вернуть будет нельзя.`)) return;
  await ctx.db[method](item.id);
  await ctx.refresh();
}

function deleteButton(ctx, method, item, used) {
  if (used.get(item.id)) return null;
  return h('button', { type: 'button', class: 'link', onclick: () => removeForever(ctx, method, item) }, 'Удалить');
}

const DELETE_HINT = 'Удалить можно только то, чего нет ни в одной записи. Остальное можно скрыть — старые записи его сохранят.';

function hiddenList(items, onRestore, deleteFor) {
  if (!items.length) return null;
  return h('details', { class: 'block' },
    h('summary', {}, `Скрытые (${items.length})`),
    items.map((x) => h('div', { class: 'dict-row' },
      h('span', { class: 'dict-name' }, x.name),
      h('button', { type: 'button', class: 'link', onclick: () => onRestore(x) }, 'Вернуть'),
      deleteFor(x))));
}

// ---------- Эмоции ----------

function emotionsSection(ctx, used) {
  const all = [...ctx.store.emotions].sort(byOrder);
  return h('section', { class: 'section' },
    h('h2', {}, 'Эмоции'),
    h('p', { class: 'muted' }, '★ — видна сразу на экране записи. Нажми на название, чтобы переименовать.'),
    h('p', { class: 'muted' }, DELETE_HINT),
    [['heavy', 'Тяжёлое'], ['light', 'Лёгкое']].map(([type, title]) => {
      const list = all.filter((e) => e.type === type && !e.hidden);
      return [h('p', { class: 'group-title' }, title), list.map((e, i) => emotionRow(ctx, e, list[i - 1], list[i + 1], used))];
    }),
    nameForm({
      placeholder: 'Новая эмоция',
      withType: true,
      onSubmit: async ({ name, type }) => {
        const dup = findByName(ctx.store.emotions, name);
        if (dup) return dup.hidden ? 'Такая эмоция есть среди скрытых — её можно вернуть ниже' : 'Такая эмоция уже есть';
        await ctx.db.putEmotion(makeEmotion({ name, type, order: nextOrder(ctx.store.emotions) }));
        await ctx.refresh();
        return null;
      },
    }),
    hiddenList(all.filter((e) => e.hidden), (e) => update(ctx, 'putEmotion', e, { hidden: false }),
      (e) => deleteButton(ctx, 'deleteEmotion', e, used)));
}

function emotionRow(ctx, e, prev, next, used) {
  return h('div', { class: 'dict-row' },
    h('button', {
      type: 'button',
      class: `star${e.favorite ? ' is-on' : ''}`,
      'aria-label': e.favorite ? 'Убрать из избранных' : 'Сделать избранной',
      'aria-pressed': String(e.favorite),
      onclick: () => update(ctx, 'putEmotion', e, { favorite: !e.favorite }),
    }, e.favorite ? '★' : '☆'),
    h('button', { type: 'button', class: 'dict-name', onclick: () => rename(ctx, 'putEmotion', e, ctx.store.emotions) }, e.name),
    h('select', {
      class: 'select',
      'aria-label': `Котик для «${e.name}»`,
      onchange: (ev) => update(ctx, 'putEmotion', e, { cat: ev.target.value }),
    }, CATS.map((c) => h('option', { value: c, selected: c === e.cat }, CAT_NAMES[c]))),
    h('button', {
      type: 'button',
      class: 'link',
      onclick: () => update(ctx, 'putEmotion', e, { type: e.type === 'heavy' ? 'light' : 'heavy' }),
    }, e.type === 'heavy' ? 'сделать лёгкой' : 'сделать тяжёлой'),
    orderButtons(ctx, 'putEmotion', e, prev, next),
    h('button', { type: 'button', class: 'link', onclick: () => update(ctx, 'putEmotion', e, { hidden: true, favorite: false }) }, 'Скрыть'),
    deleteButton(ctx, 'deleteEmotion', e, used));
}

// ---------- Тело ----------

function bodySection(ctx, used) {
  const all = [...ctx.store.bodyItems].sort(byOrder);
  const list = all.filter((b) => !b.hidden);
  return h('section', { class: 'section' },
    h('h2', {}, 'Тело'),
    h('p', { class: 'muted' }, DELETE_HINT),
    list.map((b, i) => h('div', { class: 'dict-row' },
      h('button', { type: 'button', class: 'dict-name', onclick: () => rename(ctx, 'putBodyItem', b, ctx.store.bodyItems) }, b.name),
      orderButtons(ctx, 'putBodyItem', b, list[i - 1], list[i + 1]),
      h('button', { type: 'button', class: 'link', onclick: () => update(ctx, 'putBodyItem', b, { hidden: true }) }, 'Скрыть'),
      deleteButton(ctx, 'deleteBodyItem', b, used))),
    nameForm({
      placeholder: 'Новый пункт',
      onSubmit: async ({ name }) => {
        const dup = findByName(ctx.store.bodyItems, name);
        if (dup) return dup.hidden ? 'Такой пункт есть среди скрытых — его можно вернуть ниже' : 'Такой пункт уже есть';
        await ctx.db.putBodyItem(makeBodyItem({ name, order: nextOrder(ctx.store.bodyItems) }));
        await ctx.refresh();
        return null;
      },
    }),
    hiddenList(all.filter((b) => b.hidden), (b) => update(ctx, 'putBodyItem', b, { hidden: false }),
      (b) => deleteButton(ctx, 'deleteBodyItem', b, used)));
}

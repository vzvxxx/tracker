// Экран «Запись»: новая запись и правка старой.
import { h, mount, showToast, decor } from './dom.js';
import { emotionChip, plainChip, scale } from './chips.js';
import { nameForm } from './forms.js';
import {
  emptyDraft, entryToDraft, draftToEntry, isDraftEmpty, cycleEmotion, toggleCoping, toggleTears,
  toggleInList, makeEmotion, makeBodyItem, findByName, nextOrder, byOrder, TEARS, TEARS_LABELS,
} from '../model.js';
import { isMixed } from '../stats.js';
import { toLocalInput, fromLocalInput } from '../format.js';

let newDraft = emptyDraft(); // черновик новой записи живёт, пока не сохранишь
let edit = null; // { id, draft } — когда правим старую запись
const ui = { showAll: false, bodyOpen: false, tearsOpen: false, addingBody: false, error: '' };

const EMPTY_ERROR = 'Отметь хоть что-нибудь: шкалу, эмоцию, тело, слёзы или пару слов.';

export function renderEntry(root, ctx, editId) {
  if (editId) {
    if (!edit || edit.id !== editId) {
      const existing = ctx.store.entries.find((e) => e.id === editId);
      if (!existing) { renderEntry(root, ctx, null); return; }
      edit = { id: editId, draft: entryToDraft(existing) };
      Object.assign(ui, { showAll: false, error: '', addingBody: false, bodyOpen: existing.body.length > 0, tearsOpen: existing.tears !== null });
    }
  } else {
    edit = null;
  }
  const draft = edit ? edit.draft : newDraft;
  const rerender = () => renderEntry(root, ctx, edit ? edit.id : null);
  const change = (fn) => { fn(); ui.error = ''; rerender(); };

  const emotionsById = new Map(ctx.store.emotions.map((e) => [e.id, e]));
  // Пока черновик ждал, эмоцию или пункт «Тела» могли удалить в «Ещё»: убираем ссылки в никуда.
  draft.emotions = draft.emotions.filter((x) => emotionsById.has(x.emotionId));
  draft.body = draft.body.filter((id) => ctx.store.bodyItems.some((b) => b.id === id));
  const visible = ctx.store.emotions.filter((e) => !e.hidden).sort(byOrder);
  const favorites = [
    ...visible.filter((e) => e.favorite && e.type === 'heavy'),
    ...visible.filter((e) => e.favorite && e.type === 'light'),
  ];
  const stateOf = (id) => {
    const x = draft.emotions.find((e) => e.emotionId === id);
    if (!x) return null;
    return x.strong ? 'strong' : 'on';
  };
  // place — где «таблетка»: наверху или в полном списке (там у каждой свой котик-наклейка).
  const chipAt = (place) => (em) => emotionChip(em, stateOf(em.id), {
    stickerKey: `${place}:${em.id}`,
    onClick: () => change(() => { draft.emotions = cycleEmotion(draft.emotions, em.id); }),
  });
  const chip = chipAt('top');
  // Отмеченные не из избранных (в т. ч. скрытые позже) остаются видны выбранными.
  const extra = draft.emotions
    .map((x) => emotionsById.get(x.emotionId))
    .filter((em) => em && !favorites.includes(em) && (!ui.showAll || em.hidden));

  async function save() {
    if (isDraftEmpty(draft)) { ui.error = EMPTY_ERROR; rerender(); return; }
    const existing = edit ? ctx.store.entries.find((e) => e.id === edit.id) : null;
    await ctx.db.putEntry(draftToEntry(draft, existing));
    const wasEditing = Boolean(edit);
    if (wasEditing) edit = null;
    else newDraft = emptyDraft();
    Object.assign(ui, { showAll: false, bodyOpen: false, tearsOpen: false, addingBody: false, error: '' });
    showToast(decor('heart'), 'Записано. Ты бережёшь себя', decor('flower'));
    await ctx.refresh();
    if (wasEditing) ctx.navigate('feed');
  }

  async function remove() {
    if (!window.confirm('Точно удалить? Вернуть запись будет нельзя.')) return;
    await ctx.db.deleteEntry(edit.id);
    edit = null;
    await ctx.refresh();
    ctx.navigate('feed');
  }

  const timeInput = h('input', {
    type: 'datetime-local',
    class: 'time-input',
    'aria-label': 'Время записи',
    value: toLocalInput(draft.time ?? new Date().toISOString()),
    onchange: (e) => { if (e.target.value) draft.time = fromLocalInput(e.target.value); },
  });

  const fullList = ui.showAll ? h('div', { class: 'full-list' },
    [['heavy', 'Тяжёлое'], ['light', 'Лёгкое']].map(([type, title]) => [
      h('p', { class: 'group-title' }, title),
      h('div', { class: 'chips' }, visible.filter((e) => e.type === type).map(chipAt('full'))),
    ]),
    h('p', { class: 'group-title' }, 'Добавить свою'),
    nameForm({
      placeholder: 'Название эмоции',
      withType: true,
      onSubmit: async ({ name, type }) => {
        const dup = findByName(ctx.store.emotions, name);
        if (dup) return dup.hidden ? 'Такая эмоция есть среди скрытых — верни её в «Ещё»' : 'Такая эмоция уже есть';
        const em = makeEmotion({ name, type, order: nextOrder(ctx.store.emotions) });
        await ctx.db.putEmotion(em);
        draft.emotions = [...draft.emotions, { emotionId: em.id, strong: false }];
        await ctx.refresh();
        return null;
      },
    })) : null;

  const bodyItems = ctx.store.bodyItems.filter((b) => !b.hidden || draft.body.includes(b.id)).sort(byOrder);
  const bodyBlock = h('details', { class: 'block', open: ui.bodyOpen, ontoggle: (e) => { ui.bodyOpen = e.target.open; } },
    h('summary', {}, 'Тело', draft.body.length ? h('span', { class: 'count' }, String(draft.body.length)) : null),
    h('div', { class: 'chips' },
      bodyItems.map((b) => plainChip(b.name, {
        on: draft.body.includes(b.id),
        onClick: () => change(() => { draft.body = toggleInList(draft.body, b.id); }),
      })),
      ui.addingBody ? null : plainChip('+ своё', { onClick: () => { ui.addingBody = true; rerender(); } })),
    ui.addingBody ? nameForm({
      placeholder: 'Что с телом',
      onSubmit: async ({ name }) => {
        const dup = findByName(ctx.store.bodyItems, name);
        if (dup) return dup.hidden ? 'Такой пункт есть среди скрытых — верни его в «Ещё»' : 'Такой пункт уже есть';
        const item = makeBodyItem({ name, order: nextOrder(ctx.store.bodyItems) });
        await ctx.db.putBodyItem(item);
        draft.body = [...draft.body, item.id];
        ui.addingBody = false;
        await ctx.refresh();
        return null;
      },
    }) : null);

  const tearsBlock = h('details', { class: 'block', open: ui.tearsOpen, ontoggle: (e) => { ui.tearsOpen = e.target.open; } },
    h('summary', {}, 'Слёзы', draft.tears ? h('span', { class: 'count' }, TEARS_LABELS[draft.tears]) : null),
    h('div', { class: 'chips' }, TEARS.map((t) => plainChip(TEARS_LABELS[t], {
      on: draft.tears === t,
      onClick: () => change(() => { draft.tears = toggleTears(draft.tears, t); }),
    }))));

  const text = h('textarea', {
    class: 'textarea',
    rows: '4',
    placeholder: 'Что происходит… #хештеги',
    'aria-label': 'Мысли',
    oninput: (e) => { draft.text = e.target.value; },
  });
  text.value = draft.text;

  mount(root,
    h('header', { class: 'entry-head' }, h('h1', {}, edit ? 'Запись' : 'Новая запись'), timeInput),
    h('h2', { class: 'label' }, 'Как я справляюсь'),
    h('p', { class: 'subtitle' }, 'с тем, что чувствую'),
    scale(draft.coping, (v) => change(() => { draft.coping = toggleCoping(draft.coping, v); })),
    // Метка «смешанно» — справа на строке «Что внутри»: строка есть всегда, поэтому ничего не сдвигается.
    h('div', { class: 'label-row' },
      h('p', { class: 'label' }, 'Что внутри'),
      isMixed(draft, emotionsById) ? h('span', { class: 'badge-mixed' }, 'смешанно') : null),
    // Тяжёлые и лёгкие — каждая группа со своей строки, чтобы не перемешивались.
    h('div', { class: 'chips' },
      favorites.filter((em) => em.type === 'heavy').map(chip),
      extra.filter((em) => em.type === 'heavy').map(chip)),
    h('div', { class: 'chips' },
      favorites.filter((em) => em.type === 'light').map(chip),
      extra.filter((em) => em.type === 'light').map(chip),
      h('button', {
        type: 'button',
        class: 'chip chip--plain chip--more',
        'aria-expanded': String(ui.showAll),
        'aria-label': ui.showAll ? 'Свернуть список эмоций' : 'Все эмоции',
        onclick: () => { ui.showAll = !ui.showAll; rerender(); },
      }, ui.showAll ? '−' : '+')),
    fullList,
    bodyBlock,
    tearsBlock,
    h('p', { class: 'label' }, 'Мысли'),
    text,
    h('div', { class: 'save-area' },
      ui.error ? h('p', { class: 'error', role: 'alert' }, ui.error) : null,
      h('button', { type: 'button', class: 'button button--primary', onclick: save }, edit ? 'Сохранить изменения' : 'Сохранить'),
      edit ? h('button', { type: 'button', class: 'link', onclick: remove }, 'Удалить запись') : null));
}

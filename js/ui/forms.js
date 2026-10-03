import { h } from './dom.js';

// Поле «название» (+ выбор типа для эмоций) с кнопкой. onSubmit возвращает null или текст ошибки.
export function nameForm({ placeholder, withType = false, submitLabel = 'Добавить', onSubmit }) {
  const input = h('input', { type: 'text', class: 'input', placeholder, 'aria-label': placeholder });
  const type = withType
    ? h('select', { class: 'select', 'aria-label': 'Тип эмоции' },
      h('option', { value: 'heavy' }, 'тяжёлая'),
      h('option', { value: 'light' }, 'лёгкая'))
    : null;
  const error = h('p', { class: 'error', role: 'alert', hidden: true });
  const showError = (text) => { error.textContent = text; error.hidden = false; };
  input.addEventListener('input', () => { error.hidden = true; });
  return h('form', {
    class: 'name-form',
    onsubmit: async (event) => {
      event.preventDefault();
      const name = input.value.trim();
      if (!name) { showError('Впиши название'); return; }
      const message = await onSubmit({ name, type: type ? type.value : null });
      if (message) { showError(message); return; }
      input.value = '';
    },
  }, input, type, h('button', { type: 'submit', class: 'button button--small' }, submitLabel), error);
}

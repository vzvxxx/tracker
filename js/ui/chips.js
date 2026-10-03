import { h } from './dom.js';
import { CAT_FILES } from '../model.js';
import { formatSigned } from '../format.js';

// «Таблетка» эмоции. state: null | 'on' | 'strong'. Сильная — с котиком-наклейкой в углу.
export function emotionChip(emotion, state, { small = false, onClick = null } = {}) {
  const cls = ['chip', `chip--${emotion.type}`];
  if (state) cls.push('is-on');
  if (state === 'strong') cls.push('is-strong');
  if (small) cls.push('chip--small');
  return h(onClick ? 'button' : 'span', {
    class: cls.join(' '),
    type: onClick ? 'button' : null,
    onclick: onClick,
    'aria-pressed': onClick ? String(Boolean(state)) : null,
  },
  emotion.name,
  state === 'strong' ? h('img', { class: 'sticker', src: CAT_FILES[emotion.cat], alt: 'сильно' }) : null);
}

export function plainChip(label, { on = false, onClick = null, small = false } = {}) {
  const cls = ['chip', 'chip--plain'];
  if (on) cls.push('is-on');
  if (small) cls.push('chip--small');
  return h(onClick ? 'button' : 'span', {
    class: cls.join(' '),
    type: onClick ? 'button' : null,
    onclick: onClick,
    'aria-pressed': onClick ? String(on) : null,
  }, label);
}

// Шкала «Как я справляюсь»: 11 кнопок −5…+5.
export function scale(value, onPick) {
  const buttons = [];
  for (let v = -5; v <= 5; v += 1) {
    buttons.push(h('button', {
      type: 'button',
      class: `tone scale-btn${value === v ? ' is-selected' : ''}`,
      'data-v': String(v),
      'aria-pressed': String(value === v),
      onclick: () => onPick(v),
    }, formatSigned(v)));
  }
  return h('div', { class: 'scale', role: 'group', 'aria-label': 'Как я справляюсь' }, buttons);
}

// Квадрат с оценкой в цвет шкалы. null → «—» пунктиром.
export function scoreSquare(value, { small = false } = {}) {
  return h('span', {
    class: `tone score${small ? ' score--small' : ''}`,
    'data-v': value === null ? 'none' : String(value),
  }, formatSigned(value));
}

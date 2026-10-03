import { h, mount } from './dom.js';

export function renderFeed(root) {
  mount(root, h('h1', {}, 'Лента'), h('p', { class: 'muted' }, 'Скоро здесь будут записи.'));
}

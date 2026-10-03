import { h, mount } from './dom.js';

export function renderMore(root) {
  mount(root, h('h1', {}, 'Ещё'), h('p', { class: 'muted' }, 'Скоро здесь будут справочники и копия.'));
}

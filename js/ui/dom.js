// Маленькие помощники, чтобы строить экран из кода.

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
}

// h('button', { class: 'chip', onclick: fn }, 'текст') → <button class="chip">текст</button>
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'value') el.value = value;
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  append(el, children);
  return el;
}

export function mount(root, ...children) {
  root.replaceChildren();
  append(root, children);
}

let toastTimer = null;

export function showToast(...parts) {
  const toast = document.getElementById('toast');
  toast.replaceChildren();
  append(toast, parts);
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2500);
}

// Декор: цветочек или сердечко. Только там, где нет данных.
export function decor(name, className = 'decor') {
  return h('img', { src: `assets/${name}.png`, alt: '', class: className, 'aria-hidden': 'true' });
}

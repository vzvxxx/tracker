// Свайп карточки влево: под ней открываются кнопки. Открыта всегда только одна карточка.

// Куда «досесть» карточке, когда палец отпустили: открыта, если проехала половину ширины кнопок.
export function settleSwipe(offset, width) {
  return offset >= width / 2 ? 'open' : 'closed';
}

const state = new WeakMap(); // строка → { front, offset }
let openRow = null;

function setOffset(row, offset) {
  const s = state.get(row);
  s.offset = offset;
  s.front.style.transform = offset ? `translateX(${-offset}px)` : '';
}

export function closeOpenSwipe() {
  if (openRow && openRow.isConnected) setOffset(openRow, 0);
  openRow = null;
}

// Касание в любом месте вне открытой карточки только закрывает её (как в «Почте»):
// само нажатие при этом не срабатывает — случайно ничего не откроется.
// Касания по самой открытой карточке и её кнопкам обрабатывает swipeable.
let swallowClick = false;
document.addEventListener('pointerdown', (e) => {
  swallowClick = Boolean(openRow && openRow.isConnected && !openRow.contains(e.target));
  if (swallowClick) closeOpenSwipe();
}, true);
document.addEventListener('click', (e) => {
  if (!swallowClick) return;
  swallowClick = false;
  e.preventDefault();
  e.stopPropagation();
}, true);

// row — обёртка, front — карточка (едет), actions — кнопки сзади.
// onTap — обычное нажатие на закрытую карточку.
export function swipeable(row, front, actions, { onTap }) {
  state.set(row, { front, offset: 0 });
  let start = null; // { x, y, base, horizontal: null | true | false }
  let moved = false;

  front.addEventListener('pointerdown', (e) => {
    start = { x: e.clientX, y: e.clientY, base: state.get(row).offset, horizontal: null };
    moved = false;
  });

  front.addEventListener('pointermove', (e) => {
    if (!start || start.horizontal === false) return;
    const dx = start.x - e.clientX;
    const dy = e.clientY - start.y;
    if (start.horizontal === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; // ещё непонятно, куда движется палец
      start.horizontal = Math.abs(dx) > Math.abs(dy);
      if (!start.horizontal) return; // вертикально — это прокрутка ленты, не мешаем
      try { front.setPointerCapture(e.pointerId); } catch { /* без захвата тоже работает, просто палец может «соскочить» */ }
      if (openRow !== row) closeOpenSwipe();
      row.classList.add('is-dragging');
    }
    moved = true;
    setOffset(row, Math.min(Math.max(start.base + dx, 0), actions.offsetWidth));
  });

  const finish = () => {
    if (!start) return;
    start = null;
    row.classList.remove('is-dragging');
    if (!moved) return;
    const width = actions.offsetWidth;
    if (settleSwipe(state.get(row).offset, width) === 'open') {
      setOffset(row, width);
      openRow = row;
    } else {
      setOffset(row, 0);
      if (openRow === row) openRow = null;
    }
  };
  front.addEventListener('pointerup', finish);
  front.addEventListener('pointercancel', finish);

  // Нажатие: после свайпа — ничего; на открытой карточке — закрыть; иначе — открыть запись.
  front.addEventListener('click', () => {
    if (moved) { moved = false; return; }
    if (openRow === row) { closeOpenSwipe(); return; }
    onTap();
  });
}

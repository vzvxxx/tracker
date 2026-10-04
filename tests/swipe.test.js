import { test, assertEqual } from './runner.js';
import { settleSwipe, swipeable, swipeDirection } from '../js/ui/swipe.js';

test('свайп: карточка открывается, если проехала половину ширины кнопок', () => {
  assertEqual(settleSwipe(0, 116), 'closed', 'не двигали');
  assertEqual(settleSwipe(57, 116), 'closed', 'чуть меньше половины — возвращается');
  assertEqual(settleSwipe(58, 116), 'open', 'ровно половина — открыта');
  assertEqual(settleSwipe(116, 116), 'open', 'до конца');
});

test('свайп: касание вне открытой карточки только закрывает её', () => {
  const box = document.createElement('div');
  document.body.append(box);
  const row = document.createElement('div');
  const actions = document.createElement('div');
  actions.style.width = '100px';
  const front = document.createElement('button');
  row.append(actions, front);
  const other = document.createElement('button');
  let otherClicks = 0;
  other.addEventListener('click', () => { otherClicks += 1; });
  box.append(row, other);
  swipeable(row, front, actions, { onTap: () => {} });
  const ev = (el, type, x) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: 0, pointerId: 1 }));

  ev(front, 'pointerdown', 200); ev(front, 'pointermove', 150); ev(front, 'pointermove', 90); ev(front, 'pointerup', 90);
  assertEqual(front.style.transform, 'translateX(-100px)', 'карточка открыта');

  ev(other, 'pointerdown', 10); other.click();
  assertEqual(front.style.transform, '', 'карточка закрылась');
  assertEqual(otherClicks, 0, 'первое касание ничего не нажало');

  ev(other, 'pointerdown', 10); other.click();
  assertEqual(otherClicks, 1, 'следующее нажатие работает как обычно');
  box.remove();
});

test('свайп: куда движется палец (dx > 0 — влево)', () => {
  assertEqual(swipeDirection(4, 1, false), null, 'меньше 6 пикселей — ещё непонятно');
  assertEqual(swipeDirection(10, 0, false), 'horizontal', 'ровно влево');
  assertEqual(swipeDirection(10, 12, false), 'horizontal', 'дуга пальцем ~50° — всё ещё свайп');
  assertEqual(swipeDirection(10, 14, false), 'vertical', 'круче — это прокрутка');
  assertEqual(swipeDirection(2, 20, false), 'vertical', 'вверх-вниз');
  assertEqual(swipeDirection(-10, 0, false), 'vertical', 'вправо у закрытой карточки — не свайп');
  assertEqual(swipeDirection(-10, 0, true), 'horizontal', 'вправо у открытой — закрыть свайпом');
});

test('свайп: решив «вбок», запрещаем прокрутку страницы', () => {
  const row = document.createElement('div');
  const actions = document.createElement('div');
  actions.style.width = '100px';
  const front = document.createElement('button');
  row.append(actions, front);
  document.body.append(row);
  swipeable(row, front, actions, { onTap: () => {} });
  const pe = (type, x, y) => front.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 2 }));
  const scrollBlocked = () => {
    const t = new Event('touchmove', { bubbles: true, cancelable: true });
    front.dispatchEvent(t);
    return t.defaultPrevented;
  };
  pe('pointerdown', 200, 100); pe('pointermove', 190, 108);
  assertEqual(scrollBlocked(), true, 'дуга влево — прокрутка запрещена');
  pe('pointerup', 190, 108);
  pe('pointerdown', 200, 100); pe('pointermove', 198, 120);
  assertEqual(scrollBlocked(), false, 'вниз — прокрутка разрешена');
  pe('pointercancel', 198, 120);
  row.remove();
});

import { test, assertEqual } from './runner.js';
import { settleSwipe, swipeable } from '../js/ui/swipe.js';

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

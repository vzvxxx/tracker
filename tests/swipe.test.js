import { test, assertEqual } from './runner.js';
import { settleSwipe } from '../js/ui/swipe.js';

test('свайп: карточка открывается, если проехала половину ширины кнопок', () => {
  assertEqual(settleSwipe(0, 116), 'closed', 'не двигали');
  assertEqual(settleSwipe(57, 116), 'closed', 'чуть меньше половины — возвращается');
  assertEqual(settleSwipe(58, 116), 'open', 'ровно половина — открыта');
  assertEqual(settleSwipe(116, 116), 'open', 'до конца');
});

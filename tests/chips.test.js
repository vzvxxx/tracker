import { test, assert } from './runner.js';
import { emotionChip } from '../js/ui/chips.js';

const em = { id: 'e1', name: 'грусть', type: 'heavy', cat: 'crying' };

test('котик-наклейка не создаётся заново при перерисовке (иначе на iPhone моргает)', () => {
  const first = emotionChip(em, 'strong', { stickerKey: 'top:e1' }).querySelector('.sticker');
  const again = emotionChip(em, 'strong', { stickerKey: 'top:e1' }).querySelector('.sticker');
  assert(first === again, 'та же картинка переносится в новую «таблетку»');
  const other = emotionChip(em, 'strong', { stickerKey: 'full:e1' }).querySelector('.sticker');
  assert(other !== first, 'в другом месте экрана — своя картинка');
  const newCat = emotionChip({ ...em, cat: 'angry' }, 'strong', { stickerKey: 'top:e1' }).querySelector('.sticker');
  assert(newCat !== first && newCat.getAttribute('src').includes('cat-angry'), 'сменили котика — новая картинка');
});

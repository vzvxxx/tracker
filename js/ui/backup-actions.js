// Действия с резервной копией, общие для экрана «Ещё» и плашки в «Ленте».
import { h } from './dom.js';
import { buildBackup, backupFileName, fingerprint } from '../backup.js';
import { nowIso } from '../model.js';

// Запомнить: дневник в нынешнем виде сохранён в копии от lastAt.
// По отпечатку потом видно, появилось ли в дневнике что-то новое.
export async function markBackedUp(ctx, lastAt = nowIso()) {
  const data = await ctx.db.exportAll();
  await ctx.db.putSetting({ id: 'backup', lastAt, fingerprint: await fingerprint(data) });
  await ctx.refresh();
}

// Скачать копию. true — копия засчитана, false — передумала (закрыла меню «Поделиться»).
export async function downloadBackup(ctx) {
  const json = JSON.stringify(buildBackup(await ctx.db.exportAll()), null, 2);
  const name = backupFileName();
  const file = new File([json], name, { type: 'application/json' });
  let shared = false;
  // На iPhone удобнее всего меню «Поделиться»: «Сохранить в Файлы», Telegram, AirDrop.
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      shared = true;
    } catch (error) {
      if (error.name === 'AbortError') return false; // передумала — копия не засчитана
    }
  }
  if (!shared) {
    // Где «Поделиться» нет — обычное скачивание файла.
    const url = URL.createObjectURL(file);
    const link = h('a', { href: url, download: name });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  await markBackedUp(ctx);
  return true;
}

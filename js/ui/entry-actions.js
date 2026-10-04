// Действия с записью, общие для «Ленты» и экрана записи.

// Удалить запись после подтверждения. true — удалена, false — передумала.
export async function deleteEntryConfirmed(ctx, id) {
  if (!window.confirm('Точно удалить? Вернуть запись будет нельзя.')) return false;
  await ctx.db.deleteEntry(id);
  await ctx.refresh();
  return true;
}

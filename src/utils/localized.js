// Товары и акции хранят переводы в соседних полях: `description`,
// `description_ru`, `description_tr`. Правило выбора одно на всё приложение —
// раньше оно было скопировано в SushiCard, ItemDetailScreen и BannerCarousel,
// и разъезжалось при любой правке.

const SUFFIX = { ru: '_ru', tr: '_tr' };

/**
 * Возвращает поле на текущем языке с откатом на базовое (турецко-английское).
 * Работает и со строками (`description`), и с массивами (`ingredients`):
 * пустой перевод считается отсутствующим, а не «пустым значением».
 */
export function pickLocalized(obj, field, lang) {
  if (!obj) return undefined;
  const suffix = SUFFIX[(lang || '').slice(0, 2)];
  if (suffix) {
    const translated = obj[field + suffix];
    const hasValue = Array.isArray(translated) ? translated.length > 0 : Boolean(translated);
    if (hasValue) return translated;
  }
  return obj[field];
}

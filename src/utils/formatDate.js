// Даты заказов раньше форматировались через жёстко зашитый 'en-US' в двух
// экранах сразу, поэтому у русского и турецкого пользователя история заказов
// всё равно была на английском. Локаль берём из текущего языка интерфейса.

const LOCALES = { en: 'en-US', ru: 'ru-RU', tr: 'tr-TR' };

const OPTIONS = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

export function formatOrderDate(value, lang) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const locale = LOCALES[(lang || '').slice(0, 2)] || LOCALES.en;
  try {
    return date.toLocaleDateString(locale, OPTIONS);
  } catch (_) {
    // На старых Android Intl может не знать локаль — лучше английская дата,
    // чем пустое место в списке заказов.
    return date.toLocaleDateString(LOCALES.en, OPTIONS);
  }
}

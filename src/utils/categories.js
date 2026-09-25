// Подпись и обложка категории — ровно те же правила, что на sushitimetr.com
// (см. Sushi_Time_frontend/src/utils/categories.js). Логика продублирована
// сознательно: приложение и сайт — разные сборки, общего пакета между ними
// нет, но расходиться в названиях разделов они не должны.

/**
 * Отображаемое имя категории.
 *
 * Приоритет: имя, заданное админом на активном языке → его же имя на любом
 * другом заполненном языке → зашитый перевод `cat_<slug>` → сам slug.
 *
 * Раньше приложение знало только про зашитый перевод, поэтому админ
 * переименовывал раздел на сайте («Роллы» → «РОЛИ», «temaki» → «Maki Roll»),
 * а в приложении он оставался старым — или, если перевода не было вовсе,
 * показывался сырой slug вроде `fast_food`.
 *
 * @param {string} cat   slug категории с бэкенда
 * @param {object} names справочник categoryNames: { slug: { en, ru, tr } }
 * @param {string} lang  текущий язык i18next
 * @param {(k: string, o?: object) => string} t
 */
export function categoryLabel(cat, names, lang, t) {
  const slug = (cat || '').toLowerCase();
  const l = (lang || 'en').slice(0, 2);

  const custom = names?.[cat] || names?.[slug];
  if (custom) {
    const picked = custom[l] || custom.en || custom.ru || custom.tr;
    if (picked) return picked;
  }

  return t(`cat_${slug}`, { defaultValue: capitalize(cat) });
}

/**
 * Обложка категории: то, что выбрал админ, иначе фото первого товара раздела.
 * Возвращает { imageUrl, scale, offsetX, offsetY } либо null.
 *
 * @param {string} cat
 * @param {object} images справочник categoryImages
 * @param {string|null} fallbackUrl фото первого товара категории
 */
export function categoryImage(cat, images, fallbackUrl) {
  const slug = (cat || '').toLowerCase();
  const picked = images?.[cat] || images?.[slug];

  if (picked?.imageUrl) {
    return {
      imageUrl: picked.imageUrl,
      scale: Number(picked.scale) || 1,
      offsetX: Number(picked.offsetX) || 0,
      offsetY: Number(picked.offsetY) || 0,
    };
  }

  // Справочник может прийти и «плоским» ({ slug: 'https://…' }) — так его
  // отдавали до появления кадрирования. Старый снимок в кеше переживёт
  // обновление приложения, поэтому оба вида должны работать.
  if (typeof picked === 'string' && picked) {
    return { imageUrl: picked, scale: 1, offsetX: 0, offsetY: 0 };
  }

  if (fallbackUrl) return { imageUrl: fallbackUrl, scale: 1, offsetX: 0, offsetY: 0 };
  return null;
}

/** Кадрирование обложки -> RN transform. width/height — размер рамки в px. */
export function categoryFrameTransform(image, size) {
  if (!image) return undefined;
  const { scale = 1, offsetX = 0, offsetY = 0 } = image;
  if (scale === 1 && offsetX === 0 && offsetY === 0) return undefined;
  return [
    { translateX: (size * offsetX) / 100 },
    { translateY: (size * offsetY) / 100 },
    { scale },
  ];
}

function capitalize(s) {
  const v = String(s || '');
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : v;
}

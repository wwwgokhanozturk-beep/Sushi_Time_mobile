// Поиск по товару целиком, а не только по названию: пользователь ищет
// «лосось», «острый», «tempura» — эти слова живут в описании, составе и
// категории, причём на трёх языках сразу.

const norm = (v) =>
  String(v ?? '')
    .toLowerCase()
    // «ё» → «е», иначе «лосось в кляре» не найдётся по «клере»
    .replace(/ё/g, 'е')
    // турецкие буквы приводим к латинице: «suşi» ищется и как «susi»
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .trim();

// Все текстовые поля товара в одну строку — считается один раз на товар
// и переиспользуется, пока объект товара не заменится новым с сервера.
const haystackCache = new WeakMap();

function haystack(item, categoryLabel) {
  const cached = haystackCache.get(item);
  if (cached && cached.label === categoryLabel) return cached.text;

  const parts = [
    item.name, item.name_ru, item.name_tr,
    item.description, item.description_ru, item.description_tr,
    item.category, categoryLabel,
  ];
  for (const list of [item.ingredients, item.ingredients_ru, item.ingredients_tr]) {
    if (Array.isArray(list)) parts.push(...list);
  }
  const text = parts.filter(Boolean).map(norm).join(' ');
  haystackCache.set(item, { label: categoryLabel, text });
  return text;
}

// Все слова запроса должны найтись — так «острый ролл» отсеивает просто «ролл».
export function filterItems(items, query, labelOf) {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return items;
  return items.filter((it) => {
    const text = haystack(it, norm(labelOf ? labelOf(it.category) : ''));
    return words.every((w) => text.includes(w));
  });
}

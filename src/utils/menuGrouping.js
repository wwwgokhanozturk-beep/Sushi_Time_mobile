// Порядок категорий в меню. Жил в двух экранах в виде двух одинаковых копий —
// стоило поправить приоритет в одном, второй начинал показывать другой порядок.

// Sushi-first: Sets → Rolls → Nigiri/Sashimi → закуски → … → напитки последними.
// Используется только внутри groupByCategory — наружу отдавать нечего.
const categoryPriority = (cat) => {
  const c = (cat || '').toLowerCase();
  if (c === 'sets') return 0;
  if (['rolls', 'maki', 'uramaki', 'hosomaki'].includes(c)) return 1;
  if (['nigiri', 'sashimi', 'gunkan', 'onigiri'].includes(c)) return 2;
  if (c === 'tempura') return 3;
  if (['appetizers', 'salads'].includes(c)) return 4;
  if (c === 'soups') return 5;
  if (['wok', 'noodles'].includes(c)) return 6;
  if (['pizza', 'fast_food'].includes(c)) return 7;
  if (c === 'desserts') return 8;
  if (c === 'drinks') return 9;
  return 10;
};

/**
 * Группирует товары по категориям и сортирует группы: сначала порядок,
 * заданный админкой (`categoryOrder`), затем встроенный sushi-first.
 * Внутри категории — `sortOrder` из админки.
 *
 * Ключ категории приводится к нижнему регистру: так Home и Menu гарантированно
 * получают одинаковые ключи, а с ними — одинаковые картинки и подписи.
 *
 * @returns {Array<[string, object[]]>}
 */
export function groupByCategory(items, categoryOrder = []) {
  const map = new Map();
  for (const item of items) {
    const key = (item.category || 'other').toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  // Порядок с сервера тоже приводим к нижнему регистру: иначе категория,
  // записанная в админке как «Sets», не найдётся среди ключей группировки.
  const order = categoryOrder.map((c) => (c || '').toLowerCase());
  const orderIndex = (cat) => {
    const i = order.indexOf(cat);
    return i === -1 ? Infinity : i;
  };

  return [...map.entries()].sort(([a], [b]) => {
    const oa = orderIndex(a);
    const ob = orderIndex(b);
    if (oa !== ob) return oa - ob;
    return categoryPriority(a) - categoryPriority(b);
  });
}

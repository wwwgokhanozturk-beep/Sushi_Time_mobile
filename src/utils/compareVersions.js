// Сравнение версий вида "1.1.7", "1.2", "2".
//
// Строковое сравнение здесь врёт — "1.10.0" оказывается меньше "1.9.0", — а
// тянуть semver ради трёх чисел незачем. Недостающие части считаем нулями,
// поэтому "1.2" и "1.2.0" равны.
//
// Тот же алгоритм лежит на бэкенде (utils/compareVersions.js): обе стороны
// должны одинаково отвечать на вопрос «эта сборка старше минимальной?».
//
// @returns {number} отрицательное если a < b, 0 если равны, положительное если a > b

const parse = (version) =>
  String(version ?? '')
    .trim()
    .split('.')
    .map((part) => {
      const n = Number.parseInt(part, 10);
      return Number.isNaN(n) ? 0 : n;
    });

export function compareVersions(a, b) {
  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i++) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

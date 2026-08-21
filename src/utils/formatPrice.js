/**
 * Format a numeric price as Turkish Lira: ₺ 149,90
 */
export const formatPrice = (price) =>
  `₺ ${parseFloat(price).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

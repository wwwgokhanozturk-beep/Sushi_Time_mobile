// Кадрирование фото из админки (масштаб + смещение в % рамки) -> RN transform.
// width/height — размер рамки в px (для пересчёта % смещения в пиксели).
export function imageFrameTransform(item, width, height) {
  const s = item?.imageScale ?? 1;
  const x = item?.imageOffsetX ?? 0;
  const y = item?.imageOffsetY ?? 0;
  if (s === 1 && x === 0 && y === 0) return undefined;
  return [
    { translateX: ((width || 0) * x) / 100 },
    { translateY: ((height || 0) * y) / 100 },
    { scale: s },
  ];
}

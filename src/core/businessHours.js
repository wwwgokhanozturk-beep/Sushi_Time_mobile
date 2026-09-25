// Режим работы ресторана — мобильное зеркало backend_api/src/utils/businessHours.js.
// Время считается по часовому поясу Турции (Анталья/Аланья = Europe/Istanbul,
// UTC+3 круглый год, без перехода на летнее время с 2016) — независимо от
// часового пояса телефона клиента.
// В RN/Hermes Intl.DateTimeFormat с timeZone ненадёжен, поэтому используем
// фиксированное смещение. Результат идентичен серверу (источник истины).

const TZ_OFFSET_MIN = 180; // Турция (Europe/Istanbul) = UTC+3
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

function zonedParts(date) {
  const shifted = new Date(date.getTime() + TZ_OFFSET_MIN * 60000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return {
    weekday: shifted.getUTCDay(), // 0=Вс
    date: `${y}-${m}-${d}`,
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

function emptyWeek() {
  return Array.from({ length: 7 }, () => ({ closed: false, open: '10:00', close: '23:00' }));
}

// { enabled, open, date, weekday, today, reason } — зеркало сервера.
export function computeOpenState(value, date = new Date()) {
  const week = Array.isArray(value?.week) && value.week.length === 7 ? value.week : emptyWeek();
  const holidays = Array.isArray(value?.holidays) ? value.holidays : [];
  const { weekday, date: todayStr, minutes } = zonedParts(date);
  const today = week[weekday] || { closed: false, open: '10:00', close: '23:00' };

  if (!value?.enabled) {
    return { enabled: false, open: true, date: todayStr, weekday, today, reason: 'disabled' };
  }
  if (holidays.includes(todayStr)) {
    return { enabled: true, open: false, date: todayStr, weekday, today, reason: 'holiday' };
  }
  if (today.closed) {
    return { enabled: true, open: false, date: todayStr, weekday, today, reason: 'day_off' };
  }

  const openMin = TIME_RE.test(today.open) ? toMinutes(today.open) : 0;
  const closeMin = TIME_RE.test(today.close) ? toMinutes(today.close) : 0;

  let open;
  if (openMin === closeMin) open = false;
  else if (closeMin > openMin) open = minutes >= openMin && minutes < closeMin;
  else open = minutes >= openMin || minutes < closeMin; // через полночь

  return { enabled: true, open, date: todayStr, weekday, today, reason: open ? 'open' : 'closed' };
}

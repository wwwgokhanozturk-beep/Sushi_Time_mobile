// How long one promotion slide stays on screen, in milliseconds.
// Mirrors web_client/src/utils/promo.js — both clients must read the same
// `durationSec` the admin panel writes, or a promotion would run at a
// different speed depending on where the customer opened it.
//
// Admins set `durationSec` per promotion; a short video used to restart while
// a long one got cut off, because every slide was pinned to the carousel's own
// fixed duration. Promotions saved before the field existed carry null, and
// each carousel has its own natural default, so the fallback stays
// per-carousel rather than being one shared constant.
//
// Bounds mirror the server (2–60s) so a value that somehow slipped past the
// admin form can't freeze the carousel or turn it into a strobe.
const MIN_SLIDE_SEC = 2;
const MAX_SLIDE_SEC = 60;

export function slideDurationMs(promo, fallbackMs) {
  const sec = Number(promo?.durationSec);
  if (!Number.isFinite(sec) || sec <= 0) return fallbackMs;
  return Math.min(Math.max(sec, MIN_SLIDE_SEC), MAX_SLIDE_SEC) * 1000;
}

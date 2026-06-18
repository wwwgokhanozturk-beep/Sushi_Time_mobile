// Business constants — centralized for consistency
export const DELIVERY_FEE = 2.99;
export const FREE_DELIVERY_THRESHOLD = 25;
export const SERVICE_FEE = 0.99;
export const TIP_OPTIONS = [0, 1, 2, 3, 5];

// Restaurant location (Mahmutlar, Kumru Sk. No:7/D, 07400 Alanya/Antalya)
export const RESTAURANT_LAT = 36.4907923;
export const RESTAURANT_LNG = 32.0966857;
export const RESTAURANT_ADDRESS = 'Mahmutlar, Kumru Sk. No:7/D, 07400 Alanya/Antalya';

// Mapbox public token (pk.*). Берётся из env (EXPO_PUBLIC_MAPBOX_TOKEN) — см. .env.local / EAS secrets.
export const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

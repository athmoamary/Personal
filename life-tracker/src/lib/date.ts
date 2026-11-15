// Asia/Riyadh is UTC+3 all year (no daylight saving), so a fixed offset is exact.
const OFFSET_MS = 3 * 60 * 60 * 1000;
export const TZ_LABEL = 'Asia/Riyadh';

const riy = (now: number) => new Date(now + OFFSET_MS);
export const todayStr = (now = Date.now()) => riy(now).toISOString().slice(0, 10);
export const nowMinutes = (now = Date.now()) => { const d = riy(now); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
export const parse = (ds: string) => new Date(ds + 'T00:00:00Z');
export const fmt = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (ds: string, n: number) => { const d = parse(ds); d.setUTCDate(d.getUTCDate() + n); return fmt(d); };
export const dow = (ds: string) => parse(ds).getUTCDay();
export const weekStart = (ds: string) => addDays(ds, -((dow(ds) + 6) % 7)); // Monday
export const weekDays = (ds: string) => { const s = weekStart(ds); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); };
export const monthStart = (ds: string) => ds.slice(0, 8) + '01';
export const monthDays = (ds: string) => {
  const s = parse(monthStart(ds));
  const out: string[] = [];
  const m = s.getUTCMonth();
  while (s.getUTCMonth() === m) { out.push(fmt(s)); s.setUTCDate(s.getUTCDate() + 1); }
  return out;
};
export const addMonths = (ds: string, n: number) => { const d = parse(monthStart(ds)); d.setUTCMonth(d.getUTCMonth() + n); return fmt(d); };
export const range = (from: string, to: string) => { const out: string[] = []; let d = from; while (d <= to) { out.push(d); d = addDays(d, 1); } return out; };

const f = (ds: string, o: Intl.DateTimeFormatOptions) => parse(ds).toLocaleDateString('en-US', { timeZone: 'UTC', ...o });
export const longDate = (ds: string) => f(ds, { month: 'long', day: 'numeric', year: 'numeric' });
export const weekdayName = (ds: string) => f(ds, { weekday: 'long' });
export const shortDay = (ds: string) => f(ds, { weekday: 'short' });
export const shortDate = (ds: string) => f(ds, { month: 'short', day: 'numeric' });
export const monthName = (ds: string) => f(ds, { month: 'long', year: 'numeric' });
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const fmtTime = (hhmm?: string) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`;
};
export const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const relDay = (ds: string, today: string) => ds === today ? 'Today' : ds === addDays(today, -1) ? 'Yesterday' : ds === addDays(today, 1) ? 'Tomorrow' : `${shortDay(ds)}, ${shortDate(ds)}`;

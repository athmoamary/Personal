import type { DayRecord, Habit, Reminder, Settings } from './types';
import { todayStr } from './date';

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const ALL = [0, 1, 2, 3, 4, 5, 6];
const START = '2000-01-01';

export const DEFAULT_HABITS: Habit[] = [
  { id: 'h-breakfast', name: 'Balanced breakfast with dates or olive oil', time: '09:00', days: ALL, conditional: false, enabled: true, category: 'wellness', startDate: START },
  { id: 'h-warmdrink', name: 'Warm drink after lunch, if feeling bloated', time: '14:00', days: ALL, conditional: true, enabled: true, category: 'wellness', startDate: START, note: 'Mark “Not needed” on days you feel fine — it never counts as missed.' },
  { id: 'h-bath', name: 'Warm bath or gentle massage after work', time: '18:00', days: ALL, conditional: false, enabled: true, category: 'wellness', startDate: START },
  { id: 'h-winddown', name: 'Wind down with a caffeine-free drink', time: '22:00', days: ALL, conditional: false, enabled: true, category: 'wellness', startDate: START },
  { id: 'h-bodycare', name: 'Weekly body-care and relaxation session', time: '17:00', days: [6], conditional: false, enabled: true, category: 'wellness', startDate: START },
  // Self-care checklist — gentle suggestions, OFF until you switch them on (they never affect scores while off).
  { id: 'sc-skincare', name: 'Evening skincare routine', days: ALL, conditional: false, enabled: false, category: 'selfcare', startDate: START },
  { id: 'sc-water', name: 'Drink enough water', days: ALL, conditional: false, enabled: false, category: 'selfcare', startDate: START },
  { id: 'sc-outdoors', name: 'Ten minutes of fresh air or sunlight', days: ALL, conditional: false, enabled: false, category: 'selfcare', startDate: START },
  { id: 'sc-journal', name: 'Gratitude or journaling moment', days: ALL, conditional: false, enabled: false, category: 'selfcare', startDate: START },
];

const r = (id: string, label: string, message: string, kind: Reminder['kind'], time: string, days = ALL, habitId?: string): Reminder =>
  ({ id, label, message, kind, time, days, habitId, repeat: 0, maxRepeats: 1, enabled: false });

// Every reminder ships DISABLED, and the master switch is OFF.
export const DEFAULT_REMINDERS: Reminder[] = [
  r('r-breakfast', 'Balanced breakfast', 'Time for a balanced breakfast with dates or olive oil.', 'habit', '09:00', ALL, 'h-breakfast'),
  r('r-warmdrink', 'Warm drink check-in', 'Feeling bloated after lunch? A warm drink may help. Mark “Not needed” if you feel fine.', 'habit', '14:00', ALL, 'h-warmdrink'),
  r('r-bath', 'Evening unwind', 'A warm bath or gentle massage after work.', 'habit', '18:00', ALL, 'h-bath'),
  r('r-winddown', 'Wind down', 'Wind down with a caffeine-free drink.', 'habit', '22:00', ALL, 'h-winddown'),
  r('r-saturday', 'Saturday self-care', 'Your weekly body-care and relaxation session.', 'selfcare', '17:00', [6], 'h-bodycare'),
  r('r-workout', 'Planned workout', 'You have a workout planned today.', 'workout', '07:30'),
  r('r-protein', 'Protein & fiber check', 'Log your meals — how are protein and fiber looking today?', 'nutrition', '19:00'),
  r('r-reading', 'Read for 10 minutes', 'Ten quiet minutes with a book.', 'reading', '21:00'),
];

export const defaultSettings = (): Settings => ({
  version: 1,
  name: '',
  theme: 'system',
  proteinMin: 100,
  proteinMax: 120,
  fiberGoal: 20,
  readingGoal: 10,
  consistencyThreshold: 75,
  targets: { strength: 3, pilates: 2, cardio: 4 },
  habits: DEFAULT_HABITS.map((h) => ({ ...h, days: [...h.days] })),
  reminders: DEFAULT_REMINDERS.map((x) => ({ ...x, days: [...x.days] })),
  remindersOn: false,
  browserNotifications: false,
  firstUsed: todayStr(),
});

export const emptyDay = (date: string): DayRecord => ({
  date, habits: {}, meals: [], reading: { accMs: 0, runningSince: null, completed: false }, workouts: [], plan: [],
});

// Fill any missing fields (older records, partial docs) so the UI can trust the shape.
export const normalizeDay = (date: string, raw: any): DayRecord => {
  const e = emptyDay(date);
  if (!raw || typeof raw !== 'object') return e;
  const dedupe = <T extends { id: string }>(a: unknown): T[] => {
    if (!Array.isArray(a)) return [];
    const seen = new Set<string>();
    return (a as T[]).filter((x) => x && typeof x.id === 'string' && !seen.has(x.id) && seen.add(x.id));
  };
  return {
    date,
    habits: raw.habits && typeof raw.habits === 'object' ? { ...raw.habits } : {},
    meals: dedupe(raw.meals),
    reading: { ...e.reading, ...(raw.reading || {}) },
    workouts: dedupe<any>(raw.workouts).map((w) => ({ ...w, date })),
    plan: dedupe(raw.plan),
  };
};

export const normalizeSettings = (raw: any): Settings => {
  const d = defaultSettings();
  if (!raw || typeof raw !== 'object') return d;
  return {
    ...d,
    ...raw,
    firstUsed: typeof raw.firstUsed === 'string' ? raw.firstUsed : d.firstUsed,
    targets: { ...d.targets, ...(raw.targets || {}) },
    habits: Array.isArray(raw.habits) ? raw.habits : d.habits,
    reminders: Array.isArray(raw.reminders) ? raw.reminders : d.reminders,
  };
};

export const STRENGTH_SESSIONS = [
  { id: 'lower1', label: 'Lower Body — Session 1' },
  { id: 'lower2', label: 'Lower Body — Session 2' },
  { id: 'upper1', label: 'Upper Body — Session 1' },
];
export const PILATES_TYPES = ['Mat', 'Reformer', 'Wall Pilates', 'Online class', 'Other'];
export const CARDIO_TYPES = ['StairMaster', 'Elliptical', 'Treadmill', 'Outdoor walking', 'Other'];
export const WORKOUT_LABEL: Record<string, string> = { strength: 'Strength', pilates: 'Pilates', cardio: 'Cardio' };
export const subtypeLabel = (type: string, sub: string) => type === 'strength' ? (STRENGTH_SESSIONS.find((s) => s.id === sub)?.label ?? sub) : sub;

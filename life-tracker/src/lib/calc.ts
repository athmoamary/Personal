import type { AppState, DayRecord, Habit, Settings, Workout, WorkoutType } from './types';
import { addDays, dow, range, weekDays } from './date';
import { emptyDay } from './defaults';

export const getDay = (s: AppState, date: string): DayRecord => s.days[date] ?? emptyDay(date);

export const habitsForDay = (settings: Settings, date: string, category?: Habit['category']) =>
  settings.habits.filter((h) => h.enabled && h.days.includes(dow(date)) && h.startDate <= date && date >= settings.firstUsed && (!category || h.category === category));

export const totals = (d: DayRecord) => d.meals.reduce(
  (a, m) => ({ protein: a.protein + (m.protein || 0), fiber: a.fiber + (m.fiber || 0), calories: a.calories + (m.calories || 0), carbs: a.carbs + (m.carbs || 0), fat: a.fat + (m.fat || 0) }),
  { protein: 0, fiber: 0, calories: 0, carbs: 0, fat: 0 },
);

export const readingMs = (r: DayRecord['reading'], now: number) => r.accMs + (r.runningSince ? Math.max(0, now - r.runningSince) : 0);
export const readingMinutes = (d: DayRecord, now: number) => Math.floor(readingMs(d.reading, now) / 60000) + (d.reading.manualMin || 0);

export interface DayItem { key: string; label: string; state: 'done' | 'pending' | 'excluded' }
export interface DayScore { items: DayItem[]; done: number; counted: number; pct: number | null; proteinMet: boolean; fiberMet: boolean; readingDone: boolean; tracked: boolean }

/** Daily score — daily items only (habits + protein + fiber + reading).
 *  “Skipped” and “Not needed” are removed from the denominator, so they never lower the score.
 *  Workouts are weekly targets and are scored separately. */
export function dayScore(s: AppState, date: string): DayScore {
  const d = getDay(s, date);
  const st = s.settings;
  const items: DayItem[] = [];
  for (const h of habitsForDay(st, date)) {
    const v = d.habits[h.id];
    items.push({ key: h.id, label: h.name, state: v === 'done' ? 'done' : v === 'skipped' || v === 'notneeded' ? 'excluded' : 'pending' });
  }
  const t = totals(d);
  const proteinMet = t.protein >= st.proteinMin;
  const fiberMet = t.fiber >= st.fiberGoal;
  const readingDone = d.reading.completed;
  items.push({ key: 'protein', label: `Protein ${st.proteinMin} g`, state: proteinMet ? 'done' : 'pending' });
  items.push({ key: 'fiber', label: `Fiber ${st.fiberGoal} g`, state: fiberMet ? 'done' : 'pending' });
  items.push({ key: 'reading', label: `Read ${st.readingGoal} min`, state: readingDone ? 'done' : 'pending' });
  const counted = items.filter((i) => i.state !== 'excluded').length;
  const done = items.filter((i) => i.state === 'done').length;
  const tracked = !!s.days[date] && (Object.keys(d.habits).length > 0 || d.meals.length > 0 || d.reading.completed || d.reading.accMs > 0 || d.workouts.some((w) => w.status === 'done'));
  return { items, done, counted, pct: counted ? done / counted : null, proteinMet, fiberMet, readingDone, tracked };
}

export const workoutsInRange = (s: AppState, days: string[]) => days.flatMap((d) => getDay(s, d).workouts);

export interface WeekFitness { done: Record<WorkoutType, number>; planned: Record<WorkoutType, number>; pct: number; totalDone: number; totalTarget: number }
/** Weekly fitness — progress toward 3 + 2 + 4 sessions. Extra sessions are welcome but capped per type for the score. */
export function weekFitness(s: AppState, anyDate: string): WeekFitness {
  const ws = workoutsInRange(s, weekDays(anyDate));
  const z = () => ({ strength: 0, pilates: 0, cardio: 0 });
  const done = z(), planned = z();
  for (const w of ws) { if (w.status === 'done') done[w.type]++; else if (w.status === 'planned') planned[w.type]++; }
  const T = s.settings.targets;
  const totalTarget = T.strength + T.pilates + T.cardio;
  const capped = (Object.keys(T) as WorkoutType[]).reduce((a, k) => a + Math.min(done[k], T[k]), 0);
  return { done, planned, pct: totalTarget ? capped / totalTarget : 0, totalDone: capped, totalTarget };
}

/** Consistency streak — consecutive days that reached your daily threshold. Today counts once it is reached. */
export function streak(s: AppState, today: string, test: (date: string) => boolean) {
  let n = 0;
  let d = test(today) ? today : addDays(today, -1);
  const floor = addDays(today, -800);
  while (d >= floor && test(d)) { n++; d = addDays(d, -1); }
  return n;
}
export const consistencyTest = (s: AppState) => (date: string) => { const sc = dayScore(s, date); return sc.pct !== null && sc.pct * 100 >= s.settings.consistencyThreshold; };
export const readingTest = (s: AppState) => (date: string) => getDay(s, date).reading.completed;

export function longestStreak(dates: string[], test: (d: string) => boolean) {
  let best = 0, cur = 0;
  for (const d of dates) { if (test(d)) { cur++; best = Math.max(best, cur); } else cur = 0; }
  return best;
}

/** Habit completion rates. Days before you started using Évol are ignored, and today only
 *  counts once you've marked the habit (it isn't “missed” before the day is over). */
export function habitRates(s: AppState, dates: string[], today?: string) {
  return s.settings.habits.filter((h) => h.enabled).map((h) => {
    let done = 0, counted = 0, excluded = 0;
    for (const d of dates) {
      if (!h.days.includes(dow(d)) || h.startDate > d || d < s.settings.firstUsed) continue;
      const v = getDay(s, d).habits[h.id];
      if (d === today && !v) continue;
      if (v === 'skipped' || v === 'notneeded') { excluded++; continue; }
      counted++;
      if (v === 'done') done++;
    }
    return { habit: h, done, counted, excluded, rate: counted ? done / counted : null };
  });
}

export function nutritionStats(s: AppState, dates: string[]) {
  const tracked = dates.filter((d) => getDay(s, d).meals.length > 0);
  const tots = tracked.map((d) => totals(getDay(s, d)));
  const avg = (k: 'protein' | 'fiber') => (tots.length ? tots.reduce((a, t) => a + t[k], 0) / tots.length : 0);
  const pMet = tots.filter((t) => t.protein >= s.settings.proteinMin).length;
  const fMet = tots.filter((t) => t.fiber >= s.settings.fiberGoal).length;
  return { trackedDays: tracked.length, avgProtein: avg('protein'), avgFiber: avg('fiber'), proteinMetPct: tots.length ? pMet / tots.length : null, fiberMetPct: tots.length ? fMet / tots.length : null, pMet, fMet };
}

export const pastDates = (from: string, to: string, today: string) => range(from, to < today ? to : today);

export function personalRecords(s: AppState) {
  const prs = new Map<string, { name: string; weight: number; reps?: number; date: string }>();
  for (const day of Object.values(s.days)) {
    for (const w of day.workouts) {
      if (w.type !== 'strength' || w.status !== 'done') continue;
      for (const e of w.exercises ?? []) {
        if (!e.name || !e.weight) continue;
        const key = e.name.trim().toLowerCase();
        const cur = prs.get(key);
        if (!cur || e.weight > cur.weight || (e.weight === cur.weight && (e.reps ?? 0) > (cur.reps ?? 0))) prs.set(key, { name: e.name.trim(), weight: e.weight, reps: e.reps, date: w.date });
      }
    }
  }
  return [...prs.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export const workoutState = (w: Workout, today: string): 'completed' | 'upcoming' | 'missed' | 'skipped' =>
  w.status === 'done' ? 'completed' : w.status === 'skipped' ? 'skipped' : w.date < today ? 'missed' : 'upcoming';

export const pct = (x: number | null | undefined) => (x === null || x === undefined ? '—' : `${Math.round(x * 100)}%`);
export const round1 = (x: number) => Math.round(x * 10) / 10;

import type { AppState, DayRecord, Habit, RitualId } from './types';
import { addDays, dow } from './date';
import { getDay } from './calc';
import { FM_IDS } from './defaults';
import { PROMPTS, RITUALS } from './frequency';

/** The Frequency Maxxing activities that apply on a date (enabled, scheduled that weekday, started by then). */
export const fmHabits = (s: AppState, date: string): Habit[] =>
  s.settings.habits.filter((h) => h.category === 'frequency' && h.enabled && h.days.includes(dow(date)) && h.startDate <= date && date >= s.settings.firstUsed);

export interface FmDay { done: number; total: number; pct: number | null; perfect: boolean; active: boolean; byRitual: Record<RitualId, { done: number; total: number }>; listenMin: number }

export function fmDay(s: AppState, date: string): FmDay {
  const d = getDay(s, date);
  const hs = fmHabits(s, date);
  const byRitual: FmDay['byRitual'] = { morning: { done: 0, total: 0 }, midday: { done: 0, total: 0 }, evening: { done: 0, total: 0 } };
  let done = 0;
  for (const h of hs) {
    const ok = d.habits[h.id] === 'done';
    if (ok) done++;
    if (h.ritual) { byRitual[h.ritual].total++; if (ok) byRitual[h.ritual].done++; }
  }
  const total = hs.length;
  return { done, total, pct: total ? done / total : null, perfect: total > 0 && done === total, active: done > 0, byRitual, listenMin: listeningMinutes(s, d) };
}

/** Listening time = finished timer sessions, plus the planned duration of a listening activity you ticked by hand with no session logged. */
export function listeningMinutes(s: AppState, d: DayRecord) {
  const sessions = d.listens ?? [];
  let min = sessions.reduce((a, x) => a + x.minutes, 0);
  for (const r of RITUALS) {
    const hid = r.id === 'midday' ? 'fm-midday' : r.id === 'morning' ? 'fm-morning-listen' : 'fm-evening-listen';
    if (d.habits[hid] === 'done' && !sessions.some((x) => x.ritual === r.id)) {
      const h = s.settings.habits.find((x) => x.id === hid);
      min += h?.duration ?? 0;
    }
  }
  return min;
}

/** Streak of consecutive days passing `test`; today counts once it passes, otherwise the streak runs to yesterday. */
export function fmStreak(s: AppState, today: string, test: (f: FmDay) => boolean) {
  let n = 0;
  let d = test(fmDay(s, today)) ? today : addDays(today, -1);
  while (d >= s.settings.firstUsed && test(fmDay(s, d))) { n++; d = addDays(d, -1); }
  return n;
}

export const hasJournal = (d: DayRecord) => !!d.journal && Object.values(d.journal).some((v) => v && v.trim());
export const journalCount = (d: DayRecord) => (d.journal ? PROMPTS.filter((p) => d.journal![p.id]?.trim()).length : 0);

export function activityRates(s: AppState, dates: string[], today: string) {
  return FM_IDS.map((id) => s.settings.habits.find((h) => h.id === id)).filter((h): h is Habit => !!h && h.enabled).map((h) => {
    let done = 0, counted = 0;
    for (const d of dates) {
      if (!h.days.includes(dow(d)) || h.startDate > d || d < s.settings.firstUsed) continue;
      const v = getDay(s, d).habits[h.id];
      if (d === today && v !== 'done') continue; // today isn't missed until it's over
      counted++;
      if (v === 'done') done++;
    }
    return { habit: h, done, counted, rate: counted ? done / counted : null };
  });
}

export function moodSummary(s: AppState, dates: string[]) {
  const entries = dates.flatMap((d) => (getDay(s, d).moods ?? []).map((m) => ({ ...m, date: d })));
  const paired = entries.filter((m) => m.before && m.after);
  const better = paired.filter((m) => m.after! > m.before!).length;
  const worse = paired.filter((m) => m.after! < m.before!).length;
  const same = paired.length - better - worse;
  const avg = (k: 'before' | 'after') => (paired.length ? paired.reduce((a, m) => a + m[k]!, 0) / paired.length : null);
  const kinds: Record<string, number> = {};
  entries.forEach((m) => { kinds[m.kind] = (kinds[m.kind] || 0) + 1; });
  return { entries, paired, better, worse, same, avgBefore: avg('before'), avgAfter: avg('after'), kinds };
}

export const latestMood = (d: DayRecord) => (d.moods && d.moods.length ? [...d.moods].sort((a, b) => b.at - a.at)[0] : null);

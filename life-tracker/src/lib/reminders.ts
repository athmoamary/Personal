import { useEffect, useRef } from 'react';
import type { AppState, Reminder } from './types';
import { dow, nowMinutes, todayStr, toMin } from './date';
import { getDay, totals } from './calc';

const mem: Record<string, any> = {};
const ls = {
  get(k: string) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : mem[k]; } catch { return mem[k]; } },
  set(k: string, v: any) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};
const FIRED = 'lt-fired-v1';
const SNOOZE = 'lt-snooze-v1';

export const isPaused = (r: Reminder, today: string) => !!r.pausedUntil && (r.pausedUntil === 'forever' || r.pausedUntil >= today);
export const snoozedUntil = (id: string): number | undefined => (ls.get(SNOOZE) || {})[id];
export function snooze(id: string, minutes: number) { const s = ls.get(SNOOZE) || {}; s[id] = Date.now() + minutes * 60000; ls.set(SNOOZE, s); }
export function clearSnooze(id: string) { const s = ls.get(SNOOZE) || {}; delete s[id]; ls.set(SNOOZE, s); }

/** Is the reminder still relevant right now? (e.g. no nudge for a habit you already did) */
export function relevant(r: Reminder, s: AppState, date: string): { ok: boolean; message: string } {
  const d = getDay(s, date);
  switch (r.kind) {
    case 'habit':
    case 'selfcare': {
      if (r.habitId) {
        const h = s.settings.habits.find((x) => x.id === r.habitId);
        if (!h || !h.enabled || !h.days.includes(dow(date))) return { ok: false, message: '' };
        if (d.habits[r.habitId]) return { ok: false, message: '' };
      }
      return { ok: true, message: r.message };
    }
    case 'workout': {
      const planned = d.workouts.filter((w) => w.status === 'planned');
      if (!planned.length) return { ok: false, message: '' };
      const names = planned.map((w) => (w.type === 'strength' ? 'Strength' : w.type === 'pilates' ? 'Pilates' : 'Cardio')).join(' + ');
      return { ok: true, message: `Planned today: ${names}.` };
    }
    case 'nutrition': {
      const t = totals(d);
      const p = t.protein >= s.settings.proteinMin, f = t.fiber >= s.settings.fiberGoal;
      if (p && f) return { ok: false, message: '' };
      return { ok: true, message: `So far: ${Math.round(t.protein)} g protein, ${Math.round(t.fiber)} g fiber.${!p ? ` ${Math.round(s.settings.proteinMin - t.protein)} g protein to go.` : ''}${!f ? ` ${Math.round(s.settings.fiberGoal - t.fiber)} g fiber to go.` : ''}` };
    }
    case 'reading':
      return d.reading.completed ? { ok: false, message: '' } : { ok: true, message: r.message };
    default:
      return { ok: true, message: r.message };
  }
}

export const slots = (r: Reminder) => {
  const base = toMin(r.time);
  const n = r.repeat ? Math.max(1, r.maxRepeats) : 1;
  return Array.from({ length: n }, (_, i) => base + i * r.repeat).filter((m) => m < 1440);
};

export interface Fire { r: Reminder; message: string }

/** In-app reminder engine: checks once a minute while Life Tracker is open. Nothing runs unless you
 *  turned on the master switch AND the individual reminder. */
export function useReminderEngine(state: AppState, now: number, onFire: (f: Fire) => void) {
  const lastMinute = useRef(-1);
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    const minute = Math.floor(now / 60000);
    if (minute === lastMinute.current) return;
    lastMinute.current = minute;
    const s = stateRef.current;
    if (!s.settings.remindersOn) return;
    const today = todayStr(now);
    const nm = nowMinutes(now);
    const fired: Record<string, number> = ls.get(FIRED) || {};
    // prune old entries
    for (const k of Object.keys(fired)) if (fired[k] < now - 3 * 86400000) delete fired[k];
    const snoozes: Record<string, number> = ls.get(SNOOZE) || {};
    for (const r of s.settings.reminders) {
      if (!r.enabled || isPaused(r, today) || !r.days.includes(dow(today))) continue;
      const rel = relevant(r, s, today);
      if (!rel.ok) continue;
      const sn = snoozes[r.id];
      if (sn) {
        if (now >= sn) { delete snoozes[r.id]; ls.set(SNOOZE, snoozes); onFire({ r, message: rel.message }); }
        continue;
      }
      for (const m of slots(r)) {
        const key = `${r.id}|${today}|${m}`;
        if (nm >= m && nm - m <= 60 && !fired[key]) { fired[key] = now; onFire({ r, message: rel.message }); break; }
      }
    }
    ls.set(FIRED, fired);
  }, [now, onFire]);
}

export async function tryBrowserNotify(title: string, body: string) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg) { await reg.showNotification(title, { body, icon: './icon-192.png', tag: title }); return; }
    new Notification(title, { body });
  } catch { /* not allowed here */ }
}

// ---------- Calendar export (.ics) — real phone notifications via your calendar app ----------
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
export function buildICS(reminders: Reminder[], startDate: string) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Life Tracker//Reminders//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Life Tracker', 'X-WR-TIMEZONE:Asia/Riyadh',
    'BEGIN:VTIMEZONE', 'TZID:Asia/Riyadh', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0300', 'TZOFFSETTO:+0300', 'TZNAME:+03', 'END:STANDARD', 'END:VTIMEZONE',
  ];
  for (const r of reminders) {
    const ds = startDate.replace(/-/g, '');
    for (const m of slots(r)) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      const end = m + 10;
      lines.push('BEGIN:VEVENT', `UID:${r.id}-${m}@life-tracker`, `DTSTAMP:${stamp}`,
        `DTSTART;TZID=Asia/Riyadh:${ds}T${hh}${mm}00`, `DTEND;TZID=Asia/Riyadh:${ds}T${String(Math.floor(end / 60) % 24).padStart(2, '0')}${String(end % 60).padStart(2, '0')}00`,
        `RRULE:FREQ=WEEKLY;BYDAY=${r.days.map((d) => BYDAY[d]).join(',')}`,
        `SUMMARY:${esc('Life Tracker · ' + r.label)}`, `DESCRIPTION:${esc(r.message)}`, 'TRANSP:TRANSPARENT',
        'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(r.label)}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
    }
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

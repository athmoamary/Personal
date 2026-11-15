import { useEffect, useRef } from 'react';
import { useStore } from './store';
import { addDays } from './date';
import { uid } from './defaults';
import { LISTEN_HABIT } from './frequency';
import type { DayRecord, FmTimer } from './types';

export const fmElapsed = (t: FmTimer, now: number) => t.accMs + (t.runningSince ? Math.max(0, now - t.runningSince) : 0);
export const fmDone = (t: FmTimer) => !t.runningSince && t.accMs >= t.minutes * 60000;

/** Finishes a listening countdown when it reaches zero — even if you were on another page or the app was closed.
 *  Logs the session, and (if you chose it) ticks the matching ritual activity. */
export function useFmTimerWatcher(onComplete: (minutes: number, hz: number) => void) {
  const { state, today, now, updateDay } = useStore();
  const busy = useRef(false);
  useEffect(() => {
    if (busy.current) return;
    for (const date of [today, addDays(today, -1)]) {
      const d = state.days[date];
      const t = d?.fmTimer;
      if (!t || !t.runningSince) continue;
      const total = t.minutes * 60000;
      if (fmElapsed(t, now) < total) continue;
      busy.current = true;
      updateDay(date, (x: DayRecord) => {
        const cur = x.fmTimer;
        if (!cur || !cur.runningSince) return x;
        const habits = { ...x.habits };
        if (cur.auto && cur.ritual !== 'none') habits[LISTEN_HABIT[cur.ritual]] = 'done';
        return { ...x, habits, fmTimer: { ...cur, accMs: total, runningSince: null }, listens: [...(x.listens ?? []), { id: uid(), freq: cur.freq, minutes: cur.minutes, ritual: cur.ritual, at: Date.now() }] };
      });
      onComplete(t.minutes, t.freq);
      busy.current = false;
      break;
    }
  }, [now, today, state.days, updateDay, onComplete]);
}

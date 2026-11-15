import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { readingMs } from '../lib/calc';
import { Icon, Ring, useToast } from './ui';

const mmss = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/** Timer state is stored as “accumulated time + the moment it was started”, so time keeps counting
 *  correctly while the screen is locked, the tab is in the background, or the app is closed. */
export function ReadingTimer({ date, compact }: { date: string; compact?: boolean }) {
  const { day, updateDay, now, state, today } = useStore();
  const toast = useToast();
  const d = day(date);
  const goalMs = state.settings.readingGoal * 60000;
  const ms = readingMs(d.reading, now);
  const running = !!d.reading.runningSince;
  const [book, setBook] = useState(d.reading.book ?? '');
  useEffect(() => setBook(d.reading.book ?? ''), [d.reading.book]);
  const notified = useRef(false);

  // Automatic completion at the goal (timer keeps running in case you want to read on).
  useEffect(() => {
    if (running && ms >= goalMs && !d.reading.completed && !notified.current) {
      notified.current = true;
      updateDay(date, (x) => ({ ...x, reading: { ...x.reading, completed: true } }));
      toast.push({ title: `${state.settings.readingGoal} minutes of reading — complete!`, body: 'The timer keeps going if you want to read on. Pause anytime.' });
    }
  }, [running, ms, goalMs, d.reading.completed, date, updateDay, toast, state.settings.readingGoal]);

  // A timer left running on a previous day: show a gentle note instead of silently losing or inflating time.
  const staleRun = running && date < today;

  const start = () => updateDay(date, (x) => ({ ...x, reading: { ...x.reading, runningSince: Date.now() } }));
  const pause = () => updateDay(date, (x) => ({ ...x, reading: { ...x.reading, accMs: readingMs(x.reading, Date.now()), runningSince: null } }));
  const reset = () => { notified.current = false; updateDay(date, (x) => ({ ...x, reading: { ...x.reading, accMs: 0, runningSince: null, completed: x.reading.manualMin ? x.reading.completed : false } })); };
  const manual = () => updateDay(date, (x) => {
    const minsSoFar = Math.floor(readingMs(x.reading, Date.now()) / 60000);
    return { ...x, reading: { ...x.reading, completed: !x.reading.completed, manualMin: !x.reading.completed ? Math.max(0, state.settings.readingGoal - minsSoFar) || undefined : undefined } };
  });
  const saveBook = () => { if ((d.reading.book ?? '') !== book.trim()) updateDay(date, (x) => ({ ...x, reading: { ...x.reading, book: book.trim() || undefined } })); };

  const progress = Math.min(1, ms / goalMs);
  const ringColor = d.reading.completed ? '#6C8F64' : '#C06C82';
  return (
    <div className={compact ? 'flex items-center gap-4' : 'flex flex-col items-center gap-4'}>
      <Ring value={d.reading.completed ? Math.max(progress, 1) : progress} size={compact ? 92 : 190} stroke={compact ? 8 : 12} color={ringColor} label={`Reading ${Math.floor(ms / 60000)} of ${state.settings.readingGoal} minutes`}>
        <span className={`${compact ? 'text-lg' : 'text-4xl'} font-display font-semibold tabular-nums`}>{mmss(ms)}</span>
        {!compact && <span className="muted text-xs">{d.reading.completed ? 'Goal complete ✓' : `of ${state.settings.readingGoal}:00`}</span>}
        {compact && d.reading.completed && <span className="text-[10px] font-medium text-sage-600">done</span>}
      </Ring>
      <div className={compact ? 'min-w-0 flex-1' : 'w-full'}>
        {staleRun && <p className="mb-2 rounded-2xl bg-blush-50 dark:bg-blush-700/20 p-2.5 text-xs text-blush-700 dark:text-blush-200">This timer was left running since an earlier day. Pause it to keep the time, or reset to discard it.</p>}
        <div className={`flex flex-wrap gap-2 ${compact ? '' : 'justify-center'}`}>
          {running ? (
            <button className="btn-primary" onClick={pause}><Icon name="pause" className="h-4 w-4" />Pause</button>
          ) : (
            <button className="btn-primary" onClick={start}><Icon name="play" className="h-4 w-4" />{ms > 0 ? 'Resume' : 'Start'}</button>
          )}
          {!compact && <button className="btn-ghost" onClick={reset} disabled={ms === 0}><Icon name="reset" className="h-4 w-4" />Reset</button>}
          <button className={d.reading.completed ? 'btn-sage' : 'btn-ghost'} onClick={manual}>
            <Icon name="check" className="h-4 w-4" />{d.reading.completed ? 'Completed' : 'Mark done'}
          </button>
        </div>
        {!compact && (
          <label className="mt-4 block w-full">
            <span className="label">Book (optional)</span>
            <input className="input" value={book} onChange={(e) => setBook(e.target.value)} onBlur={saveBook} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} placeholder="What are you reading?" />
          </label>
        )}
        {compact && d.reading.book && <p className="muted mt-1.5 truncate text-xs">Reading: {d.reading.book}</p>}
      </div>
    </div>
  );
}

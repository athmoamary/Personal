import type { Habit, HabitStatus } from '../lib/types';
import { useStore } from '../lib/store';
import { fmtTime } from '../lib/date';
import { Icon } from './ui';

export function useHabitStatus(date: string) {
  const { day, updateDay } = useStore();
  const d = day(date);
  const set = (id: string, v: HabitStatus | null) => updateDay(date, (x) => {
    const habits = { ...x.habits };
    if (v === null) delete habits[id]; else habits[id] = v;
    return { ...x, habits };
  });
  return { status: (id: string) => d.habits[id] as HabitStatus | undefined, set };
}

export function HabitRow({ habit, date }: { habit: Habit; date: string }) {
  const { status, set } = useHabitStatus(date);
  const s = status(habit.id);
  const done = s === 'done';
  const excluded = s === 'skipped' || s === 'notneeded';
  return (
    <div className={`flex items-center gap-3 rounded-2xl p-3 transition ${done ? 'bg-sage-50 dark:bg-sage-700/15' : 'bg-cream/60 dark:bg-night-700'}`}>
      <button onClick={() => set(habit.id, done ? null : 'done')} aria-label={done ? `Undo ${habit.name}` : `Complete ${habit.name}`}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition ${done ? 'border-sage-500 bg-sage-500 text-white animate-pop' : 'border-taupe-200 text-transparent dark:border-night-500'}`}>
        <Icon name="check" className="h-4 w-4" strokeWidth={2.4} />
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium leading-snug ${done ? 'text-taupe-500 line-through decoration-sage-400/70' : ''} ${excluded ? 'text-taupe-400' : ''}`}>{habit.name}</p>
        <p className="muted text-xs">{habit.time ? fmtTime(habit.time) : 'Any time'}{habit.conditional ? ' · only if needed' : ''}{s === 'notneeded' ? ' · not needed today' : s === 'skipped' ? ' · skipped (not counted)' : ''}</p>
      </div>
      {!done && (habit.conditional ? (
        <button onClick={() => set(habit.id, s === 'notneeded' ? null : 'notneeded')} className={`chip shrink-0 border ${s === 'notneeded' ? 'border-sage-300 bg-sage-100 text-sage-700 dark:bg-sage-700/30 dark:text-sage-200' : 'border-taupe-200 text-taupe-500 dark:border-night-500 dark:text-taupe-300'}`}>Not needed</button>
      ) : (
        <button onClick={() => set(habit.id, s === 'skipped' ? null : 'skipped')} className={`chip shrink-0 border ${s === 'skipped' ? 'border-taupe-300 bg-taupe-100 text-taupe-600 dark:bg-night-600 dark:text-taupe-200' : 'border-taupe-200 text-taupe-400 dark:border-night-500'}`}>Skip</button>
      ))}
    </div>
  );
}

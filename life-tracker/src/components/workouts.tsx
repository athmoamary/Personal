import { useEffect, useState } from 'react';
import type { Exercise, Workout, WorkoutType } from '../lib/types';
import { CARDIO_TYPES, PILATES_TYPES, STRENGTH_SESSIONS, subtypeLabel, uid, WORKOUT_LABEL } from '../lib/defaults';
import { useStore } from '../lib/store';
import { fmtTime, relDay, weekDays } from '../lib/date';
import { getDay, workoutState } from '../lib/calc';
import { Confirm, Icon, NumberField, Segmented, Sheet, useToast } from './ui';

export const TYPE_COLOR: Record<WorkoutType, string> = { strength: '#C4577E', pilates: '#5B6FB0', cardio: '#B8862C' };
export const TYPE_BG: Record<WorkoutType, string> = { strength: 'bg-strength', pilates: 'bg-pilates', cardio: 'bg-cardio' };

export function useWorkoutActions() {
  const { updateDay, updateDays } = useStore();
  const save = (w: Workout, originalDate?: string) => {
    if (originalDate && originalDate !== w.date) {
      updateDays((days) => {
        const from = days[originalDate];
        const next = { ...days };
        if (from) next[originalDate] = { ...from, workouts: from.workouts.filter((x) => x.id !== w.id) };
        const to = next[w.date] ?? { date: w.date, habits: {}, meals: [], reading: { accMs: 0, runningSince: null, completed: false }, workouts: [], plan: [] };
        next[w.date] = { ...to, workouts: [...to.workouts.filter((x) => x.id !== w.id), w] };
        return next;
      });
    } else {
      updateDay(w.date, (d) => {
        const exists = d.workouts.some((x) => x.id === w.id);
        return { ...d, workouts: exists ? d.workouts.map((x) => (x.id === w.id ? w : x)) : [...d.workouts, w] };
      });
    }
  };
  const remove = (w: Workout) => updateDay(w.date, (d) => ({ ...d, workouts: d.workouts.filter((x) => x.id !== w.id) }));
  const setStatus = (w: Workout, status: Workout['status']) => save({ ...w, status });
  const move = (w: Workout, to: string) => { if (to === w.date) return; save({ ...w, date: to, rescheduledFrom: w.rescheduledFrom ?? w.date }, w.date); };
  return { save, remove, setStatus, move };
}

export const newWorkout = (date: string, type: WorkoutType = 'strength', status: Workout['status'] = 'done'): Workout => ({
  id: uid(), date, type, subtype: type === 'strength' ? 'lower1' : type === 'pilates' ? 'Mat' : 'StairMaster', status, createdAt: Date.now(),
});

export function WorkoutForm({ open, onClose, initial, title }: { open: boolean; onClose: () => void; initial: Workout | null; title?: string }) {
  const { state, today } = useStore();
  const { save } = useWorkoutActions();
  const toast = useToast();
  const [w, setW] = useState<Workout | null>(initial);
  useEffect(() => { setW(initial ? JSON.parse(JSON.stringify(initial)) : null); }, [initial, open]);
  if (!w) return null;
  const set = (p: Partial<Workout>) => setW({ ...w, ...p });
  const setType = (type: WorkoutType) => set({ type, subtype: type === 'strength' ? 'lower1' : type === 'pilates' ? 'Mat' : 'StairMaster' });
  const exercises = w.exercises ?? [];
  const setEx = (i: number, p: Partial<Exercise>) => set({ exercises: exercises.map((e, j) => (j === i ? { ...e, ...p } : e)) });

  // Duplicate guard: the same strength session completed twice in one week.
  const sameWeek = weekDays(w.date).flatMap((d) => getDay(state, d).workouts).filter((x) => x.id !== w.id && x.type === 'strength' && x.subtype === w.subtype && x.status === 'done');
  const dupWarn = w.type === 'strength' && w.status === 'done' && sameWeek.length > 0;

  const submit = () => {
    const clean: Workout = { ...w, exercises: w.type === 'strength' ? exercises.filter((e) => e.name.trim()) : undefined };
    if (w.type !== 'cardio') { delete clean.distance; delete clean.intensity; }
    save(clean, initial?.date);
    toast.push({ title: initial && getDay(state, initial.date).workouts.some((x) => x.id === w.id) ? 'Workout updated' : w.status === 'done' ? 'Workout logged — well done' : 'Workout scheduled' });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={title ?? 'Workout'}>
      <div className="space-y-4">
        <Segmented value={w.type} onChange={setType} options={(['strength', 'pilates', 'cardio'] as WorkoutType[]).map((t) => ({ value: t, label: WORKOUT_LABEL[t] }))} />
        <div>
          <span className="label">{w.type === 'strength' ? 'Session' : w.type === 'pilates' ? 'Session type' : 'Activity'}</span>
          <div className="flex flex-wrap gap-2">
            {(w.type === 'strength' ? STRENGTH_SESSIONS.map((s) => ({ v: s.id, l: s.label })) : (w.type === 'pilates' ? PILATES_TYPES : CARDIO_TYPES).map((s) => ({ v: s, l: s }))).map((o) => (
              <button key={o.v} type="button" onClick={() => set({ subtype: o.v })}
                className={`chip border px-3 py-1.5 text-sm ${w.subtype === o.v ? 'border-transparent text-white' : 'border-taupe-200 dark:border-night-500'}`}
                style={w.subtype === o.v ? { background: TYPE_COLOR[w.type] } : undefined}>{o.l}</button>
            ))}
          </div>
          {dupWarn && <p className="mt-2 text-xs text-blush-600 dark:text-blush-300">You already completed {subtypeLabel('strength', w.subtype)} this week — saving will log a second one.</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="label">Date</span><input className="input" type="date" value={w.date} onChange={(e) => e.target.value && set({ date: e.target.value })} /></label>
          <label className="block"><span className="label">Time (optional)</span><input className="input" type="time" value={w.time ?? ''} onChange={(e) => set({ time: e.target.value || undefined })} /></label>
        </div>
        <div>
          <span className="label">Status</span>
          <Segmented value={w.status} onChange={(status) => set({ status })} options={[{ value: 'planned', label: 'Planned' }, { value: 'done', label: 'Completed' }, { value: 'skipped', label: 'Skipped' }]} size="sm" />
          {w.status === 'done' && w.date > today && <p className="mt-1.5 text-xs text-blush-600">This date is in the future — did you mean “Planned”?</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Duration (optional)" value={w.duration} onChange={(v) => set({ duration: v })} suffix="min" />
          {w.type === 'cardio' && <NumberField label="Distance (optional)" value={w.distance} step={0.1} onChange={(v) => set({ distance: v })} suffix="km" />}
        </div>
        {w.type === 'cardio' && (
          <div><span className="label">Intensity (optional)</span>
            <Segmented value={(w.intensity ?? '') as any} onChange={(v: any) => set({ intensity: v || undefined })} size="sm"
              options={[{ value: '' as any, label: '—' }, { value: 'low', label: 'Low' }, { value: 'moderate', label: 'Moderate' }, { value: 'high', label: 'High' }]} />
          </div>
        )}
        {w.type === 'strength' && (
          <div>
            <span className="label">Exercises (optional)</span>
            <div className="space-y-2">
              {exercises.map((e, i) => (
                <div key={e.id} className="rounded-2xl bg-cream/70 dark:bg-night-700 p-2.5">
                  <div className="flex gap-2">
                    <input className="input py-2" placeholder="Exercise, e.g. Hip thrust" value={e.name} onChange={(ev) => setEx(i, { name: ev.target.value })} />
                    <button className="icon-btn shrink-0" onClick={() => set({ exercises: exercises.filter((_, j) => j !== i) })} aria-label="Remove exercise"><Icon name="trash" className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <NumberField label="Sets" value={e.sets} onChange={(v) => setEx(i, { sets: v })} />
                    <NumberField label="Reps" value={e.reps} onChange={(v) => setEx(i, { reps: v })} />
                    <NumberField label="Weight" value={e.weight} step={0.5} onChange={(v) => setEx(i, { weight: v })} suffix="kg" />
                  </div>
                </div>
              ))}
              <button className="btn-ghost btn-sm" onClick={() => set({ exercises: [...exercises, { id: uid(), name: '' }] })}><Icon name="plus" className="h-4 w-4" />Add exercise</button>
            </div>
          </div>
        )}
        <label className="block"><span className="label">Notes (optional)</span><textarea className="input min-h-[70px]" value={w.notes ?? ''} onChange={(e) => set({ notes: e.target.value || undefined })} placeholder="How did it feel?" /></label>
        <button className="btn-primary w-full" onClick={submit}>Save</button>
      </div>
    </Sheet>
  );
}

const STATE_CHIP: Record<string, string> = {
  completed: 'bg-sage-100 text-sage-700 dark:bg-sage-700/30 dark:text-sage-200',
  upcoming: 'bg-cream text-taupe-600 dark:bg-night-600 dark:text-taupe-200',
  missed: 'bg-blush-100 text-blush-700 dark:bg-blush-700/30 dark:text-blush-200',
  skipped: 'bg-taupe-100 text-taupe-500 dark:bg-night-600 dark:text-taupe-300',
};
export const stateLabel: Record<string, string> = { completed: 'Completed', upcoming: 'Upcoming', missed: 'Missed', skipped: 'Skipped' };

export function WorkoutRow({ w, onEdit, compact, showDate }: { w: Workout; onEdit: (w: Workout) => void; compact?: boolean; showDate?: boolean }) {
  const { today } = useStore();
  const { setStatus, remove } = useWorkoutActions();
  const [del, setDel] = useState(false);
  const st = workoutState(w, today);
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-cream/60 dark:bg-night-700 p-3">
      <button onClick={() => setStatus(w, w.status === 'done' ? 'planned' : 'done')} aria-label={w.status === 'done' ? 'Mark as not done' : 'Mark as done'}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition ${w.status === 'done' ? 'border-transparent text-white animate-pop' : 'border-taupe-200 dark:border-night-500 text-transparent'}`}
        style={w.status === 'done' ? { background: TYPE_COLOR[w.type] } : undefined}><Icon name="check" className="h-4 w-4" strokeWidth={2.4} /></button>
      <button className="min-w-0 flex-1 text-left" onClick={() => onEdit(w)}>
        <p className="truncate text-sm font-medium"><span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: TYPE_COLOR[w.type] }} />{WORKOUT_LABEL[w.type]} · {subtypeLabel(w.type, w.subtype)}</p>
        <p className="muted truncate text-xs">
          {showDate && <>{relDay(w.date, today)} · </>}
          {w.time && <>{fmtTime(w.time)} · </>}
          {w.duration ? `${w.duration} min` : ''}{w.distance ? ` · ${w.distance} km` : ''}{w.intensity ? ` · ${w.intensity}` : ''}
          {w.exercises?.length ? ` · ${w.exercises.length} exercises` : ''}
          {w.rescheduledFrom && <> · moved from {relDay(w.rescheduledFrom, today)}</>}
        </p>
      </button>
      <span className={`chip shrink-0 ${STATE_CHIP[st]}`}>{stateLabel[st]}</span>
      {!compact && <button className="icon-btn shrink-0" onClick={() => setDel(true)} aria-label="Delete workout"><Icon name="trash" className="h-4 w-4" /></button>}
      <Confirm open={del} onClose={() => setDel(false)} title="Delete workout?" body="This removes the session from your history." onConfirm={() => remove(w)} />
    </div>
  );
}

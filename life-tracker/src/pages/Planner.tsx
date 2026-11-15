import { useState } from 'react';
import { useStore } from '../lib/store';
import { getDay, habitsForDay, weekFitness, workoutState } from '../lib/calc';
import { addDays, fmtTime, relDay, shortDate, shortDay, weekDays, weekStart } from '../lib/date';
import { uid, WORKOUT_LABEL, subtypeLabel } from '../lib/defaults';
import type { PlanItem, PlanKind, Workout, WorkoutType } from '../lib/types';
import { Confirm, Icon, Segmented, Sheet, SectionTitle, useToast } from '../components/ui';
import { newWorkout, stateLabel, TYPE_COLOR, useWorkoutActions, WorkoutForm } from '../components/workouts';
import { WeekNav } from './Fitness';

const KIND_LABEL: Record<PlanKind, string> = { reading: 'Reading', habit: 'Habit', selfcare: 'Self-care', other: 'Personal' };
const KIND_DOT: Record<PlanKind, string> = { reading: 'bg-blush-400', habit: 'bg-sage-500', selfcare: 'bg-blush-300', other: 'bg-taupe-400' };
const CHIP: Record<string, string> = {
  completed: 'bg-sage-100 text-sage-700 dark:bg-sage-700/30 dark:text-sage-200',
  upcoming: 'bg-cream text-taupe-600 dark:bg-night-600 dark:text-taupe-200',
  missed: 'bg-blush-100 text-blush-700 dark:bg-blush-700/30 dark:text-blush-200',
  skipped: 'bg-taupe-100 text-taupe-500 dark:bg-night-600 dark:text-taupe-300',
};

export default function Planner() {
  const { state, today, updateDay, updateDays } = useStore();
  const toast = useToast();
  const [ws, setWs] = useState(weekStart(today));
  const [editing, setEditing] = useState<Workout | null>(null);
  const [planFor, setPlanFor] = useState<{ date: string; item?: PlanItem } | null>(null);
  const [moving, setMoving] = useState<{ kind: 'workout'; w: Workout } | { kind: 'plan'; date: string; p: PlanItem } | null>(null);
  const [addChoice, setAddChoice] = useState<string | null>(null);
  const [del, setDel] = useState<{ date: string; p: PlanItem } | null>(null);
  const { move, setStatus } = useWorkoutActions();
  const days = weekDays(ws);
  const wf = weekFitness(state, ws);
  const T = state.settings.targets;

  const planState = (date: string, p: PlanItem) => {
    const done = p.status === 'done' || (p.kind === 'reading' && getDay(state, date).reading.completed);
    return done ? 'completed' : p.status === 'skipped' ? 'skipped' : date < today ? 'missed' : 'upcoming';
  };
  const setPlan = (date: string, p: PlanItem) => updateDay(date, (d) => ({ ...d, plan: d.plan.some((x) => x.id === p.id) ? d.plan.map((x) => (x.id === p.id ? p : x)) : [...d.plan, p] }));
  const movePlan = (from: string, p: PlanItem, to: string) => {
    if (from === to) return;
    updateDays((all) => {
      const next = { ...all };
      const f = next[from];
      if (f) next[from] = { ...f, plan: f.plan.filter((x) => x.id !== p.id) };
      const t = next[to] ?? { date: to, habits: {}, meals: [], reading: { accMs: 0, runningSince: null, completed: false }, workouts: [], plan: [] };
      next[to] = { ...t, plan: [...t.plan.filter((x) => x.id !== p.id), { ...p, rescheduledFrom: p.rescheduledFrom ?? from }] };
      return next;
    });
  };

  const counts = { completed: 0, upcoming: 0, missed: 0, rescheduled: 0 };
  days.forEach((d) => {
    const day = getDay(state, d);
    day.workouts.forEach((w) => { const s = workoutState(w, today); if (s in counts) (counts as any)[s]++; if (w.rescheduledFrom) counts.rescheduled++; });
    day.plan.forEach((p) => { const s = planState(d, p); if (s in counts) (counts as any)[s]++; if (p.rescheduledFrom) counts.rescheduled++; });
  });

  return (
    <div className="space-y-4">
      <header className="px-1"><p className="text-xs font-medium uppercase tracking-[0.2em] text-blush-500">Weekly planner</p><h1 className="h-title">Plan your week, your way</h1></header>
      <WeekNav ws={ws} today={today} onChange={setWs} />

      <section className="card">
        <SectionTitle>Nine targeted sessions</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {(['strength', 'pilates', 'cardio'] as WorkoutType[]).map((t) => (
            <div key={t} className="rounded-2xl bg-cream/70 p-3 dark:bg-night-700">
              <p className="flex items-center gap-1.5 text-xs font-medium"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLOR[t] }} />{WORKOUT_LABEL[t]}</p>
              <p className="mt-1 font-display text-2xl font-semibold">{wf.done[t]}<span className="muted text-base">/{T[t]}</span></p>
              <p className="muted text-[11px]">{wf.planned[t]} planned{wf.done[t] + wf.planned[t] < T[t] ? ` · ${T[t] - wf.done[t] - wf.planned[t]} to schedule` : ''}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          <span className={`chip ${CHIP.completed}`}>{counts.completed} completed</span>
          <span className={`chip ${CHIP.upcoming}`}>{counts.upcoming} upcoming</span>
          <span className={`chip ${CHIP.missed}`}>{counts.missed} missed</span>
          <span className="chip bg-blush-50 text-blush-600 dark:bg-night-600 dark:text-blush-200">{counts.rescheduled} rescheduled</span>
        </div>
        <p className="muted mt-2 text-[11px]">You don’t need nine separate days. Stack Pilates and cardio, or strength and a walk, on the same day.</p>
      </section>

      {days.map((d) => {
        const day = getDay(state, d);
        const habits = habitsForDay(state.settings, d).filter((h) => h.time && h.category !== 'frequency');
        return (
          <section key={d} className={`card ${d === today ? 'ring-1 ring-blush-300 dark:ring-blush-700' : ''}`}>
            <div className="mb-2 flex items-center justify-between">
              <div><p className="font-display text-lg font-semibold">{shortDay(d)} <span className="muted font-sans text-sm font-normal">{shortDate(d)}</span>{d === today && <span className="chip ml-2 bg-blush-100 text-blush-600 dark:bg-blush-700/30 dark:text-blush-200">Today</span>}</p></div>
              <button className="btn-ghost btn-sm" onClick={() => setAddChoice(d)}><Icon name="plus" className="h-4 w-4" />Add</button>
            </div>
            <div className="space-y-1.5">
              {day.workouts.map((w) => {
                const s = workoutState(w, today);
                return (
                  <div key={w.id} className="flex items-center gap-2 rounded-2xl bg-cream/60 p-2.5 dark:bg-night-700">
                    <button onClick={() => setStatus(w, w.status === 'done' ? 'planned' : 'done')} aria-label="Toggle done" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2" style={w.status === 'done' ? { background: TYPE_COLOR[w.type], borderColor: TYPE_COLOR[w.type], color: 'white' } : { borderColor: TYPE_COLOR[w.type], color: 'transparent' }}><Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.6} /></button>
                    <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(w)}>
                      <p className="truncate text-sm font-medium">{WORKOUT_LABEL[w.type]} · {subtypeLabel(w.type, w.subtype)}</p>
                      <p className="muted truncate text-[11px]">{w.time ? fmtTime(w.time) + ' · ' : ''}{w.duration ? `${w.duration} min · ` : ''}{w.rescheduledFrom ? `moved from ${relDay(w.rescheduledFrom, today)}` : ''}</p>
                    </button>
                    <span className={`chip shrink-0 ${CHIP[s]}`}>{stateLabel[s]}</span>
                    <button className="icon-btn h-8 w-8 shrink-0" onClick={() => setMoving({ kind: 'workout', w })} aria-label="Move to another day"><Icon name="move" className="h-4 w-4" /></button>
                  </div>
                );
              })}
              {day.plan.map((p) => {
                const s = planState(d, p);
                return (
                  <div key={p.id} className="flex items-center gap-2 rounded-2xl bg-cream/60 p-2.5 dark:bg-night-700">
                    <button onClick={() => setPlan(d, { ...p, status: s === 'completed' ? 'planned' : 'done' })} aria-label="Toggle done" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${s === 'completed' ? 'border-sage-500 bg-sage-500 text-white' : 'border-taupe-300 text-transparent dark:border-night-500'}`}><Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.6} /></button>
                    <button className="min-w-0 flex-1 text-left" onClick={() => setPlanFor({ date: d, item: p })}>
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium"><span className={`h-2 w-2 shrink-0 rounded-full ${KIND_DOT[p.kind]}`} />{p.title}</p>
                      <p className="muted truncate text-[11px]">{KIND_LABEL[p.kind]}{p.time ? ` · ${fmtTime(p.time)}` : ''}{p.rescheduledFrom ? ` · moved from ${relDay(p.rescheduledFrom, today)}` : ''}</p>
                    </button>
                    <span className={`chip shrink-0 ${CHIP[s]}`}>{stateLabel[s]}</span>
                    <button className="icon-btn h-8 w-8 shrink-0" onClick={() => setMoving({ kind: 'plan', date: d, p })} aria-label="Move to another day"><Icon name="move" className="h-4 w-4" /></button>
                  </div>
                );
              })}
              {habits.length > 0 && (
                <p className="muted px-1 pt-1 text-[11px]">Routine: {habits.map((h) => `${fmtTime(h.time)} ${h.name.split(',')[0]}`).join(' · ')}</p>
              )}
              {!day.workouts.length && !day.plan.length && !habits.length && <p className="muted text-sm">Free day.</p>}
            </div>
          </section>
        );
      })}

      {/* Add chooser */}
      <Sheet open={!!addChoice} onClose={() => setAddChoice(null)} title={addChoice ? `Add to ${relDay(addChoice, today)}` : ''}>
        <div className="grid grid-cols-2 gap-2">
          {(['strength', 'pilates', 'cardio'] as WorkoutType[]).map((t) => (
            <button key={t} className="rounded-2xl border border-taupe-100 p-4 text-left transition hover:bg-cream dark:border-night-600 dark:hover:bg-night-700"
              onClick={() => { const d = addChoice!; setAddChoice(null); setEditing(newWorkout(d, t, 'planned')); }}>
              <span className="mb-2 block h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR[t] }} /><span className="text-sm font-medium">{WORKOUT_LABEL[t]}</span>
            </button>
          ))}
          {(['reading', 'selfcare', 'habit', 'other'] as PlanKind[]).map((k) => (
            <button key={k} className="rounded-2xl border border-taupe-100 p-4 text-left transition hover:bg-cream dark:border-night-600 dark:hover:bg-night-700"
              onClick={() => { const d = addChoice!; setAddChoice(null); setPlanFor({ date: d, item: { id: uid(), kind: k, title: k === 'reading' ? `Read ${state.settings.readingGoal} minutes` : '', status: 'planned', createdAt: Date.now() } }); }}>
              <span className={`mb-2 block h-2.5 w-2.5 rounded-full ${KIND_DOT[k]}`} /><span className="text-sm font-medium">{KIND_LABEL[k]}</span>
            </button>
          ))}
        </div>
      </Sheet>

      {/* Plan item editor */}
      <PlanEditor value={planFor} onClose={() => setPlanFor(null)} onSave={(date, p) => { setPlan(date, p); toast.push({ title: 'Saved to your planner' }); }} onDelete={(date, p) => setDel({ date, p })} isExisting={(date, id) => getDay(state, date).plan.some((x) => x.id === id)} />

      {/* Move sheet */}
      <Sheet open={!!moving} onClose={() => setMoving(null)} title="Move to…">
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 14 }, (_, i) => addDays(ws, i)).map((d) => {
            const from = moving ? (moving.kind === 'workout' ? moving.w.date : moving.date) : '';
            return (
              <button key={d} disabled={d === from} className={`rounded-2xl border p-3 text-left text-sm transition disabled:opacity-40 ${d === today ? 'border-blush-300' : 'border-taupe-100 dark:border-night-600'} hover:bg-cream dark:hover:bg-night-700`}
                onClick={() => {
                  if (!moving) return;
                  if (moving.kind === 'workout') move(moving.w, d); else movePlan(moving.date, moving.p, d);
                  toast.push({ title: `Moved to ${relDay(d, today)}` });
                  setMoving(null);
                }}>
                <span className="font-medium">{shortDay(d)}</span> <span className="muted">{shortDate(d)}</span>
              </button>
            );
          })}
        </div>
      </Sheet>

      <WorkoutForm open={!!editing} initial={editing} onClose={() => setEditing(null)} title="Plan a workout" />
      <Confirm open={!!del} onClose={() => setDel(null)} title="Remove from planner?" body="This item will be deleted." onConfirm={() => { if (del) updateDay(del.date, (d) => ({ ...d, plan: d.plan.filter((x) => x.id !== del.p.id) })); setPlanFor(null); }} />
    </div>
  );
}

function PlanEditor({ value, onClose, onSave, onDelete, isExisting }: { value: { date: string; item?: PlanItem } | null; onClose: () => void; onSave: (date: string, p: PlanItem) => void; onDelete: (date: string, p: PlanItem) => void; isExisting: (date: string, id: string) => boolean }) {
  const [p, setP] = useState<PlanItem | null>(null);
  const [date, setDate] = useState('');
  const key = value ? value.date + (value.item?.id ?? '') : '';
  const [lastKey, setLastKey] = useState('');
  if (key !== lastKey) { setLastKey(key); setP(value?.item ? { ...value.item } : null); setDate(value?.date ?? ''); }
  if (!value || !p) return null;
  const existing = isExisting(value.date, p.id);
  return (
    <Sheet open onClose={onClose} title={existing ? 'Edit plan' : `New ${KIND_LABEL[p.kind].toLowerCase()} item`}>
      <div className="space-y-4">
        <Segmented value={p.kind} onChange={(kind) => setP({ ...p, kind })} size="sm" options={(['reading', 'selfcare', 'habit', 'other'] as PlanKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
        <label className="block"><span className="label">Title</span><input className="input" value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} placeholder="e.g. Face mask & stretch" autoFocus /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="label">Time (optional)</span><input className="input" type="time" value={p.time ?? ''} onChange={(e) => setP({ ...p, time: e.target.value || undefined })} /></label>
          <label className="block"><span className="label">Status</span>
            <select className="input" value={p.status} onChange={(e) => setP({ ...p, status: e.target.value as PlanItem['status'] })}><option value="planned">Planned</option><option value="done">Completed</option><option value="skipped">Skipped</option></select>
          </label>
        </div>
        {p.kind === 'reading' && <p className="muted text-xs">A planned reading session completes automatically when you finish that day’s reading.</p>}
        <div className="flex gap-2">
          {existing && <button className="btn-ghost" onClick={() => onDelete(date, p)}><Icon name="trash" className="h-4 w-4" />Delete</button>}
          <button className="btn-primary flex-1" disabled={!p.title.trim()} onClick={() => { onSave(date, { ...p, title: p.title.trim() }); onClose(); }}>Save</button>
        </div>
      </div>
    </Sheet>
  );
}

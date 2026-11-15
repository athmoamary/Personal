import { useState } from 'react';
import { useStore } from '../lib/store';
import { getDay, personalRecords, weekFitness, workoutState } from '../lib/calc';
import { addDays, DAY_LETTERS, dow, relDay, shortDate, weekDays, weekStart } from '../lib/date';
import { WORKOUT_LABEL, subtypeLabel, STRENGTH_SESSIONS } from '../lib/defaults';
import type { Workout, WorkoutType } from '../lib/types';
import { Bar, Icon, Ring, SectionTitle } from '../components/ui';
import { newWorkout, TYPE_BG, TYPE_COLOR, WorkoutForm, WorkoutRow } from '../components/workouts';

export function WeekNav({ ws, today, onChange }: { ws: string; today: string; onChange: (d: string) => void }) {
  const cur = weekStart(today);
  return (
    <div className="flex items-center justify-between rounded-full bg-cream dark:bg-night-700 p-1">
      <button className="icon-btn" onClick={() => onChange(addDays(ws, -7))} aria-label="Previous week"><Icon name="left" /></button>
      <button className="text-sm font-medium" onClick={() => onChange(cur)}>
        {ws === cur ? 'This week' : ws === addDays(cur, -7) ? 'Last week' : ws === addDays(cur, 7) ? 'Next week' : `Week of ${shortDate(ws)}`}
        <span className="muted ml-2 text-xs">{shortDate(ws)} – {shortDate(addDays(ws, 6))}</span>
      </button>
      <button className="icon-btn" onClick={() => onChange(addDays(ws, 7))} aria-label="Next week"><Icon name="right" /></button>
    </div>
  );
}

export default function Fitness({ go }: { go: (r: string) => void }) {
  const { state, today } = useStore();
  const [ws, setWs] = useState(weekStart(today));
  const [sel, setSel] = useState<string>(today);
  const [editing, setEditing] = useState<Workout | null>(null);
  const days = weekDays(ws);
  const wf = weekFitness(state, ws);
  const T = state.settings.targets;
  const selDay = days.includes(sel) ? sel : days[0];
  const weekWorkouts = days.flatMap((d) => getDay(state, d).workouts);
  const strengthDone = new Set(weekWorkouts.filter((w) => w.type === 'strength' && w.status === 'done').map((w) => w.subtype));
  const prs = personalRecords(state);
  const history = Array.from({ length: 8 }, (_, i) => addDays(weekStart(today), -7 * (7 - i)));

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between px-1">
        <div><p className="text-xs font-medium uppercase tracking-[0.2em] text-blush-500">Fitness</p><h1 className="h-title">Move with intention</h1></div>
        <button className="btn-ghost btn-sm" onClick={() => go('planner')}><Icon name="calendar" className="h-4 w-4" />Planner</button>
      </header>
      <WeekNav ws={ws} today={today} onChange={(d) => { setWs(d); setSel(d <= today && today <= addDays(d, 6) ? today : d); }} />

      <section className="card">
        <div className="flex items-center gap-5">
          <Ring value={wf.pct} size={110} stroke={10} color="#6C8F64" label={`Weekly progress ${Math.round(wf.pct * 100)}%`}>
            <span className="font-display text-2xl font-semibold">{wf.totalDone}/{wf.totalTarget}</span><span className="muted text-[11px]">sessions</span>
          </Ring>
          <div className="flex-1 space-y-3">
            {(['strength', 'pilates', 'cardio'] as WorkoutType[]).map((t) => (
              <div key={t}>
                <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{WORKOUT_LABEL[t]}</span><span className="tabular-nums font-medium">{wf.done[t]}/{T[t]}</span></div>
                <Bar value={wf.done[t] / T[t]} color={TYPE_BG[t]} />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {STRENGTH_SESSIONS.map((s) => (
            <span key={s.id} className={`chip ${strengthDone.has(s.id) ? 'bg-strength text-white' : 'bg-cream text-taupe-500 dark:bg-night-700 dark:text-taupe-300'}`}>{strengthDone.has(s.id) && <Icon name="check" className="h-3 w-3" strokeWidth={2.6} />}{s.label}</span>
          ))}
        </div>
        <p className="muted mt-3 text-[11px]">Targets reset every Sunday (Riyadh time). Past weeks stay in your history. Several workout types can share one day.</p>
      </section>

      <section className="card">
        <SectionTitle action={<button className="btn-primary btn-sm" onClick={() => setEditing(newWorkout(selDay, 'strength', selDay > today ? 'planned' : 'done'))}><Icon name="plus" className="h-4 w-4" />Add</button>}>Weekly calendar</SectionTitle>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const ws_ = getDay(state, d).workouts;
            const active = d === selDay;
            return (
              <button key={d} onClick={() => setSel(d)} className={`flex flex-col items-center rounded-2xl px-0.5 py-2 transition ${active ? 'bg-blush-100 dark:bg-blush-700/30' : 'hover:bg-cream dark:hover:bg-night-700'} ${d === today ? 'ring-1 ring-blush-300' : ''}`}>
                <span className="muted text-[10px] font-medium">{DAY_LETTERS[dow(d)]}</span>
                <span className="text-sm font-semibold">{Number(d.slice(8))}</span>
                <span className="mt-1 flex min-h-[10px] flex-wrap justify-center gap-0.5">
                  {ws_.map((w) => {
                    const s = workoutState(w, today);
                    return <span key={w.id} title={`${WORKOUT_LABEL[w.type]} · ${s}`} className="h-2 w-2 rounded-full" style={s === 'completed' ? { background: TYPE_COLOR[w.type] } : { border: `1.5px solid ${TYPE_COLOR[w.type]}`, opacity: s === 'missed' || s === 'skipped' ? 0.45 : 1 }} />;
                  })}
                </span>
              </button>
            );
          })}
        </div>
        <div className="muted mt-2 flex flex-wrap gap-3 text-[11px]">
          {(['strength', 'pilates', 'cardio'] as WorkoutType[]).map((t) => <span key={t} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLOR[t] }} />{WORKOUT_LABEL[t]}</span>)}
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full border-[1.5px] border-taupe-400" />planned</span>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium">{relDay(selDay, today)}</p>
          {getDay(state, selDay).workouts.length ? (
            <div className="space-y-2">{getDay(state, selDay).workouts.map((w) => <WorkoutRow key={w.id} w={w} onEdit={setEditing} />)}</div>
          ) : <p className="muted text-sm">No workouts on this day.</p>}
        </div>
      </section>

      <section className="card">
        <SectionTitle>Last 8 weeks</SectionTitle>
        <div className="space-y-2">
          {history.map((w) => {
            const f = weekFitness(state, w);
            return (
              <div key={w} className="flex items-center gap-3 text-xs">
                <span className="muted w-14 shrink-0">{shortDate(w)}</span>
                <div className="flex flex-1 gap-0.5">
                  {(['strength', 'pilates', 'cardio'] as WorkoutType[]).flatMap((t) => Array.from({ length: T[t] }, (_, i) => (
                    <span key={t + i} className="h-3 flex-1 rounded-[3px]" style={{ background: i < f.done[t] ? TYPE_COLOR[t] : undefined }} title={`${WORKOUT_LABEL[t]} ${f.done[t]}/${T[t]}`}>
                      {i >= f.done[t] && <span className="block h-full w-full rounded-[3px] bg-taupe-100 dark:bg-night-600" />}
                    </span>
                  )))}
                </div>
                <span className="w-10 shrink-0 text-right font-medium tabular-nums">{f.totalDone}/{f.totalTarget}</span>
              </div>
            );
          })}
        </div>
        <p className="muted mt-2 text-[11px]">Each block is one targeted session: strength (rose), Pilates (periwinkle), cardio (ochre).</p>
      </section>

      <section className="card">
        <SectionTitle>Personal records</SectionTitle>
        {prs.length ? (
          <div className="divide-y divide-taupe-100 dark:divide-night-600">
            {prs.map((p) => (
              <div key={p.name} className="flex items-center gap-3 py-2.5">
                <span className="text-cardio"><Icon name="trophy" className="h-5 w-5" /></span>
                <div className="flex-1"><p className="text-sm font-medium">{p.name}</p><p className="muted text-xs">{shortDate(p.date)}</p></div>
                <p className="font-display text-lg font-semibold">{p.weight} kg{p.reps ? <span className="muted font-sans text-xs"> × {p.reps}</span> : null}</p>
              </div>
            ))}
          </div>
        ) : <p className="muted text-sm">Log exercises with weights on a completed strength session. Your best lift for each exercise will appear here.</p>}
      </section>

      <section className="card">
        <SectionTitle>Recent sessions</SectionTitle>
        {(() => {
          const recent = Object.values(state.days).flatMap((d) => d.workouts).filter((w) => w.status === 'done').sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 8);
          return recent.length ? <div className="space-y-2">{recent.map((w) => <WorkoutRow key={w.id} w={w} onEdit={setEditing} showDate />)}</div> : <p className="muted text-sm">Completed sessions will show here.</p>;
        })()}
      </section>

      <WorkoutForm open={!!editing} initial={editing} onClose={() => setEditing(null)} title={editing && subtypeLabel(editing.type, editing.subtype) ? 'Workout' : 'Workout'} />
    </div>
  );
}

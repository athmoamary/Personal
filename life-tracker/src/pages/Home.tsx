import { useState } from 'react';
import { useStore } from '../lib/store';
import { consistencyTest, dayScore, getDay, habitsForDay, streak, weekFitness } from '../lib/calc';
import { longDate, nowMinutes, weekdayName } from '../lib/date';
import { WORKOUT_LABEL } from '../lib/defaults';
import type { Workout, WorkoutType } from '../lib/types';
import { Bar, Icon, Ring, SectionTitle } from '../components/ui';
import { HabitRow } from '../components/habits';
import { ReadingTimer } from '../components/reading';
import { ProteinFiber } from '../components/nutrition';
import { newWorkout, TYPE_BG, WorkoutForm, WorkoutRow } from '../components/workouts';
import { fmDay, fmStreak, latestMood } from '../lib/fmcalc';
import { MOODS, RITUALS } from '../lib/frequency';
import { fmtTime } from '../lib/date';
import { HabitRow as FmRow } from '../components/habits';
import { fmHabits } from '../lib/fmcalc';
import { nextRitual } from './Frequency';

export default function Home({ go }: { go: (r: string) => void }) {
  const { state, today, now, viewerName } = useStore();
  const [editing, setEditing] = useState<Workout | null>(null);
  const name = state.settings.name || viewerName;
  const m = nowMinutes(now);
  const greet = m < 300 ? 'Good night' : m < 720 ? 'Good morning' : m < 1020 ? 'Good afternoon' : 'Good evening';
  const sc = dayScore(state, today);
  const wf = weekFitness(state, today);
  const st = streak(state, today, consistencyTest(state));
  const habits = habitsForDay(state.settings, today).filter((h) => h.category !== 'frequency');
  const workouts = getDay(state, today).workouts;
  const pctNum = sc.pct === null ? 0 : Math.round(sc.pct * 100);
  const message = pctNum >= 100 ? 'Everything done today. Beautiful work.' : pctNum >= 60 ? 'You’re well on your way today.' : pctNum > 0 ? 'A gentle start — one small step at a time.' : 'A fresh page. Begin wherever feels right.';

  return (
    <div className="space-y-4">
      <header className="px-1 pt-1 animate-rise">
        <p className="font-display text-sm italic text-lavender-600 dark:text-lavender-300">Evolve a little, every day.</p>
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-blush-500">{weekdayName(today)} · {longDate(today)}</p>
        <h1 className="mt-1 font-display text-[2.1rem] font-semibold leading-tight">{greet}{name ? `, ${name}` : ''}</h1>
        <p className="muted text-sm">{message}</p>
      </header>

      <section className="card">
        <div className="flex items-center gap-5">
          <Ring value={sc.pct ?? 0} size={124} stroke={11} color={pctNum >= state.settings.consistencyThreshold ? '#6C8F64' : '#C06C82'} label={`Daily completion ${pctNum}%`}>
            <span className="font-display text-3xl font-semibold">{pctNum}%</span>
            <span className="muted text-[11px]">today</span>
          </Ring>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blush-100 text-blush-600 dark:bg-blush-700/30 dark:text-blush-200"><Icon name="flame" className="h-5 w-5" /></span>
              <div><p className="font-display text-xl font-semibold leading-none">{st} {st === 1 ? 'day' : 'days'}</p><p className="muted text-xs">consistency streak</p></div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs"><span className="muted">Daily items</span><span className="font-medium">{sc.done}/{sc.counted}</span></div>
              <Bar value={sc.pct ?? 0} color="bg-blush-400" className="h-2" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs"><span className="muted">Weekly workouts</span><span className="font-medium">{wf.totalDone}/{wf.totalTarget}</span></div>
              <Bar value={wf.pct} color="bg-sage-500" className="h-2" />
            </div>
          </div>
        </div>
        <p className="muted mt-3 text-[11px] leading-relaxed">Daily % counts your habits, Frequency Maxxing activities, protein, fiber and reading. “Skip” and “Not needed” are left out so they never lower your score. Workouts count toward the weekly goal instead. A streak day means you reached {state.settings.consistencyThreshold}%.</p>
      </section>

      <section className="card">
        <SectionTitle action={<button className="btn-ghost btn-sm" onClick={() => go('habits')}>Manage</button>}>Wellness & self-care</SectionTitle>
        {habits.length ? <div className="space-y-2">{habits.map((h) => <HabitRow key={h.id} habit={h} date={today} />)}</div> : <p className="muted text-sm">No habits scheduled today.</p>}
      </section>

      <FrequencyCard go={go} />

      <section className="card">
        <SectionTitle action={<button className="btn-ghost btn-sm" onClick={() => setEditing(newWorkout(today))}><Icon name="plus" className="h-4 w-4" />Log</button>}>Today’s workout</SectionTitle>
        {workouts.length ? (
          <div className="space-y-2">{workouts.map((w) => <WorkoutRow key={w.id} w={w} onEdit={setEditing} compact />)}</div>
        ) : (
          <p className="muted text-sm">Nothing scheduled today. <button className="text-blush-500 underline-offset-2 hover:underline" onClick={() => go('planner')}>Open the weekly planner</button> or log a session.</p>
        )}
      </section>

      <section className="card">
        <SectionTitle action={<button className="btn-ghost btn-sm" onClick={() => go('nutrition')}><Icon name="plus" className="h-4 w-4" />Add meal</button>}>Protein & fiber</SectionTitle>
        <ProteinFiber date={today} />
      </section>

      <section className="card">
        <SectionTitle action={<button className="btn-ghost btn-sm" onClick={() => go('habits')}>Details</button>}>Reading · {state.settings.readingGoal} min</SectionTitle>
        <ReadingTimer date={today} compact />
      </section>

      <section className="card">
        <SectionTitle action={<button className="btn-ghost btn-sm" onClick={() => go('fitness')}>Fitness</button>}>This week’s fitness</SectionTitle>
        <div className="space-y-3">
          {(['strength', 'pilates', 'cardio'] as WorkoutType[]).map((t) => (
            <div key={t}>
              <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{WORKOUT_LABEL[t]}</span><span className="tabular-nums">{wf.done[t]}/{state.settings.targets[t]}{wf.planned[t] ? <span className="muted text-xs"> · {wf.planned[t]} planned</span> : null}</span></div>
              <Bar value={wf.done[t] / state.settings.targets[t]} color={TYPE_BG[t]} />
            </div>
          ))}
        </div>
      </section>

      <WorkoutForm open={!!editing} initial={editing} onClose={() => setEditing(null)} title="Workout" />
    </div>
  );
}

/** Compact Frequency Maxxing overview with a collapsible checklist. */
function FrequencyCard({ go }: { go: (r: string) => void }) {
  const { state, today } = useStore();
  const [open, setOpen] = useState(false);
  const f = fmDay(state, today);
  if (!f.total) return null;
  const streak = fmStreak(state, today, (x) => x.perfect);
  const active = fmStreak(state, today, (x) => x.active);
  const mood = state.days[today] ? latestMood(state.days[today]) : null;
  const next = nextRitual(state, today);
  return (
    <section className="card-lav">
      <div className="flex items-center gap-4">
        <Ring value={f.pct ?? 0} size={78} stroke={7} color="#8F77BA" label={`Frequency Maxxing ${Math.round((f.pct ?? 0) * 100)}%`}>
          <span className="font-display text-lg font-semibold">{Math.round((f.pct ?? 0) * 100)}%</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-semibold">Frequency Maxxing ✨</p>
          <p className="muted text-xs">{f.done}/{f.total} done · {RITUALS.filter((r) => f.byRitual[r.id].total && f.byRitual[r.id].done === f.byRitual[r.id].total).length}/3 rituals · streak {streak}{active > streak ? ` (${active} active)` : ''}{mood ? ` · ${MOODS.find((m) => m.kind === mood.kind)?.label.toLowerCase()}` : ''}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="btn-lav btn-sm flex-1" onClick={() => go('frequency')}>{next ? `${next.title} ritual · ${fmtTime(next.time)}` : 'All done today ✨'}<Icon name="right" className="h-4 w-4" /></button>
        <button className="btn-ghost btn-sm" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Hide' : 'Checklist'}</button>
      </div>
      {open && <div className="mt-3 space-y-2">{fmHabits(state, today).map((h) => <FmRow key={h.id} habit={h} date={today} />)}</div>}
    </section>
  );
}

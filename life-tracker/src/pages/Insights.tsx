import { useState } from 'react';
import { useStore } from '../lib/store';
import { dayScore, getDay, habitRates, longestStreak, nutritionStats, pct, readingMinutes, readingTest, round1, weekFitness, workoutsInRange } from '../lib/calc';
import { addDays, addMonths, DAY_LETTERS, dow, longDate, monthDays, monthName, monthStart, shortDate, weekDays, weekStart } from '../lib/date';
import { WORKOUT_LABEL, subtypeLabel } from '../lib/defaults';
import type { WorkoutType } from '../lib/types';
import { Bar, BarChart, DateNav, Icon, Ring, Segmented, SectionTitle, Stat } from '../components/ui';
import { TYPE_BG, TYPE_COLOR } from '../components/workouts';
import { WeekNav } from './Fitness';
import FrequencyInsights from '../components/FrequencyInsights';

const SEQ_LIGHT = ['#F2F6F0', '#C9DAC2', '#A9C3A0', '#88A97F', '#56764F'];
const SEQ_DARK = ['#2A2E29', '#3B4A38', '#4F6A4A', '#6C8F64', '#A9C3A0'];
const useDark = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

export default function Insights({ initialTab }: { initialTab?: 'frequency' }) {
  const [tab, setTab] = useState<'day' | 'week' | 'month' | 'frequency'>(initialTab ?? 'week');
  return (
    <div className="space-y-4">
      <header className="px-1"><p className="text-xs font-medium uppercase tracking-[0.2em] text-blush-500">Insights</p><h1 className="h-title">Your progress, gently measured</h1></header>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'day', label: 'Daily' }, { value: 'week', label: 'Weekly' }, { value: 'month', label: 'Monthly' }, { value: 'frequency', label: 'Ritual ✨' }]} />
      {tab === 'day' ? <Daily /> : tab === 'week' ? <Weekly /> : tab === 'month' ? <Monthly /> : <FrequencyInsights />}
      <p className="muted px-2 text-center text-[11px] leading-relaxed">How scores work: daily items (habits, Frequency Maxxing activities, protein, fiber, reading) get a daily %. Each activity counts once. “Skip” and “Not needed” are left out of that %. Workouts are weekly targets (3 strength, 2 Pilates, 4 cardio) and count toward a separate weekly fitness %. Extra sessions are welcome but never inflate it.</p>
    </div>
  );
}

function Daily() {
  const { state, today } = useStore();
  const [date, setDate] = useState(today);
  const sc = dayScore(state, date);
  const ws = getDay(state, date).workouts;
  return (
    <>
      <DateNav date={date} today={today} onChange={setDate} />
      <section className="card">
        <div className="flex items-center gap-5">
          <Ring value={sc.pct ?? 0} size={110} stroke={10} color="#6C8F64" label="Daily completion"><span className="font-display text-2xl font-semibold">{pct(sc.pct)}</span><span className="muted text-[11px]">{sc.done}/{sc.counted}</span></Ring>
          <div className="grid flex-1 grid-cols-1 gap-1.5 text-sm">
            <Pill ok={sc.proteinMet} label="Protein goal" />
            <Pill ok={sc.fiberMet} label="Fiber goal" />
            <Pill ok={sc.readingDone} label="Reading" />
            <Pill ok={ws.some((w) => w.status === 'done')} label={ws.length ? `Workouts ${ws.filter((w) => w.status === 'done').length}/${ws.length}` : 'No workout planned'} neutral={!ws.length} />
          </div>
        </div>
      </section>
      <section className="card">
        <SectionTitle>{longDate(date)}</SectionTitle>
        <div className="space-y-1.5">
          {sc.items.map((i) => (
            <div key={i.key} className="flex items-center gap-2.5 text-sm">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${i.state === 'done' ? 'bg-sage-500 text-white' : i.state === 'excluded' ? 'bg-taupe-100 text-taupe-400 dark:bg-night-600' : 'border-2 border-taupe-200 dark:border-night-500'}`}>
                {i.state === 'done' ? <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.6} /> : i.state === 'excluded' ? <span className="text-xs">–</span> : null}
              </span>
              <span className={`flex-1 ${i.state === 'excluded' ? 'text-taupe-400' : ''}`}>{i.label}</span>
              <span className="muted text-xs">{i.state === 'done' ? 'Done' : i.state === 'excluded' ? 'Not counted' : date < today ? 'Missed' : 'Pending'}</span>
            </div>
          ))}
          {ws.map((w) => (
            <div key={w.id} className="flex items-center gap-2.5 text-sm">
              <span className="h-6 w-6 shrink-0 rounded-full" style={w.status === 'done' ? { background: TYPE_COLOR[w.type] } : { border: `2px solid ${TYPE_COLOR[w.type]}` }} />
              <span className="flex-1">{WORKOUT_LABEL[w.type]} · {subtypeLabel(w.type, w.subtype)}</span>
              <span className="muted text-xs">{w.status === 'done' ? 'Completed' : w.status === 'skipped' ? 'Skipped' : date < today ? 'Missed' : 'Planned'}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Pill({ ok, label, neutral }: { ok: boolean; label: string; neutral?: boolean }) {
  return <span className={`chip justify-start ${neutral ? 'bg-cream text-taupe-500 dark:bg-night-700 dark:text-taupe-300' : ok ? 'bg-sage-100 text-sage-700 dark:bg-sage-700/30 dark:text-sage-200' : 'bg-blush-50 text-blush-600 dark:bg-blush-700/20 dark:text-blush-200'}`}>{neutral ? '·' : ok ? '✓' : '○'} {label}</span>;
}

function Weekly() {
  const { state, today, now } = useStore();
  const [ws, setWs] = useState(weekStart(today));
  const days = weekDays(ws);
  const past = days.filter((d) => d <= today && d >= state.settings.firstUsed);
  const wf = weekFitness(state, ws);
  const ns = nutritionStats(state, past);
  const readMin = days.reduce((a, d) => a + readingMinutes(getDay(state, d), now), 0);
  const scores = past.map((d) => dayScore(state, d).pct).filter((x): x is number => x !== null);
  const habitAvg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const T = state.settings.targets;
  const chart = days.map((d) => { const p = d <= today && d >= state.settings.firstUsed ? dayScore(state, d).pct : null; return { key: d, label: DAY_LETTERS[dow(d)], value: p === null ? 0 : p * 100, muted: d > today, tip: p === null ? `${shortDate(d)}: ${d > today ? 'upcoming' : 'no data'}` : `${shortDate(d)}: ${Math.round((p ?? 0) * 100)}%` }; });

  return (
    <>
      <WeekNav ws={ws} today={today} onChange={setWs} />
      <section className="card">
        <SectionTitle>Two separate scores</SectionTitle>
        <div className="flex justify-around">
          <div className="text-center"><Ring value={habitAvg ?? 0} size={104} stroke={9} color="#C06C82" label="Daily consistency"><span className="font-display text-2xl font-semibold">{pct(habitAvg)}</span></Ring><p className="mt-1 text-xs font-medium">Daily consistency</p><p className="muted text-[11px]">avg of {past.length} day{past.length === 1 ? '' : 's'}</p></div>
          <div className="text-center"><Ring value={wf.pct} size={104} stroke={9} color="#6C8F64" label="Weekly fitness"><span className="font-display text-2xl font-semibold">{wf.totalDone}/{wf.totalTarget}</span></Ring><p className="mt-1 text-xs font-medium">Weekly fitness</p><p className="muted text-[11px]">{pct(wf.pct)} of target</p></div>
        </div>
      </section>
      <section className="card">
        <SectionTitle>Daily completion</SectionTitle>
        <BarChart data={chart} max={100} line={state.settings.consistencyThreshold} color="#C06C82" unit="" />
        <p className="muted text-[11px]">Dashed line = your {state.settings.consistencyThreshold}% streak threshold.</p>
      </section>
      <section className="card">
        <SectionTitle>Workouts</SectionTitle>
        <div className="space-y-3">
          {(['strength', 'pilates', 'cardio'] as WorkoutType[]).map((t) => (
            <div key={t}><div className="mb-1 flex justify-between text-sm"><span className="font-medium">{WORKOUT_LABEL[t]}</span><span className="tabular-nums">{wf.done[t]} of {T[t]}{wf.done[t] > T[t] ? ' · bonus!' : ''}</span></div><Bar value={wf.done[t] / T[t]} color={TYPE_BG[t]} /></div>
          ))}
        </div>
      </section>
      <section className="grid grid-cols-2 gap-2">
        <Stat label="Avg protein" value={ns.trackedDays ? `${Math.round(ns.avgProtein)} g` : '—'} sub={`${ns.pMet}/${ns.trackedDays} days ≥ ${state.settings.proteinMin} g`} />
        <Stat label="Avg fiber" value={ns.trackedDays ? `${round1(ns.avgFiber)} g` : '—'} sub={`${ns.fMet}/${ns.trackedDays} days ≥ ${state.settings.fiberGoal} g`} />
        <Stat label="Reading" value={`${readMin} min`} sub={`${days.filter((d) => getDay(state, d).reading.completed).length}/7 days complete`} />
        <Stat label="Habit consistency" value={pct(habitAvg)} sub="skips & not-needed excluded" />
      </section>
    </>
  );
}

function Monthly() {
  const { state, today, now } = useStore();
  const [ms, setMs] = useState(monthStart(today));
  const dark = useDark();
  const seq = dark ? SEQ_DARK : SEQ_LIGHT;
  const days = monthDays(ms);
  const past = days.filter((d) => d <= today && d >= state.settings.firstUsed);
  const lead = dow(days[0]); // Sunday-first grid
  const [hover, setHover] = useState<string | null>(null);
  const scoreOf = (d: string) => (d <= today && d >= state.settings.firstUsed ? dayScore(state, d).pct : null);
  const bin = (p: number) => (p >= 0.999 ? 4 : p >= 0.75 ? 3 : p >= 0.5 ? 2 : p > 0 ? 1 : 0);
  const ns = nutritionStats(state, past);
  const rates = habitRates(state, past, today).filter((r) => r.rate !== null && r.counted >= 1).sort((a, b) => (b.rate! - a.rate!));
  const bestH = rates.filter((r) => r.rate! >= 0.5).slice(0, 3);
  const attention = [...rates].reverse().filter((r) => r.rate! < 0.7).slice(0, 3);
  const readDays = past.filter((d) => getDay(state, d).reading.completed).length;
  const readMin = days.reduce((a, d) => a + readingMinutes(getDay(state, d), now), 0);
  const longest = longestStreak(past, readingTest(state));
  const weeks: string[] = [];
  for (let w = weekStart(days[0]); w <= days[days.length - 1]; w = addDays(w, 7)) if (w <= today) weeks.push(w);
  const monthWorkouts = workoutsInRange(state, past).filter((w) => w.status === 'done');
  const hs = hover ? dayScore(state, hover) : null;

  return (
    <>
      <div className="flex items-center justify-between rounded-full bg-cream p-1 dark:bg-night-700">
        <button className="icon-btn" onClick={() => setMs(addMonths(ms, -1))} aria-label="Previous month"><Icon name="left" /></button>
        <button className="text-sm font-medium" onClick={() => setMs(monthStart(today))}>{monthName(ms)}</button>
        <button className="icon-btn" onClick={() => setMs(addMonths(ms, 1))} aria-label="Next month"><Icon name="right" /></button>
      </div>

      <section className="card">
        <SectionTitle>Habit completion</SectionTitle>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((l, i) => <span key={i} className="muted text-[10px] font-medium">{l}</span>)}
          {Array.from({ length: lead }, (_, i) => <span key={'x' + i} />)}
          {days.map((d) => {
            const p = scoreOf(d);
            const future = p === null;
            return (
              <button key={d} onMouseEnter={() => setHover(d)} onFocus={() => setHover(d)} onClick={() => setHover(hover === d ? null : d)}
                className={`flex aspect-square items-center justify-center rounded-xl text-[11px] font-medium transition ${d === today ? 'ring-2 ring-blush-400' : ''} ${hover === d ? 'scale-105' : ''}`}
                style={{ background: future ? 'transparent' : seq[bin(p!)], color: !future && bin(p!) >= (dark ? 3 : 3) ? (dark ? '#171312' : '#fff') : undefined, border: future ? '1px dashed rgba(139,121,108,.3)' : undefined }}
                aria-label={`${shortDate(d)} ${future ? 'no data' : Math.round(p! * 100) + '%'}`}>
                {Number(d.slice(8))}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px]">
          <span className="muted">{hover && hs ? `${shortDate(hover)} · ${hover > today ? 'upcoming' : hover < state.settings.firstUsed ? 'before you started' : `${pct(hs.pct)} (${hs.done}/${hs.counted})`}` : 'Tap a day for details'}</span>
          <span className="muted flex items-center gap-1">0%{seq.map((c) => <span key={c} className="h-3 w-3 rounded-[4px]" style={{ background: c }} />)}100%</span>
        </div>
      </section>

      <section className="card">
        <SectionTitle>Fitness consistency</SectionTitle>
        <div className="space-y-2">
          {weeks.map((w) => { const f = weekFitness(state, w); return (
            <div key={w} className="flex items-center gap-3 text-xs"><span className="muted w-20 shrink-0">Wk of {shortDate(w)}</span><div className="flex-1"><Bar value={f.pct} color="bg-sage-500" /></div><span className="w-10 text-right font-medium tabular-nums">{f.totalDone}/{f.totalTarget}</span></div>
          ); })}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(['strength', 'pilates', 'cardio'] as WorkoutType[]).map((t) => <Stat key={t} label={WORKOUT_LABEL[t]} value={monthWorkouts.filter((w) => w.type === t).length} sub="sessions" />)}
        </div>
      </section>

      <section className="card">
        <SectionTitle>Nutrition consistency</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Protein goal days" value={`${ns.pMet}`} sub={`of ${ns.trackedDays} logged · ${pct(ns.proteinMetPct)}`} />
          <Stat label="Fiber goal days" value={`${ns.fMet}`} sub={`of ${ns.trackedDays} logged · ${pct(ns.fiberMetPct)}`} />
          <Stat label="Avg protein" value={ns.trackedDays ? `${Math.round(ns.avgProtein)} g` : '—'} />
          <Stat label="Avg fiber" value={ns.trackedDays ? `${round1(ns.avgFiber)} g` : '—'} />
        </div>
        <p className="muted mt-2 text-[11px]">Logged on {ns.trackedDays} of {past.length} days so far this month.</p>
      </section>

      <section className="card">
        <SectionTitle>Reading</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Days" value={readDays} sub={`of ${past.length}`} />
          <Stat label="Minutes" value={readMin} />
          <Stat label="Best streak" value={longest} sub="days" />
        </div>
      </section>

      <section className="card">
        <SectionTitle>Best-performing habits</SectionTitle>
        {bestH.length ? <HabitList items={bestH} good /> : <p className="muted text-sm">Keep checking off habits — your strongest ones will appear here.</p>}
        <h3 className="h-card mb-3 mt-5">Needs a little more love</h3>
        {attention.length ? <HabitList items={attention} /> : <p className="muted text-sm">Nothing here — every habit is above 70%. Lovely.</p>}
      </section>
    </>
  );
}

function HabitList({ items, good }: { items: ReturnType<typeof habitRates>; good?: boolean }) {
  return (
    <div className="space-y-2.5">
      {items.map((r) => (
        <div key={r.habit.id}>
          <div className="mb-1 flex justify-between gap-2 text-sm"><span className="truncate">{r.habit.name}</span><span className="shrink-0 font-medium tabular-nums">{pct(r.rate)}</span></div>
          <Bar value={r.rate ?? 0} color={good ? 'bg-sage-500' : 'bg-blush-400'} className="h-2" />
          <p className="muted mt-0.5 text-[11px]">{r.done} of {r.counted} days{r.excluded ? ` · ${r.excluded} not needed/skipped (not counted)` : ''}</p>
        </div>
      ))}
    </div>
  );
}

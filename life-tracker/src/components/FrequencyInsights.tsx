import { useState } from 'react';
import { useStore } from '../lib/store';
import { addDays, addMonths, DAY_LETTERS, dow, monthDays, monthName, monthStart, shortDate, weekDays, weekStart } from '../lib/date';
import { activityRates, fmDay, hasJournal, moodSummary } from '../lib/fmcalc';
import { longestStreak, pct } from '../lib/calc';
import { MOOD_SCALE, MOODS, RITUALS } from '../lib/frequency';
import { Bar, BarChart, DateNav, Icon, Ring, Segmented, SectionTitle, Stat } from './ui';
import { WeekNav } from '../pages/Fitness';

/** Days that can be scored: started, not in the future, and with at least one activity scheduled. */
const scorable = (state: any, d: string, today: string) => d <= today && d >= state.settings.firstUsed && fmDay(state, d).total > 0;
const SEQ_LIGHT = ['#F8F5FC', '#DED3F0', '#C7B6E2', '#AA94CE', '#7561A0'];
const SEQ_DARK = ['#2A2633', '#3B3150', '#5B4B7E', '#8F77BA', '#C7B6E2'];

export default function FrequencyInsights() {
  const [tab, setTab] = useState<'day' | 'week' | 'month'>('week');
  return (
    <div className="space-y-4">
      <Segmented size="sm" value={tab} onChange={setTab} options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
      {tab === 'day' ? <Day /> : tab === 'week' ? <Week /> : <Month />}
      <p className="muted px-2 text-center text-[11px]">A perfect day has all six activities. An active day has at least one. Days before you started never count as missed.</p>
    </div>
  );
}

function Day() {
  const { state, today } = useStore();
  const [date, setDate] = useState(today);
  const f = fmDay(state, date);
  const moods = state.days[date]?.moods ?? [];
  return (
    <>
      <DateNav date={date} today={today} onChange={setDate} />
      <section className="card-lav">
        <div className="flex items-center gap-5">
          <Ring value={f.pct ?? 0} size={104} stroke={9} color="#8F77BA" label="Frequency Maxxing today"><span className="font-display text-2xl font-semibold">{pct(f.pct)}</span><span className="muted text-[11px]">{f.done}/{f.total}</span></Ring>
          <div className="flex-1 space-y-2.5">
            {RITUALS.map((r) => { const b = f.byRitual[r.id]; return (
              <div key={r.id}><div className="mb-1 flex justify-between text-xs"><span className="font-medium">{r.title}</span><span>{b.done}/{b.total}</span></div><Bar value={b.total ? b.done / b.total : 0} color="bg-lavender-500" className="h-2" /></div>
            ); })}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Stat label="Listening" value={`${f.listenMin} min`} /><Stat label="Mood check-ins" value={moods.length} sub={moods.filter((m) => m.after).length ? `${moods.filter((m) => m.after).length} with an after rating` : undefined} /></div>
      </section>
    </>
  );
}

function Week() {
  const { state, today } = useStore();
  const [ws, setWs] = useState(weekStart(today));
  const days = weekDays(ws).filter((d) => scorable(state, d, today));
  const fs = days.map((d) => fmDay(state, d));
  const rates = activityRates(state, weekDays(ws).filter((d) => d <= today), today);
  const best = [...rates].filter((r) => r.rate !== null).sort((a, b) => b.rate! - a.rate!)[0];
  const chart = weekDays(ws).map((d) => { const f = scorable(state, d, today) ? fmDay(state, d) : null; return { key: d, label: DAY_LETTERS[dow(d)], value: f ? f.done : 0, muted: !f, tip: f ? `${shortDate(d)}: ${f.done}/${f.total}` : `${shortDate(d)}: —` }; });
  return (
    <>
      <WeekNav ws={ws} today={today} onChange={setWs} />
      <section className="grid grid-cols-3 gap-2">
        <Stat label="Active days" value={`${fs.filter((f) => f.active).length}/${days.length || 0}`} />
        <Stat label="Perfect days" value={fs.filter((f) => f.perfect).length} />
        <Stat label="Listening" value={`${fs.reduce((a, f) => a + f.listenMin, 0)}m`} />
      </section>
      <section className="card">
        <SectionTitle>Activities per day</SectionTitle>
        <BarChart data={chart} max={6} line={6} color="#8F77BA" height={120} />
      </section>
      <section className="card">
        <SectionTitle>Completion by activity</SectionTitle>
        <div className="space-y-2.5">
          {rates.map((r) => (
            <div key={r.habit.id}><div className="mb-1 flex justify-between gap-2 text-sm"><span className="truncate">{r.habit.name}</span><span className="shrink-0 tabular-nums">{r.done}/{r.counted}</span></div><Bar value={r.rate ?? 0} color="bg-lavender-500" className="h-2" /></div>
          ))}
        </div>
        {best && best.rate! > 0 && <p className="mt-3 text-sm"><Icon name="trophy" className="mr-1 inline h-4 w-4 text-cardio" />Most consistent: <b className="font-medium">{best.habit.name}</b> ({pct(best.rate)})</p>}
      </section>
    </>
  );
}

function Month() {
  const { state, today } = useStore();
  const [ms, setMs] = useState(monthStart(today));
  const dark = document.documentElement.classList.contains('dark');
  const seq = dark ? SEQ_DARK : SEQ_LIGHT;
  const days = monthDays(ms);
  const past = days.filter((d) => scorable(state, d, today));
  const fs = past.map((d) => fmDay(state, d));
  const totalDone = fs.reduce((a, f) => a + f.done, 0), totalPossible = fs.reduce((a, f) => a + f.total, 0);
  const lead = dow(days[0]);
  const [hover, setHover] = useState<string | null>(null);
  const hv = hover && scorable(state, hover, today) ? fmDay(state, hover) : null;
  const mood = moodSummary(state, past);
  const journalDays = past.filter((d) => state.days[d] && hasJournal(state.days[d])).length;
  const weeks: string[] = [];
  for (let w = weekStart(days[0]); w <= days[days.length - 1]; w = addDays(w, 7)) if (w <= today) weeks.push(w);
  const trend = weeks.map((w) => { const ds = weekDays(w).filter((d) => scorable(state, d, today) && d.slice(0, 7) === ms.slice(0, 7)); const f = ds.map((d) => fmDay(state, d)); const t = f.reduce((a, x) => a + x.total, 0); const v = t ? f.reduce((a, x) => a + x.done, 0) / t : 0; return { key: w, label: shortDate(w), value: v * 100, muted: !t, tip: `Week of ${shortDate(w)}: ${Math.round(v * 100)}%` }; });
  const bin = (p: number) => (p >= 0.999 ? 4 : p >= 0.66 ? 3 : p >= 0.33 ? 2 : p > 0 ? 1 : 0);
  return (
    <>
      <div className="flex items-center justify-between rounded-full bg-cream p-1 dark:bg-night-700">
        <button className="icon-btn" onClick={() => setMs(addMonths(ms, -1))} aria-label="Previous month"><Icon name="left" /></button>
        <button className="text-sm font-medium" onClick={() => setMs(monthStart(today))}>{monthName(ms)}</button>
        <button className="icon-btn" onClick={() => setMs(addMonths(ms, 1))} aria-label="Next month"><Icon name="right" /></button>
      </div>
      <section className="card">
        <SectionTitle>Ritual heatmap</SectionTitle>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((l, i) => <span key={i} className="muted text-[10px] font-medium">{l}</span>)}
          {Array.from({ length: lead }, (_, i) => <span key={'x' + i} />)}
          {days.map((d) => {
            const f = scorable(state, d, today) ? fmDay(state, d) : null;
            const b = f ? bin(f.pct ?? 0) : 0;
            return (
              <button key={d} onMouseEnter={() => setHover(d)} onClick={() => setHover(hover === d ? null : d)} aria-label={`${shortDate(d)} ${f ? `${f.done} of ${f.total}` : 'no data'}`}
                className={`flex aspect-square items-center justify-center rounded-xl text-[11px] font-medium ${d === today ? 'ring-2 ring-lavender-400' : ''}`}
                style={{ background: f ? seq[b] : 'transparent', color: f && b >= 3 ? (dark ? '#171312' : '#fff') : undefined, border: f ? (f.active || d === today ? undefined : '1px solid rgba(196,87,126,.35)') : '1px dashed rgba(139,121,108,.3)' }}>
                {Number(d.slice(8))}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px]">
          <span className="muted">{hv ? `${shortDate(hover!)} · ${hv.done}/${hv.total}${hv.perfect ? ' · perfect' : !hv.active && hover! < today ? ' · missed' : ''}` : 'Rose outline = missed day'}</span>
          <span className="muted flex items-center gap-1">0{seq.map((c) => <span key={c} className="h-3 w-3 rounded-[4px]" style={{ background: c }} />)}6</span>
        </div>
      </section>
      <section className="grid grid-cols-2 gap-2">
        <Stat label="Completion rate" value={pct(totalPossible ? totalDone / totalPossible : null)} sub={`${totalDone} of ${totalPossible} activities`} />
        <Stat label="Perfect / active days" value={`${fs.filter((f) => f.perfect).length} / ${fs.filter((f) => f.active).length}`} sub={`of ${past.length} days`} />
        <Stat label="Best perfect streak" value={longestStreak(past, (d) => fmDay(state, d).perfect)} sub="days" />
        <Stat label="Journaling" value={`${journalDays}/${past.length}`} sub="days with an entry" />
      </section>
      {trend.length > 1 && (
        <section className="card"><SectionTitle>Weekly trend</SectionTitle><BarChart data={trend} max={100} color="#8F77BA" height={110} /><p className="muted text-[11px]">Share of activities completed each week.</p></section>
      )}
      <section className="card">
        <SectionTitle>Mood patterns</SectionTitle>
        {mood.entries.length === 0 ? <p className="muted text-sm">Log a mood before (and after) a session to see patterns here.</p> : (
          <div className="space-y-3">
            {mood.paired.length > 0 && (
              <>
                <div className="flex h-3 overflow-hidden rounded-full">
                  {mood.better > 0 && <div className="bg-sage-500" style={{ width: `${(mood.better / mood.paired.length) * 100}%` }} />}
                  {mood.same > 0 && <div className="bg-taupe-300" style={{ width: `${(mood.same / mood.paired.length) * 100}%` }} />}
                  {mood.worse > 0 && <div className="bg-blush-400" style={{ width: `${(mood.worse / mood.paired.length) * 100}%` }} />}
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sage-500" />Felt better {mood.better}</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-taupe-300" />Unchanged {mood.same}</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blush-400" />Felt worse {mood.worse}</span>
                </div>
                <p className="text-sm">Average mood: <b className="font-medium">{mood.avgBefore!.toFixed(1)}</b> before → <b className="font-medium">{mood.avgAfter!.toFixed(1)}</b> after <span className="muted text-xs">(1 = {MOOD_SCALE[0].toLowerCase()}, 5 = {MOOD_SCALE[4].toLowerCase()})</span></p>
              </>
            )}
            <div className="flex flex-wrap gap-1.5">{MOODS.filter((m) => mood.kinds[m.kind]).map((m) => <span key={m.kind} className="chip bg-lavender-50 text-lavender-700 dark:bg-lavender-800/40 dark:text-lavender-200">{m.label} · {mood.kinds[m.kind]}</span>)}</div>
            <p className="muted text-[11px]">This shows how you reported feeling. It doesn’t mean a sound caused the change: rest, breathing and simply pausing all play a part.</p>
          </div>
        )}
      </section>
    </>
  );
}

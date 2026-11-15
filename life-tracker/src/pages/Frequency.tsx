import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { addDays, fmtTime, parse, relDay, shortDate, todayStr } from '../lib/date';
import { AFFIRMATIONS, CATEGORIES, dailyPick, DISCLAIMER, EVENING_PROMPTS, freqInfo, FREQUENCIES, listenLinks, MANIFEST_PROMPTS, MOOD_SHORT, MOODS, RITUALS } from '../lib/frequency';
import { fmDay, fmHabits, fmStreak, latestMood } from '../lib/fmcalc';
import { fmDone, fmElapsed } from '../lib/fmtimer';
import { tone, useTone } from '../lib/tone';
import type { FmTimer, MoodEntry, MoodKind, RitualId } from '../lib/types';
import { Collapsible, Confirm, Icon, Ring, Sheet, Toggle, useToast } from '../components/ui';
import { HabitRow } from '../components/habits';
import { JournalField, MoodSheet, Stars } from '../components/frequency';
import { HabitManager } from './Habits';

export type StudioCfg = { freq: number; minutes: number; ritual: RitualId | 'none'; auto: boolean };
const DURATIONS = [5, 10, 15, 20, 30];
const mmss = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);

/** Which ritual to suggest next: the first one today that still has open activities. */
export function nextRitual(s: Parameters<typeof fmDay>[0], date: string) {
  const f = fmDay(s, date);
  return RITUALS.find((r) => f.byRitual[r.id].total > f.byRitual[r.id].done) ?? null;
}

export default function Frequency({ go }: { go: (r: string) => void }) {
  const { state, today } = useStore();
  const [cfg, setCfg] = useState<StudioCfg>({ freq: 528, minutes: 5, ritual: 'morning', auto: true });
  const [manage, setManage] = useState(false);
  const studioRef = useRef<HTMLDivElement>(null);
  const f = fmDay(state, today);
  const perfect = fmStreak(state, today, (x) => x.perfect);
  const active = fmStreak(state, today, (x) => x.active);
  const habits = fmHabits(state, today);
  const next = nextRitual(state, today);
  const mood = latestMood(state.days[today] ?? ({} as any));

  const openStudio = (c: Partial<StudioCfg>) => {
    setCfg((x) => ({ ...x, ...c }));
    setTimeout(() => studioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  return (
    <div className="space-y-4">
      <header className="relative px-1">
        <Stars className="absolute -top-1 right-0 h-10 w-32" />
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-lavender-500">Évol ritual</p>
        <h1 className="h-title">Frequency Maxxing ✨</h1>
        <p className="muted text-sm">Sound, intention and reflection: a little ritual for energy, abundance and peace.</p>
      </header>

      {/* Today */}
      <section className="card-lav">
        <div className="flex items-center gap-4">
          <Ring value={f.pct ?? 0} size={104} stroke={9} color="#8F77BA" label={`Frequency Maxxing ${Math.round((f.pct ?? 0) * 100)}% today`}>
            <span className="font-display text-2xl font-semibold">{Math.round((f.pct ?? 0) * 100)}%</span>
            <span className="muted text-[11px]">{f.done}/{f.total} today</span>
          </Ring>
          <div className="grid flex-1 grid-cols-2 gap-2 text-center">
            <Mini label="Perfect-day streak" value={`${perfect}`} sub="all six" />
            <Mini label="Active-day streak" value={`${active}`} sub="1+ activity" />
            <Mini label="Listening" value={`${f.listenMin}m`} sub="today" />
            <Mini label="Mood" value={mood ? MOOD_SHORT[mood.kind] : '—'} sub={mood ? (mood.after ? `${mood.before ?? '–'} → ${mood.after}` : `before ${mood.before ?? '–'}/5`) : 'not logged'} />
          </div>
        </div>
        {next ? (
          <button className="mt-4 flex w-full items-center justify-between rounded-2xl bg-white/70 px-4 py-3 text-left text-sm dark:bg-night-700" onClick={() => document.getElementById('ritual-' + next.id)?.scrollIntoView({ behavior: 'smooth' })}>
            <span><span className="muted text-xs">Next suggested</span><br /><b className="font-medium">{next.title} · {next.subtitle}</b> <span className="muted">· {fmtTime(next.time)}</span></span>
            <Icon name="right" className="h-4 w-4 text-lavender-500" />
          </button>
        ) : f.total > 0 && <p className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-sm dark:bg-night-700">All six done today. A perfect day ✨</p>}
      </section>

      <Collapsible title="Today’s checklist" subtitle={`${f.done} of ${f.total} complete · counts toward your daily progress`} open
        right={<button className="btn-ghost btn-sm" onClick={() => setManage(true)}><Icon name="edit" className="h-4 w-4" />Edit</button>}>
        <div className="space-y-2">{habits.map((h) => <HabitRow key={h.id} habit={h} date={today} />)}</div>
        {!habits.length && <p className="muted text-sm">No activities scheduled today. Tap Edit to change their days.</p>}
      </Collapsible>

      <MoodSelector date={today} onListen={(hz, minutes) => openStudio({ freq: hz, minutes, ritual: 'none' })} />

      <div ref={studioRef} className="scroll-mt-20"><Studio cfg={cfg} setCfg={setCfg} /></div>

      {RITUALS.map((r) => <RitualCard key={r.id} id={r.id} open={next?.id === r.id} onListen={(hz, minutes) => openStudio({ freq: hz, minutes, ritual: r.id, auto: true })} />)}

      <section className="card">
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="h-card">Journal & reflection</h3><p className="muted text-xs">Intentions, manifestation, gratitude and release. Private to you.</p></div>
          <button className="btn-lav btn-sm" onClick={() => go('journal')}><Icon name="book" className="h-4 w-4" />Open</button>
        </div>
      </section>

      <ChallengeCard />

      <section className="card">
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="h-card">Progress</h3><p className="muted text-xs">Daily, weekly and monthly patterns, moods and streaks.</p></div>
          <button className="btn-ghost btn-sm" onClick={() => go('insights-frequency')}><Icon name="insights" className="h-4 w-4" />View</button>
        </div>
      </section>

      <Collapsible title="About frequencies" subtitle="Wellness traditions, not science">
        <p className="muted text-sm leading-relaxed">{DISCLAIMER} If a sound feels unpleasant, stop. Keep the volume low.</p>
      </Collapsible>

      <HabitManager category={manage ? 'frequency' : null} onClose={() => setManage(false)} />
    </div>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-white/60 px-2 py-2 dark:bg-night-700">
      <p className="text-[10px] font-medium uppercase tracking-wider text-taupe-500 dark:text-taupe-300">{label}</p>
      <p className="font-display text-xl font-semibold leading-tight">{value}</p>
      <p className="muted truncate text-[10px]">{sub}</p>
    </div>
  );
}

// ---------------- Mood selector ----------------
function MoodSelector({ date, onListen }: { date: string; onListen: (hz: number, minutes: number) => void }) {
  const { day } = useStore();
  const [sel, setSel] = useState<MoodKind | null>(null);
  const [sheet, setSheet] = useState<{ entry?: MoodEntry | null } | null>(null);
  const m = MOODS.find((x) => x.kind === sel);
  const entries = [...(day(date).moods ?? [])].sort((a, b) => b.at - a.at);
  return (
    <section className="card">
      <h3 className="h-card">What energy do you need today?</h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {MOODS.map((x) => (
          <button key={x.kind} onClick={() => setSel(sel === x.kind ? null : x.kind)} aria-pressed={sel === x.kind}
            className={`rounded-2xl border p-3 text-left transition ${sel === x.kind ? 'border-lavender-400 bg-lavender-50 dark:border-lavender-500 dark:bg-lavender-800/40' : 'border-taupe-100 hover:bg-cream dark:border-night-600 dark:hover:bg-night-700'}`}>
            <p className="text-sm font-medium">{x.label}</p><p className="muted text-[11px]">{x.focus}</p>
          </button>
        ))}
      </div>
      {m && (
        <div className="mt-3 space-y-2.5 rounded-2xl bg-lavender-50 p-4 animate-rise dark:bg-lavender-800/30">
          <div className="flex items-baseline justify-between"><span className="font-display text-3xl font-semibold text-lavender-600 dark:text-lavender-300">{m.hz} Hz</span><span className="muted text-xs">suggested {m.minutes} min</span></div>
          <p className="text-sm italic">“{m.affirmation}”</p>
          <p className="text-sm"><b className="font-medium">Try this:</b> {m.activity}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button className="btn-lav btn-sm" onClick={() => onListen(m.hz, m.minutes)}><Icon name="play" className="h-4 w-4" />Listen in Évol</button>
            <a className="btn-ghost btn-sm" href={listenLinks(m.hz)[0].href} target="_blank" rel="noreferrer">Find a track ↗</a>
            <button className="btn-ghost btn-sm" onClick={() => setSheet({})}><Icon name="plus" className="h-4 w-4" />Save mood</button>
          </div>
          <p className="muted text-[10px]">{m.hz} Hz has a traditional association with {freqInfo(m.hz)?.theme.toLowerCase()}. That’s a wellness tradition, not a proven effect.</p>
        </div>
      )}
      {entries.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="label">Today’s check-ins</p>
          {entries.map((e) => (
            <button key={e.id} onClick={() => setSheet({ entry: e })} className="flex w-full items-center justify-between rounded-2xl bg-cream/70 px-3 py-2 text-left text-sm dark:bg-night-700">
              <span>{MOODS.find((x) => x.kind === e.kind)?.label}<span className="muted text-xs"> · {new Date(e.at + 3 * 3600e3).toISOString().slice(11, 16)}</span></span>
              <span className="text-xs">{e.before ?? '–'} → {e.after ?? <span className="text-lavender-500">add after</span>}</span>
            </button>
          ))}
        </div>
      )}
      <MoodSheet open={!!sheet} onClose={() => setSheet(null)} date={date} initialKind={sel ?? 'low'} entry={sheet?.entry} />
    </section>
  );
}

// ---------------- Listening studio ----------------
function Studio({ cfg, setCfg }: { cfg: StudioCfg; setCfg: (f: (c: StudioCfg) => StudioCfg) => void }) {
  const { state, today, now, updateDay } = useStore();
  const toneState = useTone();
  // A countdown started just before midnight still belongs to the day it began.
  const y = addDays(today, -1);
  const timerDate = state.days[y]?.fmTimer?.runningSince ? y : today;
  const t: FmTimer | null | undefined = state.days[timerDate]?.fmTimer;
  const running = !!t?.runningSince;
  const finished = !!t && fmDone(t);
  const active = t && !finished;
  const view = active || finished ? t! : null;
  const total = (view?.minutes ?? cfg.minutes) * 60000;
  const elapsed = view ? fmElapsed(view, now) : 0;
  const remaining = Math.max(0, total - elapsed);
  const hz = view?.freq ?? cfg.freq;
  const info = freqInfo(hz);

  const setTimer = (fn: (x: FmTimer | null | undefined) => FmTimer | null) => updateDay(timerDate, (d) => ({ ...d, fmTimer: fn(d.fmTimer) }));
  const start = () => updateDay(today, (d) => ({ ...d, fmTimer: { ...cfg, accMs: 0, runningSince: Date.now() } }));
  const pause = () => setTimer((x) => (x ? { ...x, accMs: fmElapsed(x, Date.now()), runningSince: null } : null));
  const resume = () => setTimer((x) => (x ? { ...x, runningSince: Date.now() } : null));
  const reset = () => setTimer(() => null);

  return (
    <section className="card-lav">
      <div className="mb-3 flex items-center justify-between"><h3 className="h-card">Listening studio</h3><span className="chip bg-white/70 text-lavender-600 dark:bg-night-700 dark:text-lavender-300">{hz} Hz</span></div>

      {!view && (
        <div className="space-y-3">
          <div>
            <span className="label">Frequency</span>
            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {FREQUENCIES.map((x) => (
                <button key={x.hz} onClick={() => { setCfg((c) => ({ ...c, freq: x.hz })); if (toneState.playing) tone.setHz(x.hz); }}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${cfg.freq === x.hz ? 'bg-lavender-500 text-white' : 'bg-white/70 text-taupe-600 dark:bg-night-700 dark:text-taupe-200'}`}>{x.hz}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Session length</span>
            <div className="flex gap-1.5">{DURATIONS.map((d) => <button key={d} onClick={() => setCfg((c) => ({ ...c, minutes: d }))} className={`flex-1 rounded-full py-1.5 text-xs font-medium ${cfg.minutes === d ? 'bg-lavender-500 text-white' : 'bg-white/70 dark:bg-night-700'}`}>{d}m</button>)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="label">For ritual</span>
              <select className="input py-2" value={cfg.ritual} onChange={(e) => setCfg((c) => ({ ...c, ritual: e.target.value as StudioCfg['ritual'] }))}>
                <option value="morning">Morning</option><option value="midday">Midday</option><option value="evening">Evening</option><option value="none">Just listening</option>
              </select>
            </label>
            <div className="flex items-end justify-between gap-2 pb-1">
              <span className="text-xs leading-tight">Tick the activity when the timer ends</span>
              <Toggle on={cfg.auto && cfg.ritual !== 'none'} disabled={cfg.ritual === 'none'} label="Auto-complete" onChange={(v) => setCfg((c) => ({ ...c, auto: v }))} />
            </div>
          </div>
        </div>
      )}

      <div className="my-5 flex justify-center">
        <div className="relative flex h-52 w-52 items-center justify-center">
          {running && <><span className="absolute inset-0 rounded-full bg-lavender-200/60 animate-halo dark:bg-lavender-700/30" /><span className="absolute inset-6 rounded-full bg-lavender-100/80 animate-halo dark:bg-lavender-800/40" style={{ animationDelay: '1.5s' }} /></>}
          <Ring value={elapsed / total} size={208} stroke={8} color="#8F77BA" label={`${mmss(remaining)} remaining`}>
            <span className="font-display text-5xl font-semibold tabular-nums">{mmss(view ? remaining : total)}</span>
            <span className="muted text-xs">{finished ? 'Session complete ✓' : running ? 'breathe and listen' : view ? 'paused' : `${cfg.minutes} min session`}</span>
          </Ring>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {!view && <button className="btn-lav" onClick={start}><Icon name="play" className="h-4 w-4" />Start timer</button>}
        {active && running && <button className="btn-lav" onClick={pause}><Icon name="pause" className="h-4 w-4" />Pause</button>}
        {active && !running && <button className="btn-lav" onClick={resume}><Icon name="play" className="h-4 w-4" />Resume</button>}
        {view && <button className="btn-ghost" onClick={reset}><Icon name="reset" className="h-4 w-4" />{finished ? 'New session' : 'Reset'}</button>}
      </div>
      {finished && <p className="mt-2 text-center text-xs text-sage-600 dark:text-sage-300">Logged {view!.minutes} minutes{view!.auto && view!.ritual !== 'none' ? ' and ticked your ' + view!.ritual + ' listening activity' : ''}.</p>}

      {/* Audio — independent of the timer */}
      <div className="mt-5 rounded-2xl bg-white/70 p-3.5 dark:bg-night-700">
        <div className="flex items-center gap-3">
          <button className={toneState.playing ? 'btn-lav btn-sm' : 'btn-ghost btn-sm'} onClick={() => (toneState.playing ? tone.stop() : tone.play(hz))}>
            <Icon name={toneState.playing ? 'pause' : 'play'} className="h-4 w-4" />{toneState.playing ? `Stop tone` : `Play ${hz} Hz tone`}
          </button>
          <input type="range" min={0.05} max={1} step={0.05} value={toneState.volume} onChange={(e) => tone.setVolume(Number(e.target.value))} className="flex-1 accent-lavender-500" aria-label="Tone volume" />
        </div>
        <p className="muted mt-2 text-[11px] leading-relaxed">
          {toneState.playing ? `Playing a soft generated ${toneState.hz} Hz sine tone. ` : 'Generates a soft, pure sine tone in your browser. It is a simple tone, not music. '}
          Keep the volume low. On iPhone, turn off silent mode and keep Évol open. The tone stops when the screen locks.
        </p>
        {toneState.error && <p className="mt-1 text-xs text-blush-600">{toneState.error}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="muted self-center text-[11px]">Prefer music? Opens outside Évol:</span>
          {listenLinks(hz).map((l) => <a key={l.href} className="chip border border-taupe-200 dark:border-night-500" href={l.href} target="_blank" rel="noreferrer">{l.label} ↗</a>)}
        </div>
      </div>

      {info && <p className="muted mt-3 text-xs"><b className="font-medium text-taupe-700 dark:text-taupe-100">{hz} Hz · {info.theme}.</b> {info.note}</p>}

      <Collapsible tone="plain" title={<span className="text-base">Frequency library</span>} subtitle="Nine tones and their traditional associations">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {FREQUENCIES.map((x) => (
            <button key={x.hz} disabled={!!view} onClick={() => setCfg((c) => ({ ...c, freq: x.hz }))}
              className={`rounded-2xl border p-3 text-left transition disabled:opacity-60 ${cfg.freq === x.hz && !view ? 'border-lavender-400 bg-white dark:bg-night-700' : 'border-lavender-100 bg-white/50 dark:border-night-600 dark:bg-night-700/50'}`}>
              <p className="flex items-baseline justify-between"><span className="font-display text-xl font-semibold">{x.hz} Hz</span><span className="text-[11px] font-medium text-lavender-600 dark:text-lavender-300">{x.theme}</span></p>
              <p className="muted mt-0.5 text-[11px]">{x.note}</p>
            </button>
          ))}
        </div>
      </Collapsible>
    </section>
  );
}

// ---------------- Rituals ----------------
function Affirmation({ ritual, date }: { ritual: RitualId; date: string }) {
  const { state, updateSettings } = useStore();
  const list = [...AFFIRMATIONS[ritual], ...(state.settings.affirmations[ritual] ?? [])];
  const [i, setI] = useState(0);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState('');
  const text = dailyPick(list, date, i);
  const custom = state.settings.affirmations[ritual] ?? [];
  const setCustom = (arr: string[]) => updateSettings((s) => ({ ...s, affirmations: { ...s.affirmations, [ritual]: arr } }));
  return (
    <div className="rounded-2xl bg-lavender-50 p-3.5 dark:bg-lavender-800/30">
      <p className="font-display text-lg italic leading-snug">“{text}”</p>
      <div className="mt-2 flex gap-2">
        <button className="btn-ghost btn-sm" onClick={() => setI(i + 1)}>Another</button>
        <button className="btn-ghost btn-sm" onClick={() => setEdit(true)}><Icon name="edit" className="h-3.5 w-3.5" />My affirmations</button>
      </div>
      <Sheet open={edit} onClose={() => setEdit(false)} title="My affirmations">
        <p className="muted mb-3 text-sm">Your own lines join the suggestions in rotation.</p>
        <div className="space-y-1.5">
          {custom.map((a, k) => (
            <div key={k} className="flex items-center gap-2 rounded-2xl bg-cream/70 p-2.5 text-sm dark:bg-night-700"><span className="flex-1">{a}</span><button className="icon-btn h-8 w-8" aria-label="Remove" onClick={() => setCustom(custom.filter((_, j) => j !== k))}><Icon name="trash" className="h-4 w-4" /></button></div>
          ))}
        </div>
        <div className="mt-3 flex gap-2"><input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="I am…" onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) { setCustom([...custom, draft.trim()]); setDraft(''); } }} /><button className="btn-lav" disabled={!draft.trim()} onClick={() => { setCustom([...custom, draft.trim()]); setDraft(''); }}>Add</button></div>
      </Sheet>
    </div>
  );
}

function Breathing() {
  const [on, setOn] = useState(false);
  const [phase, setPhase] = useState<'Inhale' | 'Exhale'>('Inhale');
  useEffect(() => {
    if (!on) return;
    setPhase('Inhale');
    let t: ReturnType<typeof setTimeout>;
    const cycle = (p: 'Inhale' | 'Exhale') => { setPhase(p); t = setTimeout(() => cycle(p === 'Inhale' ? 'Exhale' : 'Inhale'), p === 'Inhale' ? 4000 : 6000); };
    cycle('Inhale');
    return () => clearTimeout(t);
  }, [on]);
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white/60 p-3 dark:bg-night-700">
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
        <span key={String(on)} className={`absolute inset-0 rounded-full bg-gradient-to-br from-lavender-200 to-blush-200 dark:from-lavender-700 dark:to-blush-700 ${on ? 'animate-breathe' : 'scale-[.62] opacity-60'}`} />
        <span className="relative text-[11px] font-medium">{on ? phase : '4 · 6'}</span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">Slow breathing</p>
        <p className="muted text-xs">Inhale for 4 seconds, exhale for 6. Continue comfortably, without forcing the breath.</p>
        <button className="btn-ghost btn-sm mt-2" onClick={() => setOn(!on)}>{on ? 'Stop' : 'Breathe with me'}</button>
      </div>
    </div>
  );
}

function RitualCard({ id, open, onListen }: { id: RitualId; open: boolean; onListen: (hz: number, minutes: number) => void }) {
  const { state, today, day, updateDay } = useStore();
  const r = RITUALS.find((x) => x.id === id)!;
  const f = fmDay(state, today);
  const hs = state.settings.habits;
  const h = (hid: string) => hs.find((x) => x.id === hid && x.enabled);
  const d = day(today);
  const cat = d.fmCategory;
  const prog = f.byRitual[id];
  return (
    <div id={'ritual-' + id} className="scroll-mt-20">
      <Collapsible tone="card" open={open}
        title={<span className="flex items-center gap-2">{r.title} <span className="font-sans text-xs font-normal text-lavender-600 dark:text-lavender-300">· {r.subtitle}</span></span>}
        subtitle={`${r.minutes} min · ${r.freqs.join(' or ')} Hz suggested · ${fmtTime(r.time)} · ${prog.done}/${prog.total} done`}>
        <div className="space-y-4">
          {id === 'morning' && <>
            <Step n={1} title="Frequency listening · 5 min">
              <ul className="muted list-inside list-disc text-sm leading-relaxed"><li>Listen to 528 Hz music or tone</li><li>Open the curtains, or spend time near natural light</li><li>Drink a glass of water</li><li>Stretch gently and prepare for the day</li></ul>
              <button className="btn-lav btn-sm mt-2" onClick={() => onListen(528, h('fm-morning-listen')?.duration ?? 5)}><Icon name="play" className="h-4 w-4" />5-min 528 Hz session</button>
            </Step>
            {h('fm-morning-listen') && <HabitRow habit={h('fm-morning-listen')!} date={today} />}
            <Step n={2} title="Affirmations & visualization · 5 min">
              <p className="muted mb-2 text-sm">Say your affirmation slowly. Picture a confident, peaceful, productive day, then set an intention for how you want to feel.</p>
              <Affirmation ritual="morning" date={today} />
              <div className="mt-3"><JournalField date={today} id="i.energy" placeholder="e.g. calm, focused, kind to myself" /></div>
            </Step>
            {h('fm-morning-affirm') && <HabitRow habit={h('fm-morning-affirm')!} date={today} />}
          </>}

          {id === 'midday' && <>
            <div>
              <span className="label">Manifesting today</span>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => <button key={c} onClick={() => updateDay(today, (x) => ({ ...x, fmCategory: x.fmCategory === c ? undefined : c }))} className={`chip border ${cat === c ? 'border-transparent bg-lavender-500 text-white' : 'border-taupe-200 dark:border-night-500'}`}>{c}</button>)}
              </div>
            </div>
            <Step n={1} title="Visualize"><p className="muted text-sm">Imagine your goal already achieved. Where are you, and how does it feel?</p></Step>
            <Step n={2} title="Affirm"><p className="muted mb-2 text-sm">Repeat a meaningful, believable affirmation about your goal.</p><Affirmation ritual="midday" date={today} /></Step>
            <Step n={3} title="Take action"><p className="muted text-sm">Choose one real-world step that moves your goal forward. It can happen any time today.</p></Step>
            <div className="flex flex-wrap gap-2">
              <button className="btn-lav btn-sm" onClick={() => onListen(639, h('fm-midday')?.duration ?? 5)}><Icon name="play" className="h-4 w-4" />5 min · 639 Hz</button>
              <button className="btn-ghost btn-sm" onClick={() => onListen(432, h('fm-midday')?.duration ?? 5)}><Icon name="play" className="h-4 w-4" />5 min · 432 Hz</button>
            </div>
            <div className="space-y-3 rounded-2xl bg-cream/50 p-3 dark:bg-night-700/60">
              <p className="label !mb-0">Manifestation journal · {shortDate(today)}</p>
              {MANIFEST_PROMPTS.map((pid) => <JournalField key={pid} date={today} id={pid} />)}
            </div>
            {h('fm-midday') && <HabitRow habit={h('fm-midday')!} date={today} />}
            {d.journal?.['m.step'] && <p className="rounded-2xl bg-lavender-50 px-3 py-2 text-sm dark:bg-lavender-800/30"><span className="muted text-xs">Your action today:</span><br />{d.journal['m.step']}</p>}
            {h('fm-action') && <HabitRow habit={h('fm-action')!} date={today} />}
          </>}

          {id === 'evening' && <>
            <Step n={1} title="Calming frequency listening · 10 min">
              <ul className="muted list-inside list-disc text-sm leading-relaxed"><li>Dim the lights</li><li>Listen to calming sounds</li><li>Relax your body, from your jaw down to your feet</li></ul>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="btn-lav btn-sm" onClick={() => onListen(396, h('fm-evening-listen')?.duration ?? 10)}><Icon name="play" className="h-4 w-4" />10 min · 396 Hz</button>
                <button className="btn-ghost btn-sm" onClick={() => onListen(432, h('fm-evening-listen')?.duration ?? 10)}><Icon name="play" className="h-4 w-4" />10 min · 432 Hz</button>
              </div>
            </Step>
            <Breathing />
            {h('fm-evening-listen') && <HabitRow habit={h('fm-evening-listen')!} date={today} />}
            <Step n={2} title="Emotional release journaling · 5 min">
              <p className="muted mb-2 text-sm">Write freely, or skip any prompt.</p>
              <div className="space-y-3">{EVENING_PROMPTS.map((pid) => <JournalField key={pid} date={today} id={pid} />)}</div>
            </Step>
            <Affirmation ritual="evening" date={today} />
            {h('fm-evening-journal') && <HabitRow habit={h('fm-evening-journal')!} date={today} />}
          </>}
        </div>
      </Collapsible>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lavender-100 text-xs font-semibold text-lavender-600 dark:bg-lavender-800 dark:text-lavender-200">{n}</span>
      <div className="min-w-0 flex-1"><p className="mb-1 text-sm font-semibold">{title}</p>{children}</div>
    </div>
  );
}

// ---------------- 14 Days of Alignment ----------------
const MILESTONES = [3, 7, 10, 14];
function ChallengeCard() {
  const { state, today, updateSettings } = useStore();
  const toast = useToast();
  const ch = state.settings.challenge;
  const [start, setStart] = useState(today);
  const [cancel, setCancel] = useState(false);
  const [refl, setRefl] = useState(ch?.reflection ?? {});
  useEffect(() => setRefl(ch?.reflection ?? {}), [ch?.startDate]);

  if (!ch) {
    return (
      <section className="card-lav">
        <h3 className="h-card">14 Days of Alignment</h3>
        <p className="muted mt-1 text-sm">An optional challenge to build a steady daily ritual. Each day you complete at least one Frequency Maxxing activity counts as aligned, and a perfect day has all six. It doesn’t change your regular checklist.</p>
        <div className="mt-3 flex items-end gap-2">
          <label className="block flex-1"><span className="label">Start date</span><input className="input" type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} /></label>
          <button className="btn-lav" onClick={() => { updateSettings((s) => ({ ...s, challenge: { startDate: start } })); toast.push({ title: 'Your 14 days begin ✨', body: start === today ? 'Starting today.' : `Starting ${shortDate(start)}.` }); }}>Begin</button>
        </div>
      </section>
    );
  }
  const days = Array.from({ length: 14 }, (_, i) => addDays(ch.startDate, i));
  const stats = days.map((d) => (d <= today ? fmDay(state, d) : null));
  const aligned = stats.filter((x) => x?.active).length;
  const perfect = stats.filter((x) => x?.perfect).length;
  const dayN = daysBetween(ch.startDate, today) + 1;
  const finished = dayN > 14;
  const saveRefl = () => { updateSettings((s) => ({ ...s, challenge: s.challenge ? { ...s.challenge, reflection: refl } : s.challenge })); toast.push({ title: 'Reflection saved' }); };
  const archive = () => updateSettings((s) => ({ ...s, pastChallenges: [...(s.pastChallenges ?? []), { ...s.challenge!, reflection: refl, endedAt: todayStr() }], challenge: null }));

  return (
    <section className="card-lav">
      <div className="flex items-start justify-between gap-2">
        <div><h3 className="h-card">14 Days of Alignment</h3><p className="muted text-xs">{dayN < 1 ? `Starts ${relDay(ch.startDate, today)}` : finished ? 'Complete' : `Day ${dayN} of 14`} · {aligned} aligned · {perfect} perfect</p></div>
        <button className="icon-btn" onClick={() => setCancel(true)} aria-label="End challenge"><Icon name="x" className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const s = stats[i];
          const future = !s;
          const pctv = s?.pct ?? 0;
          return (
            <div key={d} title={`${shortDate(d)}${s ? ` · ${s.done}/${s.total}` : ''}`} className={`flex aspect-square flex-col items-center justify-center rounded-xl text-[10px] font-medium ${d === today ? 'ring-2 ring-lavender-400' : ''}`}
              style={future ? { border: '1px dashed rgba(143,119,186,.35)' } : { background: s!.perfect ? '#8F77BA' : s!.active ? `rgba(143,119,186,${0.2 + pctv * 0.5})` : 'transparent', border: s!.active ? undefined : '1px solid rgba(196,87,126,.35)', color: s!.perfect ? '#fff' : undefined }}>
              {i + 1}{s && !s.active && d < today && <span className="text-[8px] text-blush-500">missed</span>}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {MILESTONES.map((m) => <span key={m} className={`chip ${aligned >= m ? 'bg-lavender-500 text-white' : 'bg-white/70 text-taupe-400 dark:bg-night-700'}`}>{aligned >= m ? '✦' : '○'} {m} days</span>)}
      </div>
      {finished && (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl bg-white/80 p-4 text-center dark:bg-night-700">
            <p className="font-display text-2xl font-semibold">You did it ✨</p>
            <p className="muted text-sm">Fourteen days, {aligned} aligned and {perfect} perfect. Take a moment to reflect.</p>
          </div>
          {([['energy', 'Has my energy improved?'], ['balance', 'Do I feel more emotionally balanced?'], ['intentional', 'Am I becoming more intentional?'], ['difference', 'Which rituals made the greatest difference?'], ['continueWith', 'Which activities would I like to continue?']] as const).map(([k, q]) => (
            <label key={k} className="block"><span className="mb-1 block text-sm font-medium">{q}</span><textarea className="textarea" value={(refl as any)[k] ?? ''} onChange={(e) => setRefl({ ...refl, [k]: e.target.value })} /></label>
          ))}
          <div className="flex gap-2"><button className="btn-ghost flex-1" onClick={saveRefl}>Save reflection</button><button className="btn-lav flex-1" onClick={() => { archive(); toast.push({ title: 'Challenge archived', body: 'Start a new one whenever you like.' }); }}>Finish</button></div>
        </div>
      )}
      {(state.settings.pastChallenges?.length ?? 0) > 0 && !finished && <p className="muted mt-2 text-[11px]">Completed before: {state.settings.pastChallenges!.length}</p>}
      <Confirm open={cancel} onClose={() => setCancel(false)} title="End this challenge?" confirmLabel="End challenge" body="Your daily records stay as they are. Only the challenge tracker is closed (and archived)." onConfirm={archive} />
    </section>
  );
}

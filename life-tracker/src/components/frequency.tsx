import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { uid } from '../lib/defaults';
import { MOOD_SCALE, MOODS, promptById } from '../lib/frequency';
import type { MoodEntry, MoodKind } from '../lib/types';
import { Icon, Sheet, useToast } from './ui';

/** A journal answer that saves itself as you type (and when you leave the field). */
export function JournalField({ date, id, label, short, placeholder }: { date: string; id: string; label?: string; short?: boolean; placeholder?: string }) {
  const { day, updateDay } = useStore();
  const saved = day(date).journal?.[id] ?? '';
  const [v, setV] = useState(saved);
  const [status, setStatus] = useState<'idle' | 'pending' | 'saved'>('idle');
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The pending edit remembers which date/prompt it belongs to, so switching days never saves text to the wrong day.
  const pend = useRef<{ date: string; id: string; val: string } | null>(null);

  const save = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (!dirty.current || !pend.current) return;
    dirty.current = false;
    const { date: d, id: k, val } = pend.current;
    pend.current = null;
    updateDay(d, (x) => {
      const j = { ...(x.journal ?? {}) };
      if (val.trim()) j[k] = val; else delete j[k];
      return { ...x, journal: j };
    });
    setStatus('saved');
  };
  // Load the stored answer when the date changes (or another device updates it while you're not typing).
  useEffect(() => { if (!dirty.current) setV(saved); }, [saved, date]);
  useEffect(() => () => save(), [date, id]); // flush before switching dates or leaving

  const onChange = (val: string) => {
    setV(val); dirty.current = true; setStatus('pending');
    pend.current = { date, id, val };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, 700);
  };
  const q = label ?? promptById(id)?.q ?? '';
  const common = { className: short ? 'input' : 'textarea', value: v, placeholder: placeholder ?? (short ? '' : 'Write freely, or skip…'), onChange: (e: any) => onChange(e.target.value), onBlur: save, 'aria-label': q };
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-taupe-700 dark:text-taupe-100">{q}</span>
        <span className="shrink-0 text-[10px] text-taupe-400">{status === 'pending' ? 'saving…' : status === 'saved' ? 'saved' : ''}</span>
      </span>
      {short ? <input {...common} /> : <textarea {...common} />}
    </label>
  );
}

export function MoodScale({ value, onChange, label }: { value?: number; onChange: (v: number | undefined) => void; label: string }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex gap-1.5">
        {MOOD_SCALE.map((l, i) => {
          const n = i + 1;
          const on = value === n;
          return (
            <button key={n} type="button" onClick={() => onChange(on ? undefined : n)} aria-pressed={on}
              className={`flex flex-1 flex-col items-center rounded-2xl px-1 py-2 text-[10px] font-medium transition ${on ? 'bg-lavender-500 text-white' : 'bg-cream text-taupe-500 dark:bg-night-700 dark:text-taupe-300'}`}>
              <span className="font-display text-lg leading-none">{n}</span>{l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Log how you feel before and (optionally) after a session. */
export function MoodSheet({ open, onClose, date, initialKind, entry }: { open: boolean; onClose: () => void; date: string; initialKind?: MoodKind; entry?: MoodEntry | null }) {
  const { updateDay } = useStore();
  const toast = useToast();
  const [m, setM] = useState<MoodEntry>({ id: uid(), kind: initialKind ?? 'low', at: Date.now() });
  useEffect(() => { if (open) setM(entry ? { ...entry } : { id: uid(), kind: initialKind ?? 'low', at: Date.now() }); }, [open, entry, initialKind]);
  const save = () => {
    updateDay(date, (x) => {
      const list = x.moods ?? [];
      return { ...x, moods: list.some((y) => y.id === m.id) ? list.map((y) => (y.id === m.id ? m : y)) : [...list, m] };
    });
    toast.push({ title: 'Mood saved', body: m.after ? 'Thanks for checking in after your session.' : 'Come back after your session to add how you feel.' });
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={entry ? 'Update mood' : 'Log your mood'}>
      <div className="space-y-4">
        <div>
          <span className="label">What energy did you need?</span>
          <div className="grid grid-cols-2 gap-1.5">
            {MOODS.map((x) => (
              <button key={x.kind} type="button" onClick={() => setM({ ...m, kind: x.kind })} className={`rounded-2xl px-3 py-2 text-left text-xs font-medium transition ${m.kind === x.kind ? 'bg-lavender-500 text-white' : 'bg-cream dark:bg-night-700'}`}>{x.label}</button>
            ))}
          </div>
        </div>
        <MoodScale label="Before the session" value={m.before} onChange={(v) => setM({ ...m, before: v })} />
        <MoodScale label="After the session (optional — add it later)" value={m.after} onChange={(v) => setM({ ...m, after: v })} />
        <label className="block"><span className="label">Notes (optional)</span><textarea className="textarea" value={m.note ?? ''} onChange={(e) => setM({ ...m, note: e.target.value || undefined })} /></label>
        <div className="flex gap-2">
          {entry && <button className="btn-ghost" onClick={() => { updateDay(date, (x) => ({ ...x, moods: (x.moods ?? []).filter((y) => y.id !== m.id) })); onClose(); }}><Icon name="trash" className="h-4 w-4" />Delete</button>}
          <button className="btn-lav flex-1" disabled={!m.before && !m.after} onClick={save}>Save</button>
        </div>
      </div>
    </Sheet>
  );
}

export function Stars({ className = '' }: { className?: string }) {
  // A few quiet celestial sparkles for headers.
  return (
    <svg viewBox="0 0 120 40" className={`pointer-events-none ${className}`} aria-hidden="true">
      {[[8, 10, 1.6, 0], [30, 26, 1.1, 1.2], [52, 8, 1.3, 2.1], [78, 22, 1.8, .6], [100, 9, 1.2, 1.7], [112, 30, 1, 2.6]].map(([x, y, r, d], i) => (
        <circle key={i} cx={x} cy={y} r={r} className="fill-lavender-300 animate-twinkle dark:fill-lavender-400" style={{ animationDelay: `${d}s` }} />
      ))}
      <path d="M66 14l1.4 4 4 1.4-4 1.4L66 25l-1.4-4.2-4-1.4 4-1.4z" className="fill-lavender-400/80" />
    </svg>
  );
}

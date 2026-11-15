import { useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { DAY_LETTERS, DAY_SHORT, fmtTime, todayStr, addDays, TZ_LABEL } from '../lib/date';
import { defaultSettings, normalizeDay, normalizeSettings, uid } from '../lib/defaults';
import { buildICS, clearSnooze, isPaused, snoozedUntil } from '../lib/reminders';
import { getDay, totals } from '../lib/calc';
import type { AppState, Reminder } from '../lib/types';
import { Confirm, Icon, NumberField, SectionTitle, Segmented, Sheet, Toggle, useToast } from '../components/ui';

async function offerFile(filename: string, data: string): Promise<'saved' | 'unavailable' | 'declined'> {
  try {
    const dl = await window.claude?.use?.('downloads');
    if (!dl) return 'unavailable';
    await dl.save({ filename, data });
    return 'saved';
  } catch (e: any) {
    return e?.code === 'declined' ? 'declined' : 'unavailable';
  }
}

export default function Settings() {
  const { state, updateSettings, sync, replaceAll, today } = useStore();
  const toast = useToast();
  const s = state.settings;
  const [confirmOn, setConfirmOn] = useState(false);
  const [cancelAll, setCancelAll] = useState(false);
  const [editRem, setEditRem] = useState<Reminder | null>(null);
  const [fallback, setFallback] = useState<{ title: string; text: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [reset, setReset] = useState(false);
  const set = (p: Partial<typeof s>) => updateSettings((x) => ({ ...x, ...p }));
  const setRem = (r: Reminder) => updateSettings((x) => ({ ...x, reminders: x.reminders.some((y) => y.id === r.id) ? x.reminders.map((y) => (y.id === r.id ? r : y)) : [...x.reminders, r] }));

  const exportFile = async (filename: string, text: string, title: string) => {
    const res = await offerFile(filename, text);
    if (res === 'saved') toast.push({ title: 'File ready', body: filename });
    else if (res === 'declined') toast.push({ title: 'Download cancelled' });
    else setFallback({ title, text });
  };
  const exportJSON = () => exportFile(`life-tracker-backup-${today}.json`, JSON.stringify({ app: 'Life Tracker', exportedAt: new Date().toISOString(), timezone: TZ_LABEL, ...state }, null, 2), 'Backup (JSON)');
  const exportCSV = () => {
    const rows = [['date', 'meal', 'food', 'protein_g', 'fiber_g', 'calories', 'carbs_g', 'fat_g']];
    Object.keys(state.days).sort().forEach((d) => getDay(state, d).meals.forEach((m) => rows.push([d, m.meal, m.name, String(m.protein), String(m.fiber), String(m.calories ?? ''), String(m.carbs ?? ''), String(m.fat ?? '')])));
    const daily = [['date', 'protein_g', 'fiber_g', 'reading_done', 'workouts_done']];
    Object.keys(state.days).sort().forEach((d) => { const dd = getDay(state, d); const t = totals(dd); daily.push([d, String(t.protein), String(t.fiber), dd.reading.completed ? 'yes' : 'no', String(dd.workouts.filter((w) => w.status === 'done').length)]); });
    const csv = (r: string[][]) => r.map((x) => x.map((c) => /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(',')).join('\n');
    exportFile(`life-tracker-meals-${today}.csv`, csv(rows) + '\n\n' + csv(daily), 'Meals & daily totals (CSV)');
  };
  const enabledRems = s.reminders.filter((r) => r.enabled);
  const exportICS = () => exportFile('life-tracker-reminders.ics', buildICS(enabledRems, today), 'Calendar reminders (.ics)');

  const askBrowser = async () => {
    try {
      if (typeof Notification === 'undefined') throw new Error('unsupported');
      const p = await Notification.requestPermission();
      if (p === 'granted') { set({ browserNotifications: true }); toast.push({ title: 'Browser notifications allowed', body: 'They appear while Life Tracker is open.' }); }
      else toast.push({ title: 'Notifications not allowed here', body: 'In-app reminders still work. Use the calendar export for phone notifications.' });
    } catch { toast.push({ title: 'Notifications not supported here', body: 'This frame cannot show system notifications. In-app reminders and the calendar export still work.' }); }
  };

  return (
    <div className="space-y-4">
      <header className="px-1"><p className="text-xs font-medium uppercase tracking-[0.2em] text-blush-500">Settings</p><h1 className="h-title">Make it yours</h1></header>

      <section className="card space-y-4">
        <SectionTitle>Profile & look</SectionTitle>
        <label className="block"><span className="label">Your name (for the welcome message)</span><input className="input" value={s.name} onChange={(e) => set({ name: e.target.value })} placeholder="Optional" /></label>
        <div><span className="label">Appearance</span><Segmented value={s.theme} onChange={(theme) => set({ theme })} options={[{ value: 'system', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} /></div>
      </section>

      <section className="card space-y-4">
        <SectionTitle>Goals</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Protein minimum" value={s.proteinMin} onChange={(v) => v && set({ proteinMin: v, proteinMax: Math.max(v, s.proteinMax) })} suffix="g" />
          <NumberField label="Protein upper" value={s.proteinMax} onChange={(v) => v && set({ proteinMax: Math.max(v, s.proteinMin) })} suffix="g" />
          <NumberField label="Fiber" value={s.fiberGoal} onChange={(v) => v && set({ fiberGoal: v })} suffix="g" />
          <NumberField label="Reading" value={s.readingGoal} onChange={(v) => v && set({ readingGoal: v })} suffix="min" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <NumberField label="Strength / wk" value={s.targets.strength} onChange={(v) => v && set({ targets: { ...s.targets, strength: v } })} />
          <NumberField label="Pilates / wk" value={s.targets.pilates} onChange={(v) => v && set({ targets: { ...s.targets, pilates: v } })} />
          <NumberField label="Cardio / wk" value={s.targets.cardio} onChange={(v) => v && set({ targets: { ...s.targets, cardio: v } })} />
        </div>
        <NumberField label="Streak day threshold" value={s.consistencyThreshold} onChange={(v) => v && set({ consistencyThreshold: Math.min(100, v) })} suffix="%" />
      </section>

      <section className="card space-y-4">
        <SectionTitle>Reminders</SectionTitle>
        <div className="rounded-2xl bg-blush-50 p-3.5 text-xs leading-relaxed text-taupe-700 dark:bg-night-700 dark:text-taupe-200">
          <p className="mb-1 flex items-center gap-1.5 font-semibold"><Icon name="info" className="h-4 w-4" />How reminders work here</p>
          <p>Claude artifacts run inside a secure web page, and they <b>can’t schedule notifications</b> that arrive while the page is closed. Life Tracker gives you two ways around this:</p>
          <p className="mt-1.5">1. <b>In-app reminders.</b> While Life Tracker is open, a reminder card appears at its time, with Snooze and Done. They follow Asia/Riyadh time. A reminder missed by up to an hour still appears when you open the app.</p>
          <p className="mt-1.5">2. <b>Calendar export (recommended for your iPhone).</b> This downloads the reminders you turned on as repeating calendar events in Asia/Riyadh time, each with an alert. Your phone’s Calendar app then sends real notifications. To change one later, edit or delete the event in your calendar.</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-sm font-medium">Reminders {s.remindersOn ? 'on' : 'off'}</p><p className="muted text-xs">Master switch. Everything stays off until you choose.</p></div>
          <Toggle on={s.remindersOn} label="All reminders" onChange={(v) => (v ? setConfirmOn(true) : set({ remindersOn: false }))} />
        </div>
        <div className="space-y-2">
          {s.reminders.map((r) => {
            const paused = isPaused(r, today);
            const sn = snoozedUntil(r.id);
            return (
              <div key={r.id} className={`rounded-2xl p-3 ${r.enabled ? 'bg-cream/80 dark:bg-night-700' : 'bg-cream/40 dark:bg-night-700/50'}`}>
                <div className="flex items-center gap-3">
                  <button className="min-w-0 flex-1 text-left" onClick={() => setEditRem(r)}>
                    <p className={`text-sm font-medium ${r.enabled ? '' : 'text-taupe-400'}`}>{r.label}</p>
                    <p className="muted text-xs">{fmtTime(r.time)} · {r.days.length === 7 ? 'Daily' : r.days.map((d) => DAY_SHORT[d]).join(', ')}{r.repeat ? ` · every ${r.repeat} min ×${r.maxRepeats}` : ''}
                      {paused ? (r.pausedUntil === 'forever' ? ' · paused' : ` · paused until ${r.pausedUntil}`) : ''}{sn && sn > Date.now() ? ' · snoozed' : ''}</p>
                  </button>
                  <Toggle on={r.enabled} label={`Enable ${r.label}`} onChange={(v) => setRem({ ...r, enabled: v })} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost btn-sm" onClick={() => setEditRem({ id: 'r-' + uid(), label: 'New reminder', message: '', kind: 'custom', time: '12:00', days: [0, 1, 2, 3, 4, 5, 6], repeat: 0, maxRepeats: 1, enabled: false })}><Icon name="plus" className="h-4 w-4" />Custom reminder</button>
          <button className="btn-ghost btn-sm" onClick={exportICS} disabled={!enabledRems.length}><Icon name="calendar" className="h-4 w-4" />Export to calendar</button>
          <button className="btn-ghost btn-sm" onClick={askBrowser}><Icon name="bell" className="h-4 w-4" />Try browser notifications</button>
          <button className="btn-ghost btn-sm text-blush-600" onClick={() => setCancelAll(true)}><Icon name="x" className="h-4 w-4" />Cancel all</button>
        </div>
        {!enabledRems.length && <p className="muted text-[11px]">Turn on at least one reminder to export it to your calendar.</p>}
      </section>

      <section className="card space-y-3">
        <SectionTitle>Your data</SectionTitle>
        <div className="rounded-2xl bg-cream/70 p-3.5 text-xs leading-relaxed dark:bg-night-700">
          <p className="mb-1 flex items-center gap-1.5 font-semibold"><Icon name="cloud" className="h-4 w-4" />
            {sync === 'synced' || sync === 'saving' ? 'Saved to your Claude account' : sync === 'connecting' ? 'Connecting…' : sync === 'error' ? 'Sync problem — saved on this device for now' : 'Saved on this device only'}
          </p>
          {sync === 'local' ? (
            <p>Account storage isn’t reachable in this view, for example when you’re signed out or offline. Your entries are kept in this browser only, so they won’t follow you to another device, and clearing browser data would erase them. Export a backup regularly. When account storage connects, data from this device is uploaded automatically.</p>
          ) : (
            <p>Your records are stored privately under your Claude account. Only you can see them, not even people you share the page with, and they sync across devices where you’re signed in. A copy also stays on this device so the app opens instantly. A new day starts at midnight Riyadh time and a new fitness week every Monday. History is never deleted.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost btn-sm" onClick={exportJSON}><Icon name="download" className="h-4 w-4" />Backup (JSON)</button>
          <button className="btn-ghost btn-sm" onClick={exportCSV}><Icon name="download" className="h-4 w-4" />Meals (CSV)</button>
          <button className="btn-ghost btn-sm" onClick={() => setImportOpen(true)}><Icon name="upload" className="h-4 w-4" />Restore backup</button>
          <button className="btn-ghost btn-sm text-blush-600" onClick={() => setReset(true)}><Icon name="trash" className="h-4 w-4" />Erase all</button>
        </div>
      </section>

      <p className="muted pb-2 text-center text-[11px]">Life Tracker · all times in {TZ_LABEL} (UTC+3) · today is {todayStr()}</p>

      {/* Explicit permission before anything is turned on */}
      <Sheet open={confirmOn} onClose={() => setConfirmOn(false)} title="Turn on reminders?">
        <p className="muted mb-3 text-sm">This allows the reminders you switch on individually. Right now, <b>{enabledRems.length}</b> {enabledRems.length === 1 ? 'is' : 'are'} switched on. Nothing else turns on by itself.</p>
        <p className="muted mb-5 text-sm">In-app reminders appear only while Life Tracker is open. For phone notifications, use “Export to calendar”.</p>
        <div className="flex gap-2"><button className="btn-ghost flex-1" onClick={() => setConfirmOn(false)}>Not now</button><button className="btn-primary flex-1" onClick={() => { set({ remindersOn: true }); setConfirmOn(false); toast.push({ title: 'Reminders on' }); }}>Yes, turn on</button></div>
      </Sheet>
      <Confirm open={cancelAll} onClose={() => setCancelAll(false)} title="Cancel all reminders?" confirmLabel="Cancel all" body="Every reminder will be switched off, along with the master switch and any snoozes. Your times and settings are kept. Calendar events you already exported must be removed in your calendar app."
        onConfirm={() => { s.reminders.forEach((r) => clearSnooze(r.id)); updateSettings((x) => ({ ...x, remindersOn: false, reminders: x.reminders.map((r) => ({ ...r, enabled: false })) })); toast.push({ title: 'All reminders cancelled' }); }} />
      <ReminderEditor r={editRem} onClose={() => setEditRem(null)} onSave={setRem} onDelete={(r) => updateSettings((x) => ({ ...x, reminders: x.reminders.filter((y) => y.id !== r.id) }))} today={today} />

      <Sheet open={!!fallback} onClose={() => setFallback(null)} title={fallback?.title ?? ''}>
        <p className="muted mb-2 text-sm">Downloads aren’t available in this view. Copy the text below and save it as a file.</p>
        <textarea readOnly className="input h-48 font-mono text-[11px]" value={fallback?.text ?? ''} onFocus={(e) => e.currentTarget.select()} />
        <button className="btn-primary mt-3 w-full" onClick={async () => { try { await navigator.clipboard.writeText(fallback?.text ?? ''); toast.push({ title: 'Copied' }); } catch { toast.push({ title: 'Copy failed. Select the text and copy it manually.' }); } }}><Icon name="copy" className="h-4 w-4" />Copy</button>
      </Sheet>
      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} onImport={(st) => { replaceAll(st); toast.push({ title: 'Backup restored' }); }} />
      <Confirm open={reset} onClose={() => setReset(false)} title="Erase everything?" confirmLabel="Erase" body="This permanently clears every record and restores the default goals and habits. Consider exporting a backup first." onConfirm={() => replaceAll({ settings: defaultSettings(), days: {} })} />
    </div>
  );
}

function ReminderEditor({ r, onClose, onSave, onDelete, today }: { r: Reminder | null; onClose: () => void; onSave: (r: Reminder) => void; onDelete: (r: Reminder) => void; today: string }) {
  const [x, setX] = useState<Reminder | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  if ((r?.id ?? null) !== lastId) { setLastId(r?.id ?? null); setX(r ? { ...r, days: [...r.days] } : null); }
  if (!x) return null;
  const paused = isPaused(x, today);
  return (
    <Sheet open onClose={onClose} title="Reminder">
      <div className="space-y-4">
        <label className="block"><span className="label">Title</span><input className="input" value={x.label} onChange={(e) => setX({ ...x, label: e.target.value })} /></label>
        <label className="block"><span className="label">Message</span><input className="input" value={x.message} onChange={(e) => setX({ ...x, message: e.target.value })} placeholder="Optional" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="label">Time (Riyadh)</span><input className="input" type="time" value={x.time} onChange={(e) => e.target.value && setX({ ...x, time: e.target.value })} /></label>
          <label className="block"><span className="label">Frequency</span>
            <select className="input" value={x.repeat} onChange={(e) => setX({ ...x, repeat: Number(e.target.value) as Reminder['repeat'], maxRepeats: Number(e.target.value) ? Math.max(2, x.maxRepeats) : 1 })}>
              <option value={0}>Once</option><option value={30}>Every 30 min</option><option value={60}>Every hour</option><option value={120}>Every 2 hours</option>
            </select>
          </label>
        </div>
        {x.repeat > 0 && <NumberField label="Times per day (stops early once done)" value={x.maxRepeats} onChange={(v) => setX({ ...x, maxRepeats: Math.min(8, Math.max(2, v ?? 2)) })} />}
        <div>
          <span className="label">Days</span>
          <div className="flex gap-1.5">{DAY_LETTERS.map((l, i) => { const on = x.days.includes(i); return <button key={i} aria-label={DAY_SHORT[i]} onClick={() => setX({ ...x, days: on ? x.days.filter((d) => d !== i) : [...x.days, i].sort() })} className={`h-10 flex-1 rounded-full text-sm font-medium ${on ? 'bg-blush-500 text-white' : 'bg-cream text-taupe-500 dark:bg-night-700'}`}>{l}</button>; })}</div>
        </div>
        <div>
          <span className="label">Pause</span>
          <div className="flex flex-wrap gap-1.5">
            {paused ? <button className="btn-ghost btn-sm" onClick={() => setX({ ...x, pausedUntil: undefined })}>Resume now</button> : <>
              <button className="btn-ghost btn-sm" onClick={() => setX({ ...x, pausedUntil: today })}>For today</button>
              <button className="btn-ghost btn-sm" onClick={() => setX({ ...x, pausedUntil: addDays(today, 6) })}>For a week</button>
              <button className="btn-ghost btn-sm" onClick={() => setX({ ...x, pausedUntil: 'forever' })}>Until I resume</button>
            </>}
          </div>
          {paused && <p className="muted mt-1 text-xs">{x.pausedUntil === 'forever' ? 'Paused until you resume it.' : `Paused through ${x.pausedUntil}.`}</p>}
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-cream/60 p-3 dark:bg-night-700"><span className="text-sm font-medium">Enabled</span><Toggle on={x.enabled} label="Enabled" onChange={(v) => setX({ ...x, enabled: v })} /></div>
        <div className="flex gap-2">
          {x.kind === 'custom' && <button className="btn-ghost" onClick={() => { onDelete(x); onClose(); }}><Icon name="trash" className="h-4 w-4" />Delete</button>}
          <button className="btn-primary flex-1" disabled={!x.label.trim() || !x.days.length} onClick={() => { onSave({ ...x, label: x.label.trim() }); onClose(); }}>Save</button>
        </div>
      </div>
    </Sheet>
  );
}

function ImportSheet({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: (s: AppState) => void }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const parse = (raw: string) => {
    try {
      const p = JSON.parse(raw);
      if (!p || typeof p !== 'object' || !p.settings || !p.days) throw new Error('This doesn’t look like a Life Tracker backup.');
      const days: AppState['days'] = {};
      for (const [k, v] of Object.entries(p.days)) if (/^\d{4}-\d{2}-\d{2}$/.test(k)) days[k] = normalizeDay(k, v);
      onImport({ settings: normalizeSettings(p.settings), days });
      setText(''); setErr(''); onClose();
    } catch (e: any) { setErr(e?.message || 'Could not read that file.'); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Restore backup">
      <p className="muted mb-3 text-sm">Choose a Life Tracker JSON backup, or paste its contents. This replaces your current data.</p>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) parse(await f.text()); e.target.value = ''; }} />
      <button className="btn-ghost mb-3 w-full" onClick={() => fileRef.current?.click()}><Icon name="upload" className="h-4 w-4" />Choose file</button>
      <textarea className="input h-32 font-mono text-[11px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="…or paste backup JSON here" />
      {err && <p className="mt-2 text-xs text-blush-600">{err}</p>}
      <button className="btn-primary mt-3 w-full" disabled={!text.trim()} onClick={() => parse(text)}>Restore</button>
    </Sheet>
  );
}

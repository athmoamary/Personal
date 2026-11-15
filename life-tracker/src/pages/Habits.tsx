import { useState } from 'react';
import { useStore } from '../lib/store';
import { getDay, habitsForDay, longestStreak, readingMinutes, readingTest, streak } from '../lib/calc';
import { addDays, DAY_LETTERS, DAY_SHORT, fmtTime, monthDays, range, shortDate, weekDays } from '../lib/date';
import { uid } from '../lib/defaults';
import type { Habit } from '../lib/types';
import { BarChart, Confirm, DateNav, Icon, SectionTitle, Segmented, Sheet, Stat, Toggle, useToast } from '../components/ui';
import { HabitRow } from '../components/habits';
import { ReadingTimer } from '../components/reading';

export default function Habits() {
  const { state, today, now } = useStore();
  const [date, setDate] = useState(today);
  const [manage, setManage] = useState<Habit['category'] | null>(null);
  const wellness = habitsForDay(state.settings, date, 'wellness');
  const selfcare = habitsForDay(state.settings, date, 'selfcare');
  const rs = streak(state, today, readingTest(state));
  const weekMin = weekDays(today).reduce((a, d) => a + readingMinutes(getDay(state, d), now), 0);
  const monthMin = monthDays(today).reduce((a, d) => a + readingMinutes(getDay(state, d), now), 0);
  const allDates = Object.keys(state.days).sort();
  const best = allDates.length ? longestStreak(range(allDates[0], today), readingTest(state)) : 0;
  const last7 = range(addDays(today, -6), today).map((d) => { const v = readingMinutes(getDay(state, d), now); return { key: d, label: DAY_LETTERS[new Date(d + 'T00:00:00Z').getUTCDay()], value: v, tip: `${shortDate(d)}: ${v} min${getDay(state, d).reading.book ? ' · ' + getDay(state, d).reading.book : ''}` }; });

  return (
    <div className="space-y-4">
      <header className="px-1"><p className="text-xs font-medium uppercase tracking-[0.2em] text-blush-500">Habits</p><h1 className="h-title">Reading & self-care</h1></header>
      <DateNav date={date} today={today} onChange={setDate} />

      <section className="card">
        <SectionTitle>Daily reading</SectionTitle>
        <ReadingTimer date={date} />
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Stat label="Reading streak" value={`${rs} day${rs === 1 ? '' : 's'}`} sub={`Longest: ${best}`} />
          <Stat label="This week" value={`${weekMin} min`} sub={`This month: ${monthMin} min`} />
        </div>
        <div className="mt-4">
          <p className="label">Last 7 days</p>
          <BarChart data={last7} max={Math.max(state.settings.readingGoal * 1.6, ...last7.map((d) => d.value))} line={state.settings.readingGoal} color="#C06C82" height={110} unit="" />
        </div>
      </section>

      <section className="card">
        <SectionTitle action={<button className="btn-ghost btn-sm" onClick={() => setManage('wellness')}><Icon name="edit" className="h-4 w-4" />Edit</button>}>Wellness routine</SectionTitle>
        {wellness.length ? <div className="space-y-2">{wellness.map((h) => <HabitRow key={h.id} habit={h} date={date} />)}</div> : <p className="muted text-sm">No wellness habits scheduled on this day.</p>}
      </section>

      <section className="card">
        <SectionTitle action={<button className="btn-ghost btn-sm" onClick={() => setManage('selfcare')}><Icon name="edit" className="h-4 w-4" />Customize</button>}>Self-care checklist</SectionTitle>
        {selfcare.length ? <div className="space-y-2">{selfcare.map((h) => <HabitRow key={h.id} habit={h} date={date} />)}</div> : (
          <p className="muted text-sm">Your self-care checklist is empty. Tap <b>Customize</b> to switch on suggestions or add your own.</p>
        )}
      </section>

      <HabitManager category={manage} onClose={() => setManage(null)} />
    </div>
  );
}

function HabitManager({ category, onClose }: { category: Habit['category'] | null; onClose: () => void }) {
  const { state, updateSettings, today } = useStore();
  const toast = useToast();
  const [edit, setEdit] = useState<Habit | null>(null);
  const [del, setDel] = useState<Habit | null>(null);
  if (!category) return null;
  const list = state.settings.habits.filter((h) => h.category === category);
  const upsert = (h: Habit) => updateSettings((s) => ({ ...s, habits: s.habits.some((x) => x.id === h.id) ? s.habits.map((x) => (x.id === h.id ? h : x)) : [...s.habits, h] }));
  return (
    <>
      <Sheet open={!edit} onClose={onClose} title={category === 'wellness' ? 'Wellness routine' : 'Self-care checklist'}>
        <div className="space-y-2">
          {list.map((h) => (
            <div key={h.id} className="flex items-center gap-3 rounded-2xl bg-cream/60 p-3 dark:bg-night-700">
              <button className="min-w-0 flex-1 text-left" onClick={() => setEdit(h)}>
                <p className={`text-sm font-medium ${h.enabled ? '' : 'text-taupe-400'}`}>{h.name}</p>
                <p className="muted text-xs">{h.time ? fmtTime(h.time) : 'Any time'} · {h.days.length === 7 ? 'Every day' : h.days.map((d) => DAY_SHORT[d]).join(', ')}{h.conditional ? ' · conditional' : ''}</p>
              </button>
              <Toggle on={h.enabled} label={`Enable ${h.name}`} onChange={(v) => upsert({ ...h, enabled: v, startDate: v && !h.enabled ? today : h.startDate })} />
            </div>
          ))}
          <button className="btn-ghost w-full" onClick={() => setEdit({ id: uid(), name: '', days: [0, 1, 2, 3, 4, 5, 6], conditional: false, enabled: true, category, startDate: today })}><Icon name="plus" className="h-4 w-4" />Add habit</button>
          <p className="muted pt-1 text-[11px]">Habits that are switched off never affect your scores. A new or re-enabled habit counts from today only, so past days are never marked as missed.</p>
        </div>
      </Sheet>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit && list.some((x) => x.id === edit.id) ? 'Edit habit' : 'New habit'}>
        {edit && (
          <div className="space-y-4">
            <label className="block"><span className="label">Habit</span><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Stretch before bed" /></label>
            <label className="block"><span className="label">Time (optional)</span><input className="input" type="time" value={edit.time ?? ''} onChange={(e) => setEdit({ ...edit, time: e.target.value || undefined })} /></label>
            <div>
              <span className="label">Days</span>
              <div className="flex gap-1.5">
                {DAY_LETTERS.map((l, i) => {
                  const on = edit.days.includes(i);
                  return <button key={i} aria-label={DAY_SHORT[i]} onClick={() => setEdit({ ...edit, days: on ? edit.days.filter((x) => x !== i) : [...edit.days, i].sort() })} className={`h-10 flex-1 rounded-full text-sm font-medium transition ${on ? 'bg-blush-500 text-white' : 'bg-cream text-taupe-500 dark:bg-night-700'}`}>{l}</button>;
                })}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream/60 p-3 dark:bg-night-700">
              <div><p className="text-sm font-medium">Conditional</p><p className="muted text-xs">Adds a “Not needed” option that never counts as missed.</p></div>
              <Toggle on={edit.conditional} label="Conditional" onChange={(v) => setEdit({ ...edit, conditional: v })} />
            </div>
            <div><span className="label">List</span><Segmented value={edit.category} onChange={(c) => setEdit({ ...edit, category: c })} size="sm" options={[{ value: 'wellness', label: 'Wellness routine' }, { value: 'selfcare', label: 'Self-care' }]} /></div>
            <div className="flex gap-2">
              {state.settings.habits.some((x) => x.id === edit.id) && <button className="btn-ghost" onClick={() => setDel(edit)}><Icon name="trash" className="h-4 w-4" />Delete</button>}
              <button className="btn-primary flex-1" disabled={!edit.name.trim() || !edit.days.length} onClick={() => { upsert({ ...edit, name: edit.name.trim() }); toast.push({ title: 'Habit saved' }); setEdit(null); }}>Save</button>
            </div>
          </div>
        )}
      </Sheet>
      <Confirm open={!!del} onClose={() => setDel(null)} title="Delete habit?" body="It will disappear from your checklist and from future scores. To keep its history visible in Insights, switch it off instead." onConfirm={() => { if (del) { updateSettings((s) => ({ ...s, habits: s.habits.filter((x) => x.id !== del.id), reminders: s.reminders.filter((r) => r.habitId !== del.id) })); setEdit(null); } }} />
    </>
  );
}

import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { getDay, nutritionStats, pct, round1, totals } from '../lib/calc';
import { addDays, monthDays, monthName, range, shortDate, weekDays } from '../lib/date';
import { uid } from '../lib/defaults';
import type { Meal, MealType } from '../lib/types';
import { BarChart, Confirm, DateNav, Icon, NumberField, Segmented, Sheet, SectionTitle, Stat, useToast } from '../components/ui';
import { ProteinFiber } from '../components/nutrition';

const MEALS: { v: MealType; l: string }[] = [{ v: 'breakfast', l: 'Breakfast' }, { v: 'lunch', l: 'Lunch' }, { v: 'dinner', l: 'Dinner' }, { v: 'snack', l: 'Snacks' }];

export default function Nutrition() {
  const { state, today, updateDay } = useStore();
  const toast = useToast();
  const [date, setDate] = useState(today);
  const [edit, setEdit] = useState<Meal | null>(null);
  const [del, setDel] = useState<Meal | null>(null);
  const day = getDay(state, date);
  const t = totals(day);
  const st = state.settings;

  const saveMeal = (m: Meal) => {
    updateDay(date, (d) => ({ ...d, meals: d.meals.some((x) => x.id === m.id) ? d.meals.map((x) => (x.id === m.id ? m : x)) : [...d.meals, m] }));
    toast.push({ title: 'Meal saved', body: `${round1(m.protein)} g protein · ${round1(m.fiber)} g fiber` });
  };

  const last14 = range(addDays(today, -13), today);
  const week = weekDays(today).filter((d) => d <= today);
  const month = monthDays(today).filter((d) => d <= today);
  const last30 = range(addDays(today, -29), today);
  const ws = nutritionStats(state, week);
  const ms = nutritionStats(state, month);
  const s30 = nutritionStats(state, last30);
  const chart = (k: 'protein' | 'fiber') => last14.map((d) => {
    const dd = getDay(state, d);
    const v = totals(dd)[k];
    return { key: d, label: String(Number(d.slice(8))), value: v, muted: dd.meals.length === 0, tip: dd.meals.length ? `${shortDate(d)}: ${round1(v)} g` : `${shortDate(d)}: not logged` };
  });

  // Your own past foods, for quick re-adding (values come only from what you logged before).
  const recentFoods = useMemo(() => {
    const seen = new Map<string, Meal>();
    Object.values(state.days).sort((a, b) => b.date.localeCompare(a.date)).forEach((d) => d.meals.forEach((m) => { const k = m.name.trim().toLowerCase(); if (k && !seen.has(k)) seen.set(k, m); }));
    return [...seen.values()].slice(0, 12);
  }, [state.days]);

  return (
    <div className="space-y-4">
      <header className="px-1"><p className="text-xs font-medium uppercase tracking-[0.2em] text-blush-500">Nutrition</p><h1 className="h-title">Protein & fiber first</h1></header>
      <DateNav date={date} today={today} onChange={setDate} />

      <section className="card">
        <ProteinFiber date={date} large />
        <button className="btn-primary mt-5 w-full" onClick={() => setEdit({ id: uid(), meal: guessMeal(), name: '', protein: 0, fiber: 0, createdAt: Date.now() })}><Icon name="plus" className="h-4 w-4" />Add meal</button>
      </section>

      <section className="card">
        <SectionTitle>Meals</SectionTitle>
        {day.meals.length === 0 && <p className="muted text-sm">Nothing logged for this day yet.</p>}
        <div className="space-y-4">
          {MEALS.map(({ v, l }) => {
            const list = day.meals.filter((m) => m.meal === v);
            if (!list.length) return null;
            return (
              <div key={v}>
                <p className="label">{l}</p>
                <div className="space-y-1.5">
                  {list.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 rounded-2xl bg-cream/60 p-3 dark:bg-night-700">
                      <button className="min-w-0 flex-1 text-left" onClick={() => setEdit(m)}>
                        <p className="truncate text-sm font-medium">{m.name || 'Meal'}</p>
                        <p className="muted text-xs"><b className="font-medium text-blush-600 dark:text-blush-300">{round1(m.protein)} g protein</b> · <b className="font-medium text-sage-600 dark:text-sage-300">{round1(m.fiber)} g fiber</b>{m.calories ? ` · ${m.calories} kcal` : ''}{m.carbs ? ` · ${m.carbs} g carbs` : ''}{m.fat ? ` · ${m.fat} g fat` : ''}</p>
                      </button>
                      <button className="icon-btn" onClick={() => setEdit(m)} aria-label="Edit"><Icon name="edit" className="h-4 w-4" /></button>
                      <button className="icon-btn" onClick={() => setDel(m)} aria-label="Delete"><Icon name="trash" className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {day.meals.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-taupe-100 pt-3 text-center text-xs dark:border-night-600 sm:grid-cols-5">
            <div><p className="muted">Protein</p><p className="font-semibold">{round1(t.protein)} g</p></div>
            <div><p className="muted">Fiber</p><p className="font-semibold">{round1(t.fiber)} g</p></div>
            <div><p className="muted">Calories</p><p className="font-semibold">{t.calories ? round1(t.calories) : '—'}</p></div>
            <div><p className="muted">Carbs</p><p className="font-semibold">{t.carbs ? `${round1(t.carbs)} g` : '—'}</p></div>
            <div><p className="muted">Fat</p><p className="font-semibold">{t.fat ? `${round1(t.fat)} g` : '—'}</p></div>
          </div>
        )}
      </section>

      <section className="card">
        <SectionTitle>Last 14 days</SectionTitle>
        <p className="mb-1 text-sm font-medium">Protein <span className="muted text-xs font-normal">· shaded band = {st.proteinMin}–{st.proteinMax} g</span></p>
        <BarChart data={chart('protein')} max={Math.max(st.proteinMax * 1.25, ...chart('protein').map((d) => d.value))} band={[st.proteinMin, st.proteinMax]} color="#C06C82" />
        <p className="mb-1 mt-4 text-sm font-medium">Fiber <span className="muted text-xs font-normal">· dashed line = {st.fiberGoal} g</span></p>
        <BarChart data={chart('fiber')} max={Math.max(st.fiberGoal * 1.5, ...chart('fiber').map((d) => d.value))} line={st.fiberGoal} color="#6C8F64" />
        <p className="muted mt-1 text-[11px]">Tap a bar for its value. Faded days have nothing logged.</p>
      </section>

      <section className="card">
        <SectionTitle>Consistency</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Avg protein · week" value={ws.trackedDays ? `${Math.round(ws.avgProtein)} g` : '—'} sub={`${ws.trackedDays} logged day${ws.trackedDays === 1 ? '' : 's'}`} />
          <Stat label="Avg fiber · week" value={ws.trackedDays ? `${round1(ws.avgFiber)} g` : '—'} sub={`${ws.trackedDays} logged day${ws.trackedDays === 1 ? '' : 's'}`} />
          <Stat label="Protein goal · 30d" value={pct(s30.proteinMetPct)} sub={`${s30.pMet} of ${s30.trackedDays} logged days`} />
          <Stat label="Fiber goal · 30d" value={pct(s30.fiberMetPct)} sub={`${s30.fMet} of ${s30.trackedDays} logged days`} />
        </div>
        <div className="mt-3 rounded-2xl bg-cream/70 p-3 text-sm dark:bg-night-700">
          <p className="font-medium">{monthName(today)}</p>
          <p className="muted text-xs">Logged {ms.trackedDays} of {month.length} days · protein goal met on {ms.pMet} · fiber goal met on {ms.fMet} · avg {Math.round(ms.avgProtein)} g protein, {round1(ms.avgFiber)} g fiber</p>
        </div>
        <p className="muted mt-2 text-[11px]">Averages and goal rates use the days you logged, so a day you forgot to log doesn’t drag the average down.</p>
      </section>

      <MealForm meal={edit} onClose={() => setEdit(null)} onSave={saveMeal} recent={recentFoods} />
      <Confirm open={!!del} onClose={() => setDel(null)} title="Delete meal?" body={`Remove “${del?.name || 'this meal'}” from ${shortDate(date)}?`} onConfirm={() => del && updateDay(date, (d) => ({ ...d, meals: d.meals.filter((x) => x.id !== del.id) }))} />
    </div>
  );
}

function guessMeal(): MealType {
  const h = new Date(Date.now() + 3 * 3600000).getUTCHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

function MealForm({ meal, onClose, onSave, recent }: { meal: Meal | null; onClose: () => void; onSave: (m: Meal) => void; recent: Meal[] }) {
  const [m, setM] = useState<Meal | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [protein, setProtein] = useState<number | undefined>();
  const [fiber, setFiber] = useState<number | undefined>();
  if ((meal?.id ?? null) !== lastId) {
    setLastId(meal?.id ?? null);
    setM(meal ? { ...meal } : null);
    const isNew = meal && !meal.name && !meal.protein && !meal.fiber;
    setProtein(isNew ? undefined : meal?.protein);
    setFiber(isNew ? undefined : meal?.fiber);
  }
  if (!m) return null;
  const valid = protein !== undefined && fiber !== undefined;
  return (
    <Sheet open onClose={onClose} title="Meal">
      <div className="space-y-4">
        <Segmented value={m.meal} onChange={(v) => setM({ ...m, meal: v })} size="sm" options={MEALS.map((x) => ({ value: x.v, label: x.l }))} />
        <label className="block"><span className="label">What did you eat?</span><input className="input" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} placeholder="e.g. Greek yogurt with oats" /></label>
        {recent.length > 0 && !m.name && (
          <div>
            <span className="label">From your past entries</span>
            <div className="flex flex-wrap gap-1.5">
              {recent.map((r) => (
                <button key={r.id} className="chip border border-taupe-200 dark:border-night-500" onClick={() => { setM({ ...m, name: r.name, calories: r.calories, carbs: r.carbs, fat: r.fat }); setProtein(r.protein); setFiber(r.fiber); }}>
                  {r.name} · {round1(r.protein)}P/{round1(r.fiber)}F
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Protein" value={protein} step={0.1} onChange={setProtein} suffix="g" placeholder="0" />
          <NumberField label="Fiber" value={fiber} step={0.1} onChange={setFiber} suffix="g" placeholder="0" />
        </div>
        <details className="rounded-2xl bg-cream/60 p-3 dark:bg-night-700" open={!!(m.calories || m.carbs || m.fat)}>
          <summary className="cursor-pointer text-sm font-medium">Optional: calories, carbs, fat</summary>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <NumberField label="Calories" value={m.calories} onChange={(v) => setM({ ...m, calories: v })} />
            <NumberField label="Carbs" value={m.carbs} step={0.1} onChange={(v) => setM({ ...m, carbs: v })} suffix="g" />
            <NumberField label="Fat" value={m.fat} step={0.1} onChange={(v) => setM({ ...m, fat: v })} suffix="g" />
          </div>
        </details>
        <p className="muted text-[11px]">Enter values from a label, recipe or app you trust. Life Tracker never guesses nutrition values.</p>
        <button className="btn-primary w-full" disabled={!valid} onClick={() => { onSave({ ...m, name: m.name.trim(), protein: protein ?? 0, fiber: fiber ?? 0 }); onClose(); }}>Save meal</button>
      </div>
    </Sheet>
  );
}

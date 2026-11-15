import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { addMonths, dow, longDate, monthDays, monthName, monthStart, relDay, shortDate } from '../lib/date';
import { JOURNAL_SECTIONS, PROMPTS, type JournalSection } from '../lib/frequency';
import { hasJournal, journalCount } from '../lib/fmcalc';
import { DateNav, Icon, SectionTitle } from '../components/ui';
import { JournalField, Stars } from '../components/frequency';

export default function Journal({ go }: { go: (r: string) => void }) {
  const { state, today } = useStore();
  const [date, setDate] = useState(today);
  const [filter, setFilter] = useState<JournalSection | 'all'>('all');
  const [q, setQ] = useState('');
  const [month, setMonth] = useState(monthStart(today));
  const [showCal, setShowCal] = useState(false);

  const query = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!query) return [];
    const out: { date: string; prompt: string; section: string; text: string }[] = [];
    Object.keys(state.days).sort().reverse().forEach((d) => {
      const j = state.days[d].journal;
      if (!j) return;
      PROMPTS.forEach((p) => {
        const t = j[p.id];
        if (t && t.toLowerCase().includes(query) && (filter === 'all' || p.section === filter)) out.push({ date: d, prompt: p.q, section: p.section, text: t });
      });
    });
    return out;
  }, [query, filter, state.days]);

  const recent = Object.keys(state.days).filter((d) => hasJournal(state.days[d])).sort().reverse().slice(0, 6);
  const mdays = monthDays(month);
  const lead = dow(mdays[0]);
  const sections = JOURNAL_SECTIONS.filter((s) => filter === 'all' || s.id === filter);

  return (
    <div className="space-y-4">
      <header className="relative px-1">
        <Stars className="absolute -top-1 right-0 h-10 w-32" />
        <button className="mb-1 flex items-center gap-1 text-xs font-medium text-lavender-500" onClick={() => go('frequency')}><Icon name="left" className="h-3.5 w-3.5" />Frequency Maxxing</button>
        <h1 className="h-title">Journal & reflection</h1>
        <p className="muted text-sm">Saves as you type. Stays private to you.</p>
      </header>

      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-taupe-400"><Icon name="book" className="h-4 w-4" /></span>
        <input className="input pl-10" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your journal…" aria-label="Search journal" />
      </div>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {[{ id: 'all', title: 'All' }, ...JOURNAL_SECTIONS].map((s) => (
          <button key={s.id} onClick={() => setFilter(s.id as any)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${filter === s.id ? 'bg-lavender-500 text-white' : 'bg-cream text-taupe-600 dark:bg-night-700 dark:text-taupe-200'}`}>{s.title}</button>
        ))}
      </div>

      {query ? (
        <section className="card">
          <SectionTitle>{results.length} result{results.length === 1 ? '' : 's'}</SectionTitle>
          <div className="space-y-2">
            {results.map((r, i) => (
              <button key={i} className="block w-full rounded-2xl bg-cream/60 p-3 text-left dark:bg-night-700" onClick={() => { setDate(r.date); setQ(''); }}>
                <p className="text-xs font-medium text-lavender-600 dark:text-lavender-300">{relDay(r.date, today)} · {JOURNAL_SECTIONS.find((s) => s.id === r.section)?.title}</p>
                <p className="muted text-xs">{r.prompt}</p>
                <p className="mt-0.5 line-clamp-2 text-sm">{r.text}</p>
              </button>
            ))}
            {!results.length && <p className="muted text-sm">Nothing found.</p>}
          </div>
        </section>
      ) : (
        <>
          <DateNav date={date} today={today} onChange={setDate} />
          <button className="btn-ghost btn-sm" onClick={() => { setShowCal(!showCal); setMonth(monthStart(date)); }}><Icon name="calendar" className="h-4 w-4" />{showCal ? 'Hide calendar' : 'Browse by calendar'}</button>
          {showCal && (
            <section className="card">
              <div className="mb-2 flex items-center justify-between">
                <button className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month"><Icon name="left" /></button>
                <span className="text-sm font-medium">{monthName(month)}</span>
                <button className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month"><Icon name="right" /></button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((l, i) => <span key={i} className="muted text-[10px]">{l}</span>)}
                {Array.from({ length: lead }, (_, i) => <span key={'x' + i} />)}
                {mdays.map((d) => {
                  const n = state.days[d] ? journalCount(state.days[d]) : 0;
                  return (
                    <button key={d} disabled={d > today} onClick={() => { setDate(d); setShowCal(false); }} className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs transition disabled:opacity-30 ${d === date ? 'bg-lavender-500 text-white' : 'hover:bg-cream dark:hover:bg-night-700'}`}>
                      {Number(d.slice(8))}
                      {n > 0 && <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${d === date ? 'bg-white' : 'bg-lavender-400'}`} />}
                    </button>
                  );
                })}
              </div>
              <p className="muted mt-2 text-[11px]">Dots mark days with entries.</p>
            </section>
          )}
          <p className="px-1 font-display text-lg font-semibold">{longDate(date)}</p>
          {sections.map((s) => (
            <section key={s.id} className="card">
              <SectionTitle>{s.title}</SectionTitle>
              <div className="space-y-3">{PROMPTS.filter((p) => p.section === s.id).map((p) => <JournalField key={p.id + date} date={date} id={p.id} short={p.short} />)}</div>
            </section>
          ))}
          {recent.length > 0 && (
            <section className="card">
              <SectionTitle>Recent entries</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((d) => <button key={d} onClick={() => setDate(d)} className={`chip border ${d === date ? 'border-transparent bg-lavender-500 text-white' : 'border-taupe-200 dark:border-night-500'}`}>{shortDate(d)} · {journalCount(state.days[d])}</button>)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

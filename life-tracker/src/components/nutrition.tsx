import { useStore } from '../lib/store';
import { totals, round1 } from '../lib/calc';
import { Bar } from './ui';

export function proteinStatus(p: number, min: number, max: number) {
  if (p >= max) return { tone: 'upper' as const, text: p > max ? `Upper target reached · ${round1(p - max)} g above — no problem` : 'Upper target reached' };
  if (p >= min) return { tone: 'min' as const, text: `Minimum reached ✓ · ${round1(max - p)} g to the upper end` };
  return { tone: 'below' as const, text: `${round1(min - p)} g to reach ${min} g` };
}

export function ProteinFiber({ date, large }: { date: string; large?: boolean }) {
  const { day, state } = useStore();
  const st = state.settings;
  const t = totals(day(date));
  const ps = proteinStatus(t.protein, st.proteinMin, st.proteinMax);
  const scale = st.proteinMax * 1.15;
  const fiberMet = t.fiber >= st.fiberGoal;
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-sm font-medium">Protein</span>
          <span className={`font-display ${large ? 'text-3xl' : 'text-2xl'} font-semibold tabular-nums`}>{round1(t.protein)}<span className="muted ml-1 font-sans text-sm font-normal">/ {st.proteinMin}–{st.proteinMax} g</span></span>
        </div>
        <div className="relative">
          <Bar value={t.protein / scale} className={large ? 'h-4' : 'h-3'} color={ps.tone === 'below' ? 'bg-blush-400' : ps.tone === 'min' ? 'bg-sage-400' : 'bg-sage-600'} />
          {/* target range band */}
          <div className="pointer-events-none absolute inset-y-0 rounded-full border-2 border-sage-500/60" style={{ left: `${(st.proteinMin / scale) * 100}%`, width: `${((st.proteinMax - st.proteinMin) / scale) * 100}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-xs">
          <span className={ps.tone === 'below' ? 'muted' : 'font-medium text-sage-600 dark:text-sage-300'}>{ps.text}</span>
          <span className="muted">range {st.proteinMin}–{st.proteinMax}</span>
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-sm font-medium">Fiber</span>
          <span className={`font-display ${large ? 'text-3xl' : 'text-2xl'} font-semibold tabular-nums`}>{round1(t.fiber)}<span className="muted ml-1 font-sans text-sm font-normal">/ {st.fiberGoal} g</span></span>
        </div>
        <Bar value={t.fiber / st.fiberGoal} className={large ? 'h-4' : 'h-3'} color={fiberMet ? 'bg-sage-600' : 'bg-blush-400'} />
        <p className={`mt-1 text-xs ${fiberMet ? 'font-medium text-sage-600 dark:text-sage-300' : 'muted'}`}>{fiberMet ? `Goal reached ✓${t.fiber > st.fiberGoal ? ` · ${round1(t.fiber - st.fiberGoal)} g extra` : ''}` : `${round1(st.fiberGoal - t.fiber)} g remaining`}</p>
      </div>
    </div>
  );
}

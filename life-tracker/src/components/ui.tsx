import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { addDays, relDay } from '../lib/date';

const P = (d: string) => <path d={d} />;
const ICONS: Record<string, ReactNode> = {
  home: <>{P('M3 10.5 12 3l9 7.5')}{P('M5 9.5V20h14V9.5')}{P('M10 20v-5h4v5')}</>,
  fitness: <>{P('M6.5 6.5v11')}{P('M17.5 6.5v11')}{P('M3.5 9v6')}{P('M20.5 9v6')}{P('M6.5 12h11')}</>,
  nutrition: <>{P('M12 21c-4.5 0-7.5-3.5-7.5-8 0-3 2-5.5 4.5-5.5 1.3 0 2.2.6 3 .6s1.7-.6 3-.6c2.5 0 4.5 2.5 4.5 5.5 0 4.5-3 8-7.5 8Z')}{P('M12 7.5c0-2 1-3.5 3-4.5')}</>,
  habits: <>{P('M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z')}</>,
  insights: <>{P('M4 20V10')}{P('M10 20V4')}{P('M16 20v-7')}{P('M21 20H3')}</>,
  settings: <>{P('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z')}{P('M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z')}</>,
  calendar: <>{P('M4 6h16v14H4z')}{P('M4 10h16')}{P('M8 3v4')}{P('M16 3v4')}</>,
  check: <>{P('m5 12.5 4.5 4.5L19 7.5')}</>,
  plus: <>{P('M12 5v14')}{P('M5 12h14')}</>,
  x: <>{P('M6 6l12 12')}{P('M18 6 6 18')}</>,
  left: <>{P('m15 5-7 7 7 7')}</>,
  right: <>{P('m9 5 7 7-7 7')}</>,
  bell: <>{P('M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15Z')}{P('M10 20.5a2 2 0 0 0 4 0')}</>,
  book: <>{P('M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z')}{P('M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5')}</>,
  play: <>{P('M8 5v14l11-7Z')}</>,
  pause: <>{P('M8 5v14')}{P('M16 5v14')}</>,
  reset: <>{P('M4 12a8 8 0 1 0 2.3-5.6')}{P('M4 4v4h4')}</>,
  edit: <>{P('M4 20h4L19 9l-4-4L4 16Z')}{P('m14 6 4 4')}</>,
  trash: <>{P('M4 7h16')}{P('M9 7V4h6v3')}{P('M6 7l1 13h10l1-13')}</>,
  moon: <>{P('M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5Z')}</>,
  sun: <>{P('M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z')}{P('M12 2v2')}{P('M12 20v2')}{P('m4.9 4.9 1.4 1.4')}{P('m17.7 17.7 1.4 1.4')}{P('M2 12h2')}{P('M20 12h2')}{P('m4.9 19.1 1.4-1.4')}{P('m17.7 6.3 1.4-1.4')}</>,
  flame: <>{P('M12 22c4 0 7-2.7 7-6.8 0-4-3-6.2-4-9.2-.6 2-1.6 3-3 3.5.4-2.6-.6-5.5-3-7.5.2 3.5-4 6.5-4 12.5C5 19.3 8 22 12 22Z')}</>,
  trophy: <>{P('M8 4h8v5a4 4 0 0 1-8 0Z')}{P('M8 6H5a3 3 0 0 0 3 4')}{P('M16 6h3a3 3 0 0 1-3 4')}{P('M12 13v4')}{P('M8 21h8')}{P('M9 17h6v4H9z')}</>,
  move: <>{P('M5 12h14')}{P('m15 8 4 4-4 4')}</>,
  download: <>{P('M12 4v11')}{P('m7 10 5 5 5-5')}{P('M5 20h14')}</>,
  upload: <>{P('M12 20V9')}{P('m7 14 5-5 5 5')}{P('M5 4h14')}</>,
  copy: <>{P('M9 9h11v11H9z')}{P('M5 15H4V4h11v1')}</>,
  sparkle: <>{P('M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z')}</>,
  cloud: <>{P('M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.6A3.8 3.8 0 0 1 17.5 18Z')}</>,
  info: <>{P('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z')}{P('M12 11v5')}{P('M12 7.5v.5')}</>,
  clock: <>{P('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z')}{P('M12 7v5l3 2')}</>,
};
export function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.7 }: { name: keyof typeof ICONS | string; className?: string; strokeWidth?: number }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{ICONS[name]}</svg>;
}

export function Ring({ value, size = 120, stroke = 10, color = '#C06C82', track, children, label }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={track ? '' : 'stroke-taupe-100 dark:stroke-night-600'} stroke={track} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: 'stroke-dashoffset .7s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function Bar({ value, color = 'bg-sage-500', className = 'h-2.5', marker }: { value: number; color?: string; className?: string; marker?: number }) {
  return (
    <div className={`relative w-full overflow-hidden rounded-full bg-taupe-100 dark:bg-night-600 ${className}`}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, transition: 'width .6s cubic-bezier(.2,.8,.2,1)' }} />
      {marker !== undefined && <div className="absolute inset-y-0 w-0.5 bg-white/90 dark:bg-night-900" style={{ left: `${marker * 100}%` }} />}
    </div>
  );
}

export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-40 ${on ? 'bg-sage-500' : 'bg-taupe-200 dark:bg-night-500'}`}>
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, size = 'md' }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  return (
    <div className="flex w-full gap-1 rounded-full bg-cream dark:bg-night-700 p-1">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`flex-1 rounded-full ${size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} font-medium transition ${value === o.value ? 'bg-white dark:bg-night-500 text-taupe-800 dark:text-white shadow-sm' : 'text-taupe-500 dark:text-taupe-300'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-taupe-900/30 backdrop-blur-[2px] animate-rise" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-ivory dark:bg-night-800 p-5 pb-8 safe-bottom shadow-2xl animate-rise">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-taupe-200 dark:bg-night-500 sm:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="h-card">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Confirm({ open, title, body, confirmLabel = 'Delete', onConfirm, onClose }: { open: boolean; title: string; body: string; confirmLabel?: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="muted mb-5 text-sm">{body}</p>
      <div className="flex gap-2"><button className="btn-ghost flex-1" onClick={onClose}>Cancel</button><button className="btn-primary flex-1" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button></div>
    </Sheet>
  );
}

export function DateNav({ date, today, onChange, allowFuture = false }: { date: string; today: string; onChange: (d: string) => void; allowFuture?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-full bg-cream dark:bg-night-700 p-1">
      <button className="icon-btn" onClick={() => onChange(addDays(date, -1))} aria-label="Previous day"><Icon name="left" /></button>
      <button className="text-sm font-medium" onClick={() => onChange(today)}>{relDay(date, today)}{date !== today && <span className="ml-2 text-xs text-blush-500">Back to today</span>}</button>
      <button className="icon-btn" disabled={!allowFuture && date >= today} onClick={() => onChange(addDays(date, 1))} aria-label="Next day"><Icon name="right" className={`h-5 w-5 ${!allowFuture && date >= today ? 'opacity-30' : ''}`} /></button>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="mb-3 flex items-center justify-between gap-2"><h3 className="h-card">{children}</h3>{action}</div>;
}

export function NumberField({ label, value, onChange, suffix, step = 1, placeholder, min = 0 }: { label: string; value: number | undefined | ''; onChange: (v: number | undefined) => void; suffix?: string; step?: number; placeholder?: string; min?: number }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <input className="input pr-10" type="number" inputMode="decimal" step={step} min={min} placeholder={placeholder} value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Math.max(min, Number(e.target.value)))} />
        {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-taupe-400">{suffix}</span>}
      </div>
    </label>
  );
}

// ---------- Toasts ----------
export interface ToastAction { label: string; onClick: () => void }
interface Toast { id: number; title: string; body?: string; actions?: ToastAction[]; tone?: 'default' | 'reminder'; sticky?: boolean }
const ToastCtx = createContext<{ push: (t: Omit<Toast, 'id'>) => number; dismiss: (id: number) => void } | null>(null);
export const useToast = () => useContext(ToastCtx)!;
export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setList((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setList((l) => [...l.slice(-3), { ...t, id }]);
    if (!t.sticky) setTimeout(() => dismiss(id), 3200);
    return id;
  }, [dismiss]);
  return (
    <ToastCtx.Provider value={{ push, dismiss }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 p-3 safe-top" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={`pointer-events-auto w-full max-w-md rounded-3xl border p-4 shadow-xl animate-rise ${t.tone === 'reminder' ? 'border-blush-200 bg-blush-50 dark:border-blush-700 dark:bg-night-700' : 'border-taupe-100 bg-white dark:border-night-500 dark:bg-night-700'}`}>
            <div className="flex items-start gap-3">
              {t.tone === 'reminder' && <span className="mt-0.5 text-blush-500"><Icon name="bell" /></span>}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.body && <p className="muted mt-0.5 text-sm">{t.body}</p>}
                {t.actions && <div className="mt-2.5 flex flex-wrap gap-1.5">{t.actions.map((a) => <button key={a.label} className="btn-ghost btn-sm" onClick={() => { a.onClick(); dismiss(t.id); }}>{a.label}</button>)}</div>}
              </div>
              <button className="icon-btn -m-1.5 h-8 w-8" onClick={() => dismiss(t.id)} aria-label="Dismiss"><Icon name="x" className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Simple accessible bar chart with hover/tap tooltip ----------
export interface BarDatum { key: string; label: string; value: number; tip: string; muted?: boolean }
export function BarChart({ data, max, band, line, color = '#6C8F64', height = 140, unit = '' }: { data: BarDatum[]; max: number; band?: [number, number]; line?: number; color?: string; height?: number; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 320, H = height, padB = 18, padT = 6;
  const plotH = H - padB - padT;
  const y = (v: number) => padT + plotH - (Math.min(v, max) / max) * plotH;
  const bw = W / Math.max(1, data.length);
  const gap = Math.min(6, bw * 0.3);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Chart" onMouseLeave={() => setHover(null)}>
        <line x1={0} x2={W} y1={y(0)} y2={y(0)} className="stroke-taupe-200 dark:stroke-night-500" strokeWidth={1} />
        {band && <rect x={0} width={W} y={y(band[1])} height={y(band[0]) - y(band[1])} className="fill-sage-100 dark:fill-sage-700/25" />}
        {line !== undefined && <line x1={0} x2={W} y1={y(line)} y2={y(line)} className="stroke-sage-500" strokeDasharray="3 3" strokeWidth={1} />}
        {data.map((d, i) => {
          const top = y(d.value);
          const h = Math.max(0, y(0) - top);
          const x = i * bw + gap / 2;
          const w = bw - gap;
          const rr = Math.min(4, w / 2, h);
          return (
            <g key={d.key} onMouseEnter={() => setHover(i)} onClick={() => setHover(hover === i ? null : i)} className="cursor-pointer">
              <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
              {h > 0 && <path d={`M${x},${y(0)} V${top + rr} Q${x},${top} ${x + rr},${top} H${x + w - rr} Q${x + w},${top} ${x + w},${top + rr} V${y(0)} Z`} fill={color} opacity={d.muted ? 0.35 : hover === null || hover === i ? 1 : 0.55} />}
              <text x={i * bw + bw / 2} y={H - 4} textAnchor="middle" className="fill-taupe-400" fontSize={9}>{d.label}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && data[hover] && (
        <div className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-taupe-800 px-2.5 py-1.5 text-xs text-white shadow-lg dark:bg-taupe-100 dark:text-taupe-900"
          style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}>{data[hover].tip}{unit}</div>
      )}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-cream/70 dark:bg-night-700 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-taupe-500 dark:text-taupe-300">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-semibold leading-tight">{value}</p>
      {sub && <p className="muted text-xs">{sub}</p>}
    </div>
  );
}

export function Collapsible({ title, subtitle, open: initial = false, children, right, tone = 'card' }: { title: ReactNode; subtitle?: ReactNode; open?: boolean; children: ReactNode; right?: ReactNode; tone?: 'card' | 'lav' | 'plain' }) {
  const [open, setOpen] = useState(initial);
  const cls = tone === 'lav' ? 'card-lav' : tone === 'card' ? 'card' : '';
  return (
    <section className={cls}>
      <div className="flex items-center gap-2">
        <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="min-w-0 flex-1">
            <span className="h-card block">{title}</span>
            {subtitle && <span className="muted block text-xs">{subtitle}</span>}
          </span>
          <span className={`text-taupe-400 transition-transform duration-300 ${open ? 'rotate-90' : ''}`}><Icon name="right" className="h-4 w-4" /></span>
        </button>
        {right}
      </div>
      <div className={`grid transition-all duration-300 ease-out ${open ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0 overflow-hidden">{open && children}</div>
      </div>
    </section>
  );
}

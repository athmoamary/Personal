import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppState, DayRecord, Settings } from './types';
import { defaultSettings, emptyDay, normalizeDay, normalizeSettings } from './defaults';
import { todayStr } from './date';

declare global { interface Window { claude?: { use: (name: string) => Promise<any> } } }

export type SyncStatus = 'connecting' | 'synced' | 'saving' | 'local' | 'error';

const CACHE_KEY = 'life-tracker-cache-v1';
const readCache = (): AppState | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    const days: Record<string, DayRecord> = {};
    for (const [k, v] of Object.entries(p.days || {})) days[k] = normalizeDay(k, v);
    return { settings: normalizeSettings(p.settings), days };
  } catch { return null; }
};
const writeCache = (s: AppState) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } };

const dayDocId = (date: string) => 'd-' + date;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/** Writes one document at a time per id, debounced, and remembers which docs have unsaved local edits
 *  so that incoming snapshots never overwrite something you just typed. */
class Persister {
  col: any = null;
  pending = new Map<string, any>();
  inflight = new Set<string>();
  timer: ReturnType<typeof setTimeout> | null = null;
  onStatus: (s: SyncStatus) => void = () => {};
  failed = false;

  dirty(id: string) { return this.pending.has(id) || this.inflight.has(id); }
  queue(id: string, data: any) {
    this.pending.set(id, clone(data));
    if (!this.col) return;
    this.onStatus('saving');
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 450);
  }
  async flush() {
    if (!this.col) return;
    const jobs = [...this.pending.entries()].filter(([id]) => !this.inflight.has(id));
    await Promise.all(jobs.map(async ([id, data]) => {
      this.pending.delete(id);
      this.inflight.add(id);
      try {
        await this.write(id, data);
      } catch (e: any) {
        if (!this.pending.has(id)) this.pending.set(id, data); // keep it for the next attempt
        this.failed = true;
        console.warn('Life Tracker: save failed', e?.code, e?.message);
      } finally {
        this.inflight.delete(id);
      }
    }));
    if (this.pending.size) { this.timer = setTimeout(() => this.flush(), this.failed ? 4000 : 450); }
    this.onStatus(this.failed && this.pending.size ? 'error' : this.pending.size || this.inflight.size ? 'saving' : 'synced');
    if (!this.pending.size) this.failed = false;
  }
  async write(id: string, data: any) {
    try { await this.col.doc(id).set(data); }
    catch (e: any) {
      if (e?.code === 'unavailable') { await new Promise((r) => setTimeout(r, 600 + Math.random() * 800)); await this.col.doc(id).set(data); }
      else throw e;
    }
  }
}

interface Store {
  state: AppState;
  today: string;
  now: number;
  sync: SyncStatus;
  day: (date: string) => DayRecord;
  updateDay: (date: string, fn: (d: DayRecord) => DayRecord) => void;
  updateDays: (fn: (days: Record<string, DayRecord>) => Record<string, DayRecord>) => void;
  updateSettings: (fn: (s: Settings) => Settings) => void;
  replaceAll: (s: AppState) => void;
  viewerName: string;
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => { const s = useContext(Ctx); if (!s) throw new Error('no store'); return s; };

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useRef<AppState>(readCache() ?? { settings: defaultSettings(), days: {} });
  const [state, setState] = useState<AppState>(initial.current);
  const stateRef = useRef(state);
  const persist = useRef(new Persister());
  const [sync, setSync] = useState<SyncStatus>('connecting');
  const [now, setNow] = useState(Date.now());
  const [viewerName, setViewerName] = useState('');

  // Clock: drives the Riyadh-midnight rollover, timers and reminders.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    const vis = () => setNow(Date.now());
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, []);
  const today = todayStr(now);

  const commit = useCallback((next: AppState) => {
    const prev = stateRef.current;
    if (next === prev) return;
    if (next.settings !== prev.settings) persist.current.queue('settings', next.settings);
    for (const k of Object.keys(next.days)) if (next.days[k] !== prev.days[k]) persist.current.queue(dayDocId(k), next.days[k]);
    stateRef.current = next;
    setState(next);
  }, []);

  // Local cache (device-only convenience + offline fallback)
  useEffect(() => { const t = setTimeout(() => writeCache(state), 300); return () => clearTimeout(t); }, [state]);

  // Account storage via the artifact database (private per-person subtree).
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;
    const p = persist.current;
    p.onStatus = (s) => !cancelled && setSync(s);
    const fallback = setTimeout(() => !cancelled && setSync((s) => (s === 'connecting' ? 'local' : s)), 12000);
    (async () => {
      try {
        if (!window.claude?.use) { setSync('local'); return; }
        const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        if (user) { try { const me = await user.me(); if (me?.name) setViewerName(String(me.name).split(' ')[0]); } catch { /* ignore */ } }
        const id = user ? await user.id() : null;
        if (!db || !id || cancelled) { setSync('local'); return; }
        const col = db.collection('data/users/' + id);
        let first = true;
        const loadTimer = setTimeout(() => !cancelled && setSync((s) => (s === 'connecting' ? 'error' : s)), 10000);
        unsub = col.onSnapshot((snap: any) => {
          if (cancelled) return;
          if (snap.metadata?.fromCache && first) {
            // A saved copy; apply it but keep waiting for the confirmed one.
          }
          const cur = stateRef.current;
          let settings = cur.settings;
          const days = { ...cur.days };
          let changed = false;
          for (const d of snap.docs) {
            const data = d.data();
            if (!data) continue;
            if (d.id === 'settings') { if (!p.dirty('settings')) { settings = normalizeSettings(clone(data)); changed = true; } }
            else if (d.id.startsWith('d-')) {
              const date = d.id.slice(2);
              if (!p.dirty(d.id)) { days[date] = normalizeDay(date, clone(data)); changed = true; }
            }
          }
          if (!snap.metadata?.fromCache) {
            clearTimeout(loadTimer);
            if (first) {
              first = false;
              p.col = col;
              // First connection on this account: upload what this device already has (e.g. used offline).
              if (snap.empty) {
                const local = stateRef.current;
                const hasLocal = Object.keys(local.days).length > 0 || localStorage.getItem(CACHE_KEY);
                p.queue('settings', local.settings); // remembers your start date and defaults
                if (hasLocal) {
                  for (const [k, v] of Object.entries(local.days)) p.queue(dayDocId(k), v);
                }
              } else {
                if (!snap.docs.some((x: any) => x.id === 'settings')) p.queue('settings', stateRef.current.settings);
                // Docs edited on this device before connecting still need saving.
                for (const [k] of p.pending) p.queue(k, p.pending.get(k));
              }
              setSync(p.pending.size ? 'saving' : 'synced');
              if (p.pending.size) p.flush();
            }
          }
          if (changed && !(snap.empty && first)) {
            const next = { settings, days };
            stateRef.current = next;
            setState(next);
          }
        }, (err: any) => { if (!cancelled) { console.warn('Life Tracker: sync stopped', err?.code); setSync(p.col ? 'error' : 'local'); } });
      } catch (e) {
        console.warn('Life Tracker: storage unavailable', e);
        if (!cancelled) setSync('local');
      }
    })();
    return () => { cancelled = true; clearTimeout(fallback); unsub?.(); };
  }, []);

  const day = useCallback((date: string) => stateRef.current.days[date] ?? state.days[date] ?? emptyDay(date), [state]);
  const updateDay = useCallback((date: string, fn: (d: DayRecord) => DayRecord) => {
    const cur = stateRef.current;
    const d = cur.days[date] ?? emptyDay(date);
    const nd = fn(d);
    if (nd === d) return;
    commit({ ...cur, days: { ...cur.days, [date]: nd } });
  }, [commit]);
  const updateDays = useCallback((fn: (days: Record<string, DayRecord>) => Record<string, DayRecord>) => {
    const cur = stateRef.current;
    commit({ ...cur, days: fn(cur.days) });
  }, [commit]);
  const updateSettings = useCallback((fn: (s: Settings) => Settings) => {
    const cur = stateRef.current;
    commit({ ...cur, settings: fn(cur.settings) });
  }, [commit]);
  const replaceAll = useCallback((s: AppState) => {
    const cur = stateRef.current;
    // Days that disappear are written back as empty records so they are cleared everywhere.
    const days = { ...s.days };
    for (const k of Object.keys(cur.days)) if (!days[k]) days[k] = emptyDay(k);
    commit({ settings: s.settings, days });
  }, [commit]);

  return <Ctx.Provider value={{ state, today, now, sync, day, updateDay, updateDays, updateSettings, replaceAll, viewerName }}>{children}</Ctx.Provider>;
}

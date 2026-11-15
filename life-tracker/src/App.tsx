import { useCallback, useEffect, useState } from 'react';
import { StoreProvider, useStore } from './lib/store';
import { Icon, ToastProvider, useToast } from './components/ui';
import { clearSnooze, snooze, tryBrowserNotify, useReminderEngine, type Fire } from './lib/reminders';
import Home from './pages/Home';
import Fitness from './pages/Fitness';
import Planner from './pages/Planner';
import Nutrition from './pages/Nutrition';
import Habits from './pages/Habits';
import Insights from './pages/Insights';
import Settings from './pages/Settings';
import Frequency from './pages/Frequency';
import Journal from './pages/Journal';
import { useFmTimerWatcher } from './lib/fmtimer';

const ROUTES = ['home', 'fitness', 'nutrition', 'habits', 'frequency', 'insights', 'planner', 'preferences', 'journal', 'insights-frequency'] as const;
type Route = (typeof ROUTES)[number];
const NAV: { r: Route; label: string; icon: string }[] = [
  { r: 'home', label: 'Home', icon: 'home' },
  { r: 'fitness', label: 'Fitness', icon: 'fitness' },
  { r: 'nutrition', label: 'Nutrition', icon: 'nutrition' },
  { r: 'habits', label: 'Habits', icon: 'habits' },
  { r: 'frequency', label: 'Ritual', icon: 'sparkle' },
  { r: 'insights', label: 'Insights', icon: 'insights' },
];
const readHash = (): Route => { const h = location.hash.replace('#', '') as Route; return ROUTES.includes(h) ? h : 'home'; };

function Shell() {
  const { state, sync, now, updateDay } = useStore();
  const toast = useToast();
  const [route, setRoute] = useState<Route>(readHash);
  useEffect(() => { const f = () => setRoute(readHash()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  const go = useCallback((r: string) => { try { location.hash = r === 'home' ? '' : r; } catch { /* ignore */ } setRoute(r as Route); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

  // Theme
  const theme = state.settings.theme;
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#171312' : '#FFFDF8');
    };
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, [theme]);

  // In-app reminders (only when you have switched them on)
  const onFire = useCallback(({ r, message }: Fire) => {
    if (state.settings.browserNotifications) tryBrowserNotify(r.label, message);
    const actions = [
      { label: 'Snooze 10 min', onClick: () => snooze(r.id, 10) },
      { label: '30 min', onClick: () => snooze(r.id, 30) },
      { label: '1 hour', onClick: () => snooze(r.id, 60) },
    ];
    if (r.habitId) actions.unshift({ label: 'Done ✓', onClick: () => { clearSnooze(r.id); updateDay(new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10), (d) => ({ ...d, habits: { ...d.habits, [r.habitId!]: 'done' } })); } });
    if (r.habitId === 'h-warmdrink') actions.splice(1, 0, { label: 'Not needed', onClick: () => updateDay(new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10), (d) => ({ ...d, habits: { ...d.habits, 'h-warmdrink': 'notneeded' } })) });
    toast.push({ title: r.label, body: message, tone: 'reminder', sticky: true, actions });
  }, [state.settings.browserNotifications, toast, updateDay]);
  useReminderEngine(state, now, onFire);
  useFmTimerWatcher(useCallback((minutes: number, hz: number) => {
    toast.push({ title: 'Listening session complete ✨', body: `${minutes} minutes at ${hz} Hz, logged.` });
    if (state.settings.browserNotifications) tryBrowserNotify('Session complete', `${minutes} minutes at ${hz} Hz.`);
  }, [toast, state.settings.browserNotifications]));

  const syncLabel = sync === 'synced' ? 'Saved' : sync === 'saving' ? 'Saving…' : sync === 'connecting' ? 'Connecting…' : sync === 'error' ? 'Sync issue' : 'This device';
  const syncDot = sync === 'synced' ? 'bg-sage-500' : sync === 'saving' || sync === 'connecting' ? 'bg-cardio animate-pulse' : sync === 'error' ? 'bg-blush-500' : 'bg-taupe-300';

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 bg-ivory/85 backdrop-blur-md safe-top dark:bg-night-900/85">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-2.5">
          <button onClick={() => go('home')} className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-lavender-300 via-blush-300 to-blush-500 font-display text-lg font-semibold leading-none text-white">É</span>
            <span className="font-display text-2xl font-semibold tracking-wide">Évol</span>
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => go('preferences')} className="mr-1 flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] text-taupe-500 dark:text-taupe-300" title="Storage status"><span className={`h-1.5 w-1.5 rounded-full ${syncDot}`} />{syncLabel}</button>
            <button className={`icon-btn ${route === 'planner' ? 'bg-cream dark:bg-night-700' : ''}`} onClick={() => go('planner')} aria-label="Weekly planner"><Icon name="calendar" /></button>
            <button className={`icon-btn ${route === 'preferences' ? 'bg-cream dark:bg-night-700' : ''}`} onClick={() => go('preferences')} aria-label="Settings"><Icon name="settings" /></button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-xl px-4 pb-28 pt-2" key={route}>
        {route === 'home' && <Home go={go} />}
        {route === 'fitness' && <Fitness go={go} />}
        {route === 'planner' && <Planner />}
        {route === 'nutrition' && <Nutrition />}
        {route === 'habits' && <Habits />}
        {route === 'insights' && <Insights />}
        {route === 'insights-frequency' && <Insights initialTab="frequency" />}
        {route === 'frequency' && <Frequency go={go} />}
        {route === 'journal' && <Journal go={go} />}
        {route === 'preferences' && <Settings />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-taupe-100 bg-ivory/90 backdrop-blur-md safe-bottom dark:border-night-600 dark:bg-night-900/90" aria-label="Main">
        <div className="mx-auto flex max-w-xl justify-around px-1 pt-1.5">
          {NAV.map((n) => {
            const active = route === n.r || (n.r === 'fitness' && route === 'planner') || (n.r === 'frequency' && route === 'journal') || (n.r === 'insights' && route === 'insights-frequency');
            const lav = n.r === 'frequency';
            return (
              <button key={n.r} onClick={() => go(n.r)} className={`flex min-w-[52px] flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10.5px] font-medium transition ${active ? (lav ? 'text-lavender-600 dark:text-lavender-300' : 'text-blush-600 dark:text-blush-300') : 'text-taupe-400 dark:text-taupe-400'}`} aria-current={active ? 'page' : undefined}>
                <span className={`flex h-8 w-11 items-center justify-center rounded-full transition ${active ? (lav ? 'bg-lavender-100 dark:bg-lavender-800/50' : 'bg-blush-100 dark:bg-blush-700/30') : ''}`}><Icon name={n.icon} className="h-[22px] w-[22px]" strokeWidth={active ? 2 : 1.7} /></span>
                {n.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return <StoreProvider><ToastProvider><Shell /></ToastProvider></StoreProvider>;
}

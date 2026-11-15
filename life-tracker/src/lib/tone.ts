import { useSyncExternalStore } from 'react';

/** A real, in-browser tone generator (Web Audio API): a soft sine wave at the chosen frequency.
 *  No files or network needed. It's independent of the session timer. */
type ToneState = { playing: boolean; hz: number; volume: number; error: string };
let state: ToneState = { playing: false, hz: 528, volume: 0.35, error: '' };
const subs = new Set<() => void>();
const emit = (p: Partial<ToneState>) => { state = { ...state, ...p }; subs.forEach((f) => f()); };

let ctx: AudioContext | null = null;
let osc: OscillatorNode | null = null;
let gain: GainNode | null = null;
const MAX_GAIN = 0.18; // keep it gentle

export const tone = {
  get: () => state,
  subscribe: (f: () => void) => { subs.add(f); return () => subs.delete(f); },
  async play(hz: number) {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) throw new Error('This browser cannot play generated audio.');
      ctx = ctx ?? new AC();
      if (ctx.state === 'suspended') await ctx.resume();
      this.stop(true);
      gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(state.volume * MAX_GAIN, ctx.currentTime + 1.5); // fade in
      osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hz, ctx.currentTime);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      emit({ playing: true, hz, error: '' });
    } catch (e: any) {
      emit({ playing: false, error: e?.message || 'Audio could not start here.' });
    }
  },
  stop(immediate = false) {
    if (ctx && osc && gain) {
      const o = osc, g = gain, t = ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + (immediate ? 0.05 : 1.2)); // fade out
      o.stop(t + (immediate ? 0.06 : 1.25));
    }
    osc = null; gain = null;
    if (!immediate) emit({ playing: false });
  },
  setHz(hz: number) {
    if (ctx && osc) osc.frequency.linearRampToValueAtTime(hz, ctx.currentTime + 0.4);
    emit({ hz });
  },
  setVolume(v: number) {
    if (ctx && gain) { gain.gain.cancelScheduledValues(ctx.currentTime); gain.gain.linearRampToValueAtTime(v * MAX_GAIN, ctx.currentTime + 0.2); }
    emit({ volume: v });
  },
};
export const useTone = () => useSyncExternalStore(tone.subscribe, tone.get);

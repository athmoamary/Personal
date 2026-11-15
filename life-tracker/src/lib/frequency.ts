import type { MoodKind, RitualId } from './types';

/** Frequencies and their *traditional wellness associations*. These are listening rituals, not medical or scientific claims. */
export const FREQUENCIES: { hz: number; theme: string; note: string }[] = [
  { hz: 174, theme: 'Comfort and security', note: 'The lowest of the solfeggio-style tones; often used for grounding, settling-in sessions.' },
  { hz: 285, theme: 'Renewal', note: 'Traditionally linked with feeling restored and refreshed.' },
  { hz: 396, theme: 'Releasing fear', note: 'Often chosen for evening reflection and letting go of the day.' },
  { hz: 417, theme: 'Change and new beginnings', note: 'Associated with fresh starts and moving through transitions.' },
  { hz: 432, theme: 'Calm and harmony', note: 'A popular choice for relaxing, grounding and slowing down.' },
  { hz: 528, theme: 'Love and transformation', note: 'Traditionally associated with positive energy — a favourite for mornings.' },
  { hz: 639, theme: 'Connection and relationships', note: 'Often paired with intention-setting and manifestation practice.' },
  { hz: 741, theme: 'Clarity and expression', note: 'Associated with focus and expressing yourself clearly.' },
  { hz: 852, theme: 'Intuition', note: 'Linked with inner reflection and listening to yourself.' },
];
export const freqInfo = (hz: number) => FREQUENCIES.find((f) => f.hz === hz);

export const listenLinks = (hz: number) => [
  { label: `YouTube · ${hz} Hz`, href: `https://www.youtube.com/results?search_query=${hz}+hz+frequency+music` },
  { label: `Spotify · ${hz} Hz`, href: `https://open.spotify.com/search/${hz}%20hz` },
];

export const RITUALS: { id: RitualId; title: string; subtitle: string; time: string; minutes: number; freqs: number[]; activities: string[] }[] = [
  { id: 'morning', title: 'Morning', subtitle: 'Raise your energy', time: '08:00', minutes: 10, freqs: [528], activities: ['fm-morning-listen', 'fm-morning-affirm'] },
  { id: 'midday', title: 'Midday', subtitle: 'Manifestation & abundance', time: '13:00', minutes: 5, freqs: [639, 432], activities: ['fm-midday', 'fm-action'] },
  { id: 'evening', title: 'Evening', subtitle: 'Emotional balance & peace', time: '21:00', minutes: 15, freqs: [396, 432], activities: ['fm-evening-listen', 'fm-evening-journal'] },
];
export const LISTEN_HABIT: Record<RitualId, string> = { morning: 'fm-morning-listen', midday: 'fm-midday', evening: 'fm-evening-listen' };

export const AFFIRMATIONS: Record<RitualId, string[]> = {
  morning: [
    'I welcome good things into my life.',
    'I trust myself to create a beautiful day.',
    'I am becoming the person I want to be.',
    'I choose confidence, peace, and abundance.',
    'I am capable of creating meaningful change.',
  ],
  midday: [
    'Every small step I take is moving me forward.',
    'I am open to the opportunities in front of me.',
    'I act with intention, not pressure.',
    'What I want is worth working toward.',
  ],
  evening: [
    'I release what I cannot control.',
    'I deserve rest and peace.',
    'I am proud of the progress I made today.',
    'Tomorrow is another opportunity to grow.',
  ],
};

export const CATEGORIES = ['Career and success', 'Financial abundance', 'Love and relationships', 'Confidence and self-worth', 'Health and wellness', 'Personal growth', 'Custom intention'];

export type JournalSection = 'intentions' | 'manifestation' | 'gratitude' | 'release';
export const JOURNAL_SECTIONS: { id: JournalSection; title: string }[] = [
  { id: 'intentions', title: 'Morning intentions' },
  { id: 'manifestation', title: 'Manifestation' },
  { id: 'gratitude', title: 'Gratitude' },
  { id: 'release', title: 'Emotional release' },
];
export const PROMPTS: { id: string; section: JournalSection; q: string; short?: boolean }[] = [
  { id: 'i.energy', section: 'intentions', q: 'What energy do I want to bring into today?' },
  { id: 'i.forward', section: 'intentions', q: 'What am I looking forward to?' },
  { id: 'm.what', section: 'manifestation', q: 'What am I manifesting — what am I working toward?' },
  { id: 'm.why', section: 'manifestation', q: 'Why does this matter to me?' },
  { id: 'm.looks', section: 'manifestation', q: 'What does achieving it look like?' },
  { id: 'm.feel', section: 'manifestation', q: 'How do I want to feel?' },
  { id: 'm.step', section: 'manifestation', q: 'What can I do today to move closer to it?' },
  { id: 'g.1', section: 'gratitude', q: 'I appreciate…', short: true },
  { id: 'g.2', section: 'gratitude', q: 'I appreciate…', short: true },
  { id: 'g.3', section: 'gratitude', q: 'I appreciate…', short: true },
  { id: 'r.heavy', section: 'release', q: 'What felt heavy today that I can release?' },
  { id: 'r.happy', section: 'release', q: 'What made me genuinely happy or grateful?' },
  { id: 'r.welcome', section: 'release', q: 'What do I want to welcome tomorrow?' },
  { id: 'r.challenged', section: 'release', q: 'What challenged me today?' },
  { id: 'r.letgo', section: 'release', q: 'What can I let go of?' },
  { id: 'r.learned', section: 'release', q: 'What did I learn about myself?' },
];
export const promptById = (id: string) => PROMPTS.find((p) => p.id === id);
export const MANIFEST_PROMPTS = ['m.what', 'm.why', 'm.feel', 'm.step'];
export const EVENING_PROMPTS = ['r.heavy', 'r.happy', 'r.welcome'];

export const MOODS: { kind: MoodKind; label: string; hz: number; minutes: number; focus: string; affirmation: string; activity: string }[] = [
  { kind: 'low', label: 'Low energy', hz: 528, minutes: 10, focus: 'Motivation and positive energy', affirmation: 'I am capable of creating meaningful change.', activity: 'Open the curtains, drink a glass of water and stretch for two minutes.' },
  { kind: 'anxious', label: 'Anxious or overwhelmed', hz: 432, minutes: 10, focus: 'Relaxation and grounding', affirmation: 'I release what I cannot control.', activity: 'Breathe in for 4 seconds and out for 6, ten times. Name five things you can see.' },
  { kind: 'heavy', label: 'Emotionally heavy', hz: 396, minutes: 15, focus: 'Reflection and emotional release', affirmation: 'I deserve rest and peace.', activity: 'Write down what feels heavy, without editing — then close the page.' },
  { kind: 'manifest', label: 'Manifestation mode', hz: 639, minutes: 5, focus: 'Intentions and connection', affirmation: 'What I want is worth working toward.', activity: 'Write your intention in one sentence and choose one real step for today.' },
];
export const MOOD_SHORT: Record<MoodKind, string> = { low: 'Low', anxious: 'Anxious', heavy: 'Heavy', manifest: 'Manifest' };
export const MOOD_SCALE = ['Very low', 'Low', 'Okay', 'Good', 'Great'];

export const DISCLAIMER = 'Frequency associations come from wellness traditions, not established science. Treat listening as a calming ritual — it is not a treatment for any condition.';

/** A stable daily pick so the affirmation changes each day but doesn't jump around while you look at it. */
export const dailyPick = <T,>(list: T[], date: string, salt = 0) => list[(Number(date.replace(/-/g, '')) + salt) % list.length];

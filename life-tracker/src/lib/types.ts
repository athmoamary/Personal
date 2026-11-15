export type WorkoutType = 'strength' | 'pilates' | 'cardio';
export type WorkoutStatus = 'planned' | 'done' | 'skipped';
export type HabitStatus = 'done' | 'skipped' | 'notneeded';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Exercise { id: string; name: string; sets?: number; reps?: number; weight?: number }

export interface Workout {
  id: string;
  date: string; // YYYY-MM-DD (Riyadh)
  type: WorkoutType;
  subtype: string; // strength: lower1|lower2|upper1 ; pilates: session type; cardio: machine
  status: WorkoutStatus;
  time?: string; // HH:MM
  duration?: number; // minutes
  intensity?: 'low' | 'moderate' | 'high';
  distance?: number; // km
  notes?: string;
  exercises?: Exercise[];
  rescheduledFrom?: string;
  createdAt: number;
}

export interface Meal {
  id: string;
  meal: MealType;
  name: string;
  protein: number;
  fiber: number;
  calories?: number;
  carbs?: number;
  fat?: number;
  createdAt: number;
}

export interface Reading {
  accMs: number; // accumulated timer time
  runningSince: number | null; // epoch ms when the timer was (re)started
  completed: boolean;
  manualMin?: number; // minutes logged by hand
  book?: string;
}

export type PlanKind = 'reading' | 'habit' | 'selfcare' | 'other';
export interface PlanItem {
  id: string;
  kind: PlanKind;
  title: string;
  time?: string;
  status: 'planned' | 'done' | 'skipped';
  rescheduledFrom?: string;
  createdAt: number;
}

export interface DayRecord {
  date: string;
  habits: Record<string, HabitStatus>;
  meals: Meal[];
  reading: Reading;
  workouts: Workout[];
  plan: PlanItem[];
}

export interface Habit {
  id: string;
  name: string;
  time?: string; // HH:MM
  days: number[]; // 0 = Sunday … 6 = Saturday
  conditional: boolean; // allows “Not needed”
  enabled: boolean;
  category: 'wellness' | 'selfcare';
  startDate: string; // counts from this date (so new habits never create “missed” history)
  note?: string;
}

export type ReminderKind = 'habit' | 'workout' | 'nutrition' | 'reading' | 'selfcare' | 'custom';
export interface Reminder {
  id: string;
  label: string;
  message: string;
  kind: ReminderKind;
  habitId?: string;
  time: string; // HH:MM Riyadh
  days: number[];
  repeat: 0 | 30 | 60 | 120; // minutes between repeats until done (0 = once)
  maxRepeats: number;
  enabled: boolean;
  pausedUntil?: string; // YYYY-MM-DD; paused through that date ('forever' = indefinitely)
}

export interface Settings {
  version: number;
  name: string;
  theme: 'system' | 'light' | 'dark';
  proteinMin: number;
  proteinMax: number;
  fiberGoal: number;
  readingGoal: number; // minutes
  consistencyThreshold: number; // % of daily items for a streak day
  targets: Record<WorkoutType, number>;
  habits: Habit[];
  reminders: Reminder[];
  remindersOn: boolean; // master switch — off by default
  browserNotifications: boolean;
  firstUsed: string;
}

export interface AppState { settings: Settings; days: Record<string, DayRecord> }

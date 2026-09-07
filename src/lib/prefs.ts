import { create } from "zustand";

/**
 * Device-local preferences (daily goal, reminder schedule, last backup).
 *
 * Deliberately in localStorage rather than the synced Dexie tables: a reminder
 * time is a property of *this* phone, and syncing it would fight across devices.
 */
export interface Prefs {
  /** Lessons/day target. 0 disables the goal ring. */
  dailyGoal: number;
  reminderEnabled: boolean;
  /** 24h "HH:MM" local time. */
  reminderTime: string;
  lastBackupAt: number | null;
  /** Public LeetCode handle whose solved counts the LeetCode tab pulls. */
  leetcodeUsername: string;
}

const KEY = "trackback.prefs";

const DEFAULTS: Prefs = {
  dailyGoal: 3,
  reminderEnabled: false,
  reminderTime: "20:00",
  lastBackupAt: null,
  leetcodeUsername: "",
};

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return DEFAULTS;
  }
}

function persist(p: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage full or blocked — prefs just won't survive a restart */
  }
}

interface PrefsState extends Prefs {
  set: (patch: Partial<Prefs>) => void;
}

export const usePrefs = create<PrefsState>((set, get) => ({
  ...load(),
  set: (patch) => {
    const next = { ...get(), ...patch };
    persist({
      dailyGoal: next.dailyGoal,
      reminderEnabled: next.reminderEnabled,
      reminderTime: next.reminderTime,
      lastBackupAt: next.lastBackupAt,
      leetcodeUsername: next.leetcodeUsername,
    });
    set(patch);
  },
}));

/** Callable outside React (e.g. from exportBackup). */
export function markBackedUp(): void {
  usePrefs.getState().set({ lastBackupAt: Date.now() });
}

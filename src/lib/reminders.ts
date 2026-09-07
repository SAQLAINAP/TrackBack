import { Capacitor } from "@capacitor/core";

/**
 * Daily study reminder via a repeating local notification.
 *
 * Native-only: the plugin is a no-op on web, and browser Notification triggers
 * aren't reliable enough to bother with. All functions resolve harmlessly when
 * the platform or permission isn't available, so callers don't need to guard.
 */
const ID = 1001;

export function remindersSupported(): boolean {
  return Capacitor.isNativePlatform();
}

async function plugin() {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  return LocalNotifications;
}

/** Returns true if we hold (or just obtained) permission to post notifications. */
export async function ensurePermission(): Promise<boolean> {
  if (!remindersSupported()) return false;
  try {
    const LN = await plugin();
    let { display } = await LN.checkPermissions();
    // Android 13+ requires an explicit POST_NOTIFICATIONS grant.
    if (display !== "granted") ({ display } = await LN.requestPermissions());
    return display === "granted";
  } catch {
    return false;
  }
}

/**
 * (Re)schedule the daily reminder for `hhmm` ("20:00"). Cancels any previous
 * one first so changing the time doesn't leave a duplicate behind.
 */
export async function scheduleDaily(hhmm: string, streak: number): Promise<boolean> {
  if (!remindersSupported()) return false;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;

  const granted = await ensurePermission();
  if (!granted) return false;

  try {
    const LN = await plugin();
    await cancelDaily();
    await LN.schedule({
      notifications: [
        {
          id: ID,
          title: "TrackBack",
          body:
            streak > 0
              ? `Streak at ${streak} day${streak === 1 ? "" : "s"} — one lesson keeps it alive.`
              : "One lesson today is enough to start a streak.",
          // `on` with no date component repeats daily at this wall-clock time.
          schedule: { on: { hour: h, minute: m }, allowWhileIdle: true },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelDaily(): Promise<void> {
  if (!remindersSupported()) return;
  try {
    const LN = await plugin();
    await LN.cancel({ notifications: [{ id: ID }] });
  } catch {
    /* nothing scheduled */
  }
}

import { Capacitor } from "@capacitor/core";
import { useTheme } from "./theme";

/**
 * Native (Capacitor) shell wiring.
 *
 * Android 15+/16 force edge-to-edge, so the WebView renders behind the status
 * bar and the gesture navigation bar. We deliberately keep the overlay ON and
 * handle the insets in CSS (see `--safe-top` / `--safe-bottom` in index.css),
 * which keeps a single layout model shared with the web build.
 *
 * The `native` class on <html> activates the inset floor, because some Android
 * WebView builds report env(safe-area-inset-top) as 0px.
 */
export function initNativeShell(): void {
  const isNative = Capacitor.isNativePlatform();
  document.documentElement.classList.toggle("native", isNative);
  document.documentElement.classList.toggle(
    "platform-android",
    isNative && Capacitor.getPlatform() === "android",
  );

  if (!isNative) return;

  void setupStatusBar();
}

async function setupStatusBar(): Promise<void> {
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");

    // We paint our own background behind the status bar.
    await StatusBar.setOverlaysWebView({ overlay: true });

    const sync = async (theme: "light" | "dark") => {
      try {
        // Style.Dark => light icons (for dark backgrounds), Style.Light => dark icons.
        await StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : Style.Light });
      } catch {
        /* non-fatal */
      }
    };

    await sync(useTheme.getState().theme);
    useTheme.subscribe((s) => void sync(s.theme));
  } catch {
    // Plugin unavailable (e.g. web build) — CSS insets still apply.
  }
}

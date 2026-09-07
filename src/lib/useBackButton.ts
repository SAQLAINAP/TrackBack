import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

/**
 * Android hardware/gesture back button.
 *
 * Without a listener Capacitor's default is to exit the app on every back
 * press, so backing out of a lesson would kill TrackBack instead of returning
 * to the course. We navigate the router instead, and only exit when there is
 * nowhere left to go back to.
 *
 * `canGoBack` from the plugin reflects the *WebView* history, which react-router
 * in browser-history mode does drive, but it stays true after we've returned to
 * the dashboard (the entry itself counts). So we gate on being at a root tab
 * rather than trusting that flag alone.
 */
const ROOT_PATHS = new Set(["/", "/search", "/revision", "/settings"]);

export function useBackButton(): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let remove: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("backButton", () => {
        // Deep in the hierarchy (section/course/lesson) → step back.
        if (!ROOT_PATHS.has(window.location.pathname)) {
          navigate(-1);
          return;
        }
        // On a secondary tab → return to the dashboard rather than quitting.
        if (window.location.pathname !== "/") {
          navigate("/");
          return;
        }
        // At the dashboard → this is the only place back should close the app.
        void App.exitApp();
      });
      if (cancelled) void handle.remove();
      else remove = () => void handle.remove();
    })();

    return () => {
      cancelled = true;
      remove?.();
    };
    // The handler reads window.location at fire time, so a single listener
    // stays correct across navigations — no need to re-register per route.
  }, [navigate]);
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// Bundled fonts (no CDN) so typography renders correctly fully offline / in the APK.
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/sora";
import "@fontsource-variable/jetbrains-mono";

import "./index.css";
import App from "./App.tsx";
import { seedIfNeeded } from "./lib/repo";
import { initSync } from "./lib/sync";
import { initTheme } from "./lib/theme";
import { initNativeShell } from "./lib/native";

initTheme();
initNativeShell();

seedIfNeeded()
  .then(() => initSync())
  .catch((e) => console.error("seed failed", e));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { seedIfNeeded } from "./lib/repo";
import { initSync } from "./lib/sync";
import { initTheme } from "./lib/theme";

initTheme();

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

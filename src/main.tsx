import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { startPreloading } from "./lib/preloadAssets";

// Start preloading critical assets immediately
startPreloading();

// Surface native WebView JS exceptions in Xcode logs (Capacitor) and browser console.
window.addEventListener("error", (event) => {
  // eslint-disable-next-line no-console
  console.error("[global] error:", event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  // eslint-disable-next-line no-console
  console.error("[global] unhandledrejection:", event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);

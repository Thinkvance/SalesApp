import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
// main.js

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => {
        // First install: controller is null → ignore
        if (!navigator.serviceWorker.controller) return;

        // When a new SW is found...
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          newWorker.addEventListener("statechange", () => {
            // Once it's installed and there's an active controller,
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              window.dispatchEvent(new Event("swUpdated"));
            }
          });
        });
      })
      .catch(console.error);
  });
}
createRoot(document.getElementById("root")).render(<App />);

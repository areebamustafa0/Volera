"use client";

import { useEffect } from "react";

/**
 * Registers the service worker and handles updates: when a new worker is
 * waiting, it is activated immediately and the page reloads once, so users
 * never get stuck on a stale cached shell.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;

    let reloading = false;

    // Only reload for a genuine UPDATE. On a first visit the worker calls
    // clients.claim(), which also fires controllerchange — reloading there
    // would give every new visitor an unexplained page refresh.
    const hadControllerAtStart = Boolean(navigator.serviceWorker.controller);

    const onControllerChange = () => {
      if (reloading || !hadControllerAtStart) return;
      reloading = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Activate an already-waiting worker from a previous visit
        if (registration.waiting) registration.waiting.postMessage("SKIP_WAITING");

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              installing.postMessage("SKIP_WAITING");
            }
          });
        });

        // Check for a new version periodically during long sessions
        const interval = setInterval(() => registration.update().catch(() => undefined), 60 * 60 * 1000);
        return () => clearInterval(interval);
      })
      .catch(() => undefined);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}

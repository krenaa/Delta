"use client";

import { useEffect, useRef } from "react";

const DEFAULT_RENDER_BACKEND = "https://delta-et1v.onrender.com";
const TEN_MINUTES_MS = 10 * 60 * 1000;
const NINE_MINUTES_MS = 9 * 60 * 1000;

function resolveHealthzUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_RENDER_BACKEND;

  try {
    const origin = new URL(envUrl).origin;
    return `${origin}/healthz`;
  } catch {
    return `${DEFAULT_RENDER_BACKEND}/healthz`;
  }
}

export function useBackendHeartbeat(): void {
  const lastPingTimeRef = useRef<number>(0);

  useEffect(() => {
    const targetUrl = resolveHealthzUrl();

    const pingBackend = () => {
      lastPingTimeRef.current = Date.now();
      fetch(targetUrl, {
        method: "GET",
        mode: "no-cors",
        cache: "no-store",
      }).catch(() => {
        // Silently catch network errors to keep DevTools clean
      });
    };

    // 1. Immediate initial ping on mount
    pingBackend();

    // 2. Recurring 10-minute interval
    const intervalId = setInterval(pingBackend, TEN_MINUTES_MS);

    // 3. Tab visibility listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastPingTimeRef.current;
        if (elapsed > NINE_MINUTES_MS) {
          pingBackend();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 4. Clean teardown on unmount
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}

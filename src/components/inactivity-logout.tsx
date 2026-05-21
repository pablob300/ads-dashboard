"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

export default function InactivityLogout() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function reset() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, TIMEOUT_MS);
    }

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return null;
}

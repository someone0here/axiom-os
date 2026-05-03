import { useEffect, useRef } from "react";
import { useUi } from "../store/ui";

export function useInactivityLock(timeoutMs = 5 * 60 * 1000) {
  const { lock, isLocked } = useUi();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      if (!isLocked) timer.current = setTimeout(lock, timeoutMs);
    };
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [isLocked, timeoutMs, lock]);
}

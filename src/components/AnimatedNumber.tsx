"use client";

import { useEffect, useRef, useState } from "react";

// Counts up from its previous value to the new one instead of just
// snapping — used for the dashboard's stat numbers, which otherwise just
// pop in as static server-rendered text with no sense of motion at all.
export default function AnimatedNumber({ value, durationMs = 600 }: { value: number; durationMs?: number }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    const start = mounted.current ? prevValue.current : 0;
    const end = value;
    mounted.current = true;
    if (start === end) {
      setDisplay(end);
      return;
    }

    const startTime = performance.now();
    let raf: number;

    function tick(now: number) {
      const progress = Math.min((now - startTime) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevValue.current = end;
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span className="tabular-nums">{display}</span>;
}

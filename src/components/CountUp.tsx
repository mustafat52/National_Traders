'use client';
import { useEffect, useRef, useState } from 'react';

/** Animates a number from its previous value to the new one (ease-out). Skips animation if the user prefers reduced motion. */
export function useCountUp(target: number, duration = 1200, delay = 0) {
  const [v, setV] = useState(0); const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { from.current = target; setV(target); return; }
    let raf = 0; const start = performance.now() + delay; const a = from.current;
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start) / duration));
      const val = a + (target - a) * (p === 1 ? 1 : 1 - Math.pow(2, -10 * p));
      from.current = val; setV(val);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay]);
  return v;
}
export function CountUp({ value, duration, delay, className, format }: { value: number; duration?: number; delay?: number; className?: string; format?: (n: number) => string }) {
  const v = useCountUp(value, duration, delay);
  return <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>{(format ?? ((n) => Math.round(n).toLocaleString('en-IN')))(v)}</span>;
}
/** A bar that grows from zero to its width once, after mount. */
export function GrowBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 60 + delay); return () => clearTimeout(t); }, [pct, delay]);
  return <div className="grow h-full rounded-full" style={{ width: `${w}%`, background: color }} />;
}
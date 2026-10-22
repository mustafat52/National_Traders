'use client';
import { CountUp } from '@/components/CountUp';

/** Currency with a small, faded rupee sign and Indian digit grouping (4,43,430). Negative amounts get a minus. */
export function Rupee({ v, className = '', animate = false, delay = 0 }: { v: number; className?: string; animate?: boolean; delay?: number }) {
  const fmt = (n: number) => Math.round(Math.abs(n)).toLocaleString('en-IN');
  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {v < -0.5 && <span>&minus;</span>}<span className="mr-0.5 text-[0.7em] opacity-50">₹</span>
      {animate ? <CountUp value={Math.abs(v)} format={fmt} delay={delay} /> : fmt(v)}
    </span>
  );
}
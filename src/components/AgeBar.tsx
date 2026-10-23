'use client';
import { useEffect, useState } from 'react';

/** The three ageing buckets used everywhere payables are shown. Same order as vendorAging(). */
export const AGE = [
  { label: 'Under 30 days', color: '#8FA05E', chip: 'bg-sage-bg text-sage-fg' },
  { label: '30 to 60 days', color: '#E08A3C', chip: 'bg-butter-bg text-butter-fg' },
  { label: 'Over 60 days', color: '#D9705F', chip: 'bg-blush-bg text-blush-fg' },
];

/** One bar split by how old the money owed is. Grows in once after mount. */
export function AgeBar({ ag, tall = false }: { ag: number[]; tall?: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 60); return () => clearTimeout(t); }, []);
  const total = ag.reduce((a, b) => a + b, 0);
  return (
    <div className={`flex gap-1 overflow-hidden rounded-full bg-paper ${tall ? 'h-4' : 'h-2'}`} role="img" aria-label={AGE.map((a, i) => `${a.label}: ${Math.round(ag[i])} rupees`).join(', ')}>
      {total > 0 && ag.map((v, i) => (v > 0 ? <div key={i} className="grow rounded-full" style={{ width: on ? `${(v / total) * 100}%` : '0%', background: AGE[i].color }} /> : null))}
    </div>
  );
}
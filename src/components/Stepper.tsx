'use client';
import { Minus, Plus } from 'lucide-react';

/** A tap-friendly quantity control: minus, a typeable number, plus. */
export function Stepper({ value, onChange, min = 0, max, id, large = false }: { value: number; onChange: (n: number) => void; min?: number; max?: number; id?: string; large?: boolean }) {
  const clamp = (n: number) => Math.max(min, Math.min(max ?? Infinity, Math.round(n) || 0));
  const btn = `flex shrink-0 items-center justify-center rounded-xl bg-paper text-ink transition hover:bg-line disabled:opacity-40 ${large ? 'h-12 w-12' : 'h-9 w-9'}`;
  return (
    <div className="inline-flex items-center gap-1.5">
      <button type="button" aria-label="Decrease" className={btn} disabled={value <= min} onClick={() => onChange(clamp(value - 1))}><Minus className="h-4 w-4" /></button>
      <input id={id} type="number" inputMode="numeric" min={min} max={max} value={value || ''} placeholder="0"
        onChange={(e) => onChange(clamp(+e.target.value))} onFocus={(e) => e.target.select()}
        className={`!border-transparent !bg-white !px-1 text-center font-display font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${large ? '!h-12 !w-28 !text-3xl' : '!h-9 !w-16 !text-lg'}`} />
      <button type="button" aria-label="Increase" className={btn} disabled={max !== undefined && value >= max} onClick={() => onChange(clamp(value + 1))}><Plus className="h-4 w-4" /></button>
    </div>
  );
}
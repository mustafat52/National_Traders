'use client';
import React from 'react';
import { Check, X } from 'lucide-react';
import { Staff } from '@/lib/types';

/** Small building blocks shared by the Staff, Leaves and Payroll screens (soft swatch theme). */
export const TINTS = [
  { bg: '#DCEBE3', fg: '#14504A' }, { bg: '#F8EBC4', fg: '#7A5B0C' }, { bg: '#F6DDD7', fg: '#94402F' },
  { bg: '#DDE9F4', fg: '#2D5E8A' }, { bg: '#E7E3F5', fg: '#5A4B9B' },
];
export function Avatar({ staff, id, size = 'md' }: { staff: Staff[]; id: string; size?: 'sm' | 'md' | 'lg' }) {
  const i = Math.max(0, staff.findIndex((s) => s.id === id)); const c = TINTS[i % TINTS.length];
  const sz = { sm: 'h-8 w-8 rounded-[10px] text-base', md: 'h-11 w-11 rounded-[14px] text-lg', lg: 'h-14 w-14 rounded-2xl text-2xl' }[size];
  return <span className={`flex shrink-0 items-center justify-center font-display font-bold ${sz}`} style={{ background: c.bg, color: c.fg }}>{staff[i]?.name[0]}</span>;
}
export const card = 'rounded-[22px] border border-line bg-white';

export function Banner({ msg, onClose }: { msg: { ok: boolean; text: string } | null; onClose?: () => void }) {
  if (!msg) return null;
  return (
    <div role={msg.ok ? 'status' : 'alert'} className={`fade-up mb-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm ${msg.ok ? 'bg-sage-bg text-sage-fg' : 'bg-blush-bg text-blush-fg'}`}>
      {msg.ok ? <Check className="h-5 w-5 shrink-0" /> : <X className="h-5 w-5 shrink-0" />}<span className="flex-1">{msg.text}</span>
      {onClose && <button onClick={onClose} className="text-xs underline">Dismiss</button>}
    </div>
  );
}
/** Segmented control: one row of choices, one selected. */
export function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-white p-1 text-sm font-medium">
      {options.map(([k, l]) => <button key={k} onClick={() => onChange(k)} className={`rounded-lg px-3.5 py-1.5 transition ${value === k ? 'bg-brand text-white' : 'text-steel hover:text-ink'}`}>{l}</button>)}
    </div>
  );
}
export function Title({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="font-display text-[40px] font-semibold leading-none tracking-tight">{title}</h1>{sub && <p className="mt-1 max-w-2xl text-steel">{sub}</p>}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
export const errText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');
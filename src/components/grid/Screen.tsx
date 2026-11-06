'use client';
import React from 'react';
import { cx } from '@/components/ui';

/** Screen title row: one title, one line of help, the buttons on the right. */
export function ScreenHead({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-2">
      <div><h1 className="text-[20px] font-semibold leading-tight">{title}</h1>{hint && <p className="text-[12.5px] text-steel">{hint}</p>}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
/** Plain button that also shows its shortcut key. */
export function KBtn({ k, primary, className, children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { k?: string; primary?: boolean }) {
  return (
    <button {...p} className={cx('inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40', primary ? 'border-ink bg-ink text-white hover:bg-brand-light' : 'border-line bg-white text-ink hover:bg-paper', className)}>
      {children}{k && <kbd className={cx('rounded border px-1 text-[10.5px] font-semibold', primary ? 'border-white/30 text-gold-light' : 'border-line text-steel')}>{k}</kbd>}
    </button>
  );
}
export const Dot = ({ tone, children }: { tone: 'ok' | 'warn' | 'bad' | 'neutral'; children: React.ReactNode }) => {
  const c = { ok: 'bg-good', warn: 'bg-butter-fg', bad: 'bg-blush-fg', neutral: 'bg-steel' }[tone];
  return <span className="inline-flex items-center gap-1.5"><i className={`h-2 w-2 rounded-full ${c}`} />{children}</span>;
};

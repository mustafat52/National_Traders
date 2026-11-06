'use client';
import React from 'react';

/** One field: label on the left, input on the right, optional hint and error. */
export function FormRow({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid items-start gap-x-4 gap-y-1 border-b border-line/70 py-2 sm:grid-cols-[220px_1fr]">
      <label className="pt-1.5 text-[13px] font-medium text-ink">{label}</label>
      <div>{children}{hint && !error && <p className="mt-1 text-[12px] text-steel">{hint}</p>}{error && <p className="mt-1 text-[12px] font-medium text-blush-fg">{error}</p>}</div>
    </div>
  );
}
/** Wrap a form so Enter moves to the next field (Shift+Enter to the previous), like Tally. */
export function EnterForm({ children, className }: { children: React.ReactNode; className?: string }) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || e.ctrlKey || e.metaKey) return;
    const t = e.target as HTMLElement;
    if (t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON' || (t as HTMLInputElement).type === 'submit') return;
    if (!['INPUT', 'SELECT'].includes(t.tagName)) return;
    const fields = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('input:not([type=hidden]), select, textarea')).filter((x) => !x.hasAttribute('disabled'));
    const i = fields.indexOf(t); if (i < 0) return;
    e.preventDefault();
    fields[Math.max(0, Math.min(fields.length - 1, i + (e.shiftKey ? -1 : 1)))]?.focus();
    (fields[i + (e.shiftKey ? -1 : 1)] as HTMLInputElement | undefined)?.select?.();
  };
  return <div className={className} onKeyDown={onKeyDown}>{children}</div>;
}
export const inputCls = 'w-full max-w-md !rounded-md !px-2.5 !py-1.5 text-[13px]';

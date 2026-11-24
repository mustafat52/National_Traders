import React from 'react';

/** A bordered block with a small heading, like the grouped boxes on the old software's screens. */
export const Panel = ({ title, hint, children, className }: { title: string; hint?: string; children: React.ReactNode; className?: string }) => (
  <section className={`rounded-md border border-line bg-white ${className ?? ''}`}>
    <header className="flex items-baseline justify-between border-b border-line bg-paper px-3 py-1.5"><h2 className="text-[12px] font-semibold uppercase tracking-wide text-steel">{title}</h2>{hint && <span className="text-[11.5px] text-steel">{hint}</span>}</header>
    <div className="px-3 py-1.5">{children}</div>
  </section>
);

/** One row of a form: label on the left, the value or field on the right. */
export const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid items-baseline gap-x-3 border-b border-line/50 py-1.5 last:border-0 sm:grid-cols-[130px_1fr]"><span className="text-[12.5px] font-medium text-steel">{label}</span><span className="min-w-0 text-[13px]">{children}</span></div>
);
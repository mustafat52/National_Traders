'use client';
import React, { useEffect, useRef } from 'react';
import { useScreenKeys } from '@/lib/hotkeys';

/** Modal box: Esc closes, focus stays inside and goes back where it was, Enter on the default button confirms. */
export function Dialog({ title, onClose, children, width = 'max-w-lg' }: { title: string; onClose: () => void; children: React.ReactNode; width?: string }) {
  const box = useRef<HTMLDivElement>(null);
  useScreenKeys([{ key: 'Esc', label: 'Close', run: onClose }], true);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = box.current?.querySelector<HTMLElement>('[data-autofocus], input, select, textarea, button');
    first?.focus();
    return () => prev?.focus?.();
  }, []);
  const trap = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !box.current) return;
    const f = Array.from(box.current.querySelectorAll<HTMLElement>('input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])')).filter((x) => !x.hasAttribute('disabled'));
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  };
  return (
    <div className="no-print fixed inset-0 z-[70] flex items-start justify-center bg-black/40 p-4 pt-[10vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={box} role="dialog" aria-modal="true" aria-label={title} onKeyDown={trap} className={`w-full ${width} rounded-md border border-line bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5"><b className="text-[14px]">{title}</b><span className="text-[11px] text-steel">Esc to close</span></div>
        <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

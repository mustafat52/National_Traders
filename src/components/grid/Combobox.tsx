'use client';
import React, { useMemo, useRef, useState } from 'react';

export interface Opt { id: string; label: string; sub?: string; keys?: string }
/** Type to search, arrow keys choose, Enter picks. An exact match on `keys` (for example a scanned SKU) is picked straight away on Enter. */
export function Combobox({ options, onPick, placeholder, autoFocus, id, clearOnPick = true, limit = 8, minChars = 0 }: {
  options: Opt[]; onPick: (o: Opt) => void; placeholder?: string; autoFocus?: boolean; id?: string; clearOnPick?: boolean; limit?: number; /** show no suggestions until this many characters are typed */ minChars?: number;
}) {
  const [q, setQ] = useState(''); const [open, setOpen] = useState(false); const [hi, setHi] = useState(0); const ref = useRef<HTMLInputElement>(null);
  const res = useMemo(() => {
    const t = q.trim().toLowerCase(); if (t.length < minChars) return []; if (!t) return options.slice(0, limit);
    const words = t.split(/\s+/); const out: Opt[] = [];
    for (const o of options) { const hay = (o.label + ' ' + (o.sub ?? '') + ' ' + (o.keys ?? '')).toLowerCase(); if (words.every((w) => hay.includes(w))) { out.push(o); if (out.length >= limit) break; } }
    return out;
  }, [q, options, limit, minChars]);
  const pick = (o?: Opt) => { if (!o) return; onPick(o); if (clearOnPick) setQ(''); else setQ(o.label); setOpen(false); setHi(0); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setOpen(true); setHi((h) => Math.min(res.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') { const exact = options.find((o) => o.keys && o.keys.toLowerCase().split(' ').includes(q.trim().toLowerCase())); if (exact || (open && res[hi])) { e.preventDefault(); e.stopPropagation(); pick(exact ?? res[hi]); } }
    else if (e.key === 'Escape') { if (open && res.length && q) { e.stopPropagation(); setOpen(false); setQ(''); } else (e.target as HTMLElement).blur(); }
  };
  return (
    <div className="relative">
      <input id={id} ref={ref} autoFocus={autoFocus} autoComplete="off" className="w-full !rounded-md !px-2.5 !py-1.5 text-[13px]" placeholder={placeholder} value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)} onKeyDown={onKey} />
      {open && res.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-72 w-full min-w-[280px] overflow-auto rounded-md border border-line bg-white shadow-lg">
          {res.map((o, i) => <li key={o.id} onMouseDown={(e) => { e.preventDefault(); pick(o); }} onMouseEnter={() => setHi(i)} className={`cursor-pointer px-2.5 py-1.5 text-[13px] ${i === hi ? 'bg-sage-bg' : ''}`}><span className="font-medium">{o.label}</span>{o.sub && <span className="ml-2 text-[12px] text-steel">{o.sub}</span>}</li>)}
        </ul>
      )}
    </div>
  );
}
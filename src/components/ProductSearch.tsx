'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScanLine, Search } from 'lucide-react';
import { useStore } from '@/lib/store';
import { emojiFor } from '@/lib/categories';
import { stockTotal } from '@/lib/rules';
import { Product } from '@/lib/types';

export const productPath = (p: Product) => [p.cat, p.brand, p.model, p.variant].filter(Boolean).join(' / ');
export const EmojiTile = ({ cat, size = 40 }: { cat: string; size?: number }) => (
  <span className="flex shrink-0 items-center justify-center rounded-xl bg-paper" style={{ width: size, height: size, fontSize: size * 0.52 }}>{emojiFor(cat)}</span>
);

/** Search by any word of the name, company, category or SKU. Arrow keys and Enter work. */
export function ProductSearch({ onPick, onScan, placeholder = 'Search by name, company or SKU', autoFocus = false }: { onPick: (p: Product) => void; onScan?: () => void; placeholder?: string; autoFocus?: boolean }) {
  const products = useStore((s) => s.products);
  const [q, setQ] = useState(''); const [open, setOpen] = useState(false); const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const res = useMemo(() => {
    const t = q.trim().toLowerCase(); if (t.length < 2) return [];
    const words = t.split(/\s+/); const out: Product[] = [];
    for (const p of products) {
      const h = `${p.name} ${p.sku} ${p.cat} ${p.brand ?? ''} ${p.model ?? ''} ${p.variant ?? ''}`.toLowerCase();
      if (words.every((w) => h.includes(w))) { out.push(p); if (out.length >= 8) break; }
    }
    return out;
  }, [q, products]);
  useEffect(() => setHi(0), [q]);
  useEffect(() => {
    const f = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f);
  }, []);
  const pick = (p: Product) => { onPick(p); setQ(''); setOpen(false); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(res.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter' && res[hi]) { e.preventDefault(); pick(res[hi]); }
    else if (e.key === 'Escape') setOpen(false);
  };
  return (
    <div ref={box} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-steel" />
          <input autoFocus={autoFocus} value={q} placeholder={placeholder} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
            className="w-full !rounded-2xl !py-3.5 !pl-12 !pr-4 !text-base" />
        </div>
        {onScan && <button type="button" onClick={onScan} className="flex items-center gap-2 rounded-2xl border border-line bg-white px-4 text-sm font-medium hover:bg-paper"><ScanLine className="h-5 w-5" />Scan</button>}
      </div>
      {open && q.trim().length >= 2 && (
        <div className="absolute z-30 mt-2 max-h-[26rem] w-full overflow-auto rounded-2xl border border-line bg-white p-1.5 shadow-lg">
          {res.length === 0 && <div className="px-4 py-6 text-center text-sm text-steel">No product matches &quot;{q}&quot;</div>}
          {res.map((p, i) => (
            <button key={p.id} type="button" onMouseEnter={() => setHi(i)} onClick={() => pick(p)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${i === hi ? 'bg-sage-bg/70' : ''}`}>
              <EmojiTile cat={p.cat} />
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{p.name}</span><span className="block truncate text-xs text-steel">{productPath(p)}</span></span>
              <span className="shrink-0 text-right text-xs text-steel">
                {stockTotal(p) === 0 ? <span className="rounded-full bg-blush-bg px-2 py-0.5 font-medium text-blush-fg">none in stock</span> : <>Shop <b className="text-ink">{p.stock[0]}</b>, G1 <b className="text-ink">{p.stock[1]}</b>, G2 <b className="text-ink">{p.stock[2]}</b></>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
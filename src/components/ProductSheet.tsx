'use client';
import { Check, ScanLine, X } from 'lucide-react';
import { LOCS, Product } from '@/lib/types';
import { fmtPrice } from '@/lib/pricing';
import { stockTotal } from '@/lib/rules';

/** What a salesman sees after scanning a product's QR: the product, its prices and where the stock is. */
export function ProductSheet({ p, onClose, onAdd, onNext, added, tier }: { p: Product; tier?: number | null; onClose: () => void; onAdd?: () => void; onNext: () => void; added?: boolean }) {
  const total = stockTotal(p); const hasMrp = (p.mrp ?? 0) > 0;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[26px] bg-white p-5 sm:rounded-[26px]" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Scanned product">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-steel">{p.cat}{p.sub ? ` › ${p.sub}` : ''}</div>
            <h2 className="mt-0.5 font-display text-xl font-semibold leading-tight">{p.model || p.name}</h2>
            {p.color && <div className="mt-0.5 text-sm text-steel">{p.color}{p.size ? ` · ${p.size}` : ''}</div>}
            <div className="mt-1 font-mono text-[13px] text-steel">{p.sku}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 hover:bg-paper"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-4 rounded-2xl bg-paper px-4 py-3">
          <div className="text-xs text-steel">MRP</div>
          <div className="font-display text-3xl font-semibold tabular-nums">{hasMrp ? '₹' + fmtPrice(p.mrp!) : 'Not set'}</div>
        </div>

        {hasMrp && (tier === null || tier === undefined
          ? <p className="mt-3 rounded-2xl bg-butter px-4 py-3 text-sm">Select the rate on the bill first to see the price.</p>
          : <div className="mt-3 flex items-center justify-between rounded-2xl border-2 border-gold bg-sage-bg/60 px-4 py-3">
              <div className="text-sm font-medium">Price</div>
              <div className="font-display text-3xl font-semibold tabular-nums">₹{fmtPrice(p.prices[tier])}</div>
            </div>)}

        <div className="mt-3 rounded-2xl border border-line">
          <div className="flex items-center justify-between border-b border-line px-4 py-2"><span className="text-xs font-semibold uppercase tracking-wide text-steel">Stock</span>
            <span className={`text-sm font-semibold ${total > 0 ? 'text-good' : 'text-blush-fg'}`}>{total > 0 ? `${total} ${p.unit}` : 'Out of stock'}</span></div>
          {LOCS.map((l, i) => <div key={l} className="flex items-center justify-between border-b border-line/60 px-4 py-1.5 text-sm last:border-0"><span>{l}</span><span className="tabular-nums">{p.stock[i] ?? 0}</span></div>)}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onNext} className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-white py-3 font-medium"><ScanLine className="h-5 w-5" />Scan next</button>
          {onAdd ? <button onClick={onAdd} disabled={added} className="flex items-center justify-center gap-2 rounded-2xl bg-black py-3 font-medium text-white disabled:bg-good">{added ? <><Check className="h-5 w-5" />Added</> : 'Add to bill'}</button> : <button onClick={onClose} className="rounded-2xl bg-black py-3 font-medium text-white">Done</button>}
        </div>
      </div>
    </div>
  );
}
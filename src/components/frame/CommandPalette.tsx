'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { NAV } from '@/lib/nav';
import { Dialog } from '@/components/grid/Dialog';

interface Hit { key: string; kind: string; title: string; sub?: string; href: string }
/** F2 or Ctrl+K: type any part of a screen name, product, SKU, vendor, staff name or estimate number. */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter(); const products = useStore((s) => s.products); const vendors = useStore((s) => s.vendors); const staff = useStore((s) => s.staff); const bills = useStore((s) => s.bills);
  const [q, setQ] = useState(''); const [hi, setHi] = useState(0);
  const hits = useMemo<Hit[]>(() => {
    const t = q.trim().toLowerCase(); const words = t.split(/\s+/).filter(Boolean); const all = (s: string) => words.every((w) => s.toLowerCase().includes(w));
    const out: Hit[] = NAV.filter((n) => !t || all(n.title + ' ' + (n.words ?? ''))).map((n) => ({ key: n.href, kind: 'Screen', title: n.title, sub: 'g ' + n.g, href: n.href }));
    if (t.length >= 2) {
      let c = 0; for (const p of products) { if (all(p.name + ' ' + p.sku + ' ' + (p.brand ?? ''))) { out.push({ key: p.id, kind: 'Product', title: p.name, sub: p.sku, href: `/admin/products/${p.id}` }); if (++c >= 8) break; } }
      vendors.filter((v) => all(v.name)).slice(0, 4).forEach((v) => out.push({ key: v.id, kind: 'Vendor', title: v.name, href: `/admin/vendors/${v.id}` }));
      staff.filter((s) => s.role === 'salesman' && all(s.name)).slice(0, 4).forEach((s) => out.push({ key: s.id, kind: 'Staff', title: s.name, href: `/admin/staff/${s.id}` }));
      bills.filter((b) => b.kind === 'estimate' && all(b.no)).slice(0, 4).forEach((b) => out.push({ key: b.id, kind: 'Estimate', title: b.no, href: `/admin/estimates/${b.id}` }));
    }
    return out.slice(0, 14);
  }, [q, products, vendors, staff, bills]);
  const go = (h?: Hit) => { if (!h) return; onClose(); router.push(h.href); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(hits.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(hits[hi]); }
  };
  return (
    <Dialog title="Go to…" onClose={onClose} width="max-w-xl">
      <input data-autofocus autoComplete="off" className="w-full !rounded-md !px-3 !py-2 text-[14px]" placeholder="Screen, product, SKU, vendor, staff or estimate number" value={q} onChange={(e) => { setQ(e.target.value); setHi(0); }} onKeyDown={onKey} />
      <ul className="mt-2 max-h-80 overflow-auto">
        {hits.map((h, i) => <li key={h.kind + h.key} onMouseEnter={() => setHi(i)} onMouseDown={(e) => { e.preventDefault(); go(h); }} className={`flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 text-[13px] ${i === hi ? 'bg-sage-bg' : ''}`}><span className="w-16 shrink-0 text-[11px] uppercase text-steel">{h.kind}</span><span className="flex-1 truncate font-medium">{h.title}</span>{h.sub && <span className="text-[12px] text-steel">{h.sub}</span>}</li>)}
        {!hits.length && <li className="px-2 py-4 text-center text-[13px] text-steel">Nothing found</li>}
      </ul>
    </Dialog>
  );
}

'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, MessageCircle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { isLow, packBreakdown, stockTotal } from '@/lib/rules';
import { LOCS, Product, Vendor } from '@/lib/types';
import { useScreenKeys } from '@/lib/hotkeys';
import { DataGrid } from '@/components/grid/DataGrid';
import { ScreenHead } from '@/components/grid/Screen';
import { Panel } from '@/components/grid/Panel';
import { toast } from '@/components/grid/Toast';

type Sev = 'out' | 'critical' | 'low';
interface Item { p: Product; tot: number; sev: Sev; need: number; vid: string }
const SEV_LABEL: Record<Sev, string> = { out: 'Sold out', critical: 'Critical', low: 'Running low' };
const SEV_CLS: Record<Sev, string> = { out: 'font-semibold text-blush-fg', critical: 'font-semibold text-butter-fg', low: 'text-steel' };
const orderText = (v: Vendor | null, list: Item[]) => `Hello${v ? ' ' + v.name : ''}, we would like to order:\n${list.map((i) => `- ${i.p.name}: ${i.need} ${i.p.unit}`).join('\n')}\nThank you, National Traders`;

/** Low Stock: everything at or below its minimum, with a suggested order (tops up to twice the minimum) and an order list per vendor. */
export default function LowStock() {
  const router = useRouter(); const { products, purchases, vendors } = useStore();
  const [q, setQ] = useState(''); const [sev, setSev] = useState<Sev | 'all'>('all'); const [cat, setCat] = useState(''); const [vsel, setVsel] = useState<string | null>(null);
  const vendorOf = useMemo(() => { const m = new Map<string, { vid: string; date: string }>(); for (const pu of purchases) for (const l of pu.lines) { const c = m.get(l.pid); if (!c || pu.date > c.date) m.set(l.pid, { vid: pu.vendorId, date: pu.date }); } return m; }, [purchases]);
  const all: Item[] = useMemo(() => products.filter(isLow).map((p) => {
    const tot = stockTotal(p); const r = tot / Math.max(1, p.min);
    return { p, tot, sev: (tot === 0 ? 'out' : r <= 0.35 ? 'critical' : 'low') as Sev, need: Math.max(1, p.min * 2 - tot), vid: p.vendorId || vendorOf.get(p.id)?.vid || '' };
  }), [products, vendorOf]);
  const vname = (id: string) => vendors.find((v) => v.id === id)?.name ?? '';
  const cats = useMemo(() => Array.from(new Set(all.map((i) => i.p.cat))).sort(), [all]);
  const rows = useMemo(() => {
    const w = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return all.filter((i) => (sev === 'all' || i.sev === sev) && (!cat || i.p.cat === cat) && (!w.length || w.every((x) => `${i.p.name} ${i.p.sku} ${i.p.cat} ${i.p.brand ?? ''}`.toLowerCase().includes(x))))
      .sort((a, b) => a.tot / Math.max(1, a.p.min) - b.tot / Math.max(1, b.p.min) || a.p.name.localeCompare(b.p.name));
  }, [all, q, sev, cat]);
  const n = (s: Sev) => all.filter((i) => i.sev === s).length;
  const groups = useMemo(() => { const m = new Map<string, Item[]>(); rows.forEach((i) => m.set(i.vid, [...(m.get(i.vid) ?? []), i])); return [...m].sort((a, b) => (a[0] ? 0 : 1) - (b[0] ? 0 : 1) || b[1].length - a[1].length); }, [rows]);
  const gl = (vsel === null ? undefined : groups.find(([k]) => k === vsel)) ?? groups[0]; const gv = gl ? vendors.find((v) => v.id === gl[0]) ?? null : null;
  const text = gl ? orderText(gv, gl[1]) : ''; const wa = gv && /^\d{10}$/.test(gv.phone) ? `https://wa.me/91${gv.phone}?text=${encodeURIComponent(text)}` : '';
  const copy = async () => { try { await navigator.clipboard.writeText(text); } catch { /* clipboard may be blocked */ } toast('Order list copied'); };
  useScreenKeys([{ key: '/', label: 'Search', run: () => document.getElementById('ls-q')?.focus() }]);
  const sel = 'rounded-md border border-line bg-white px-2 py-1.5 text-[13px]';
  return (
    <div>
      <ScreenHead title="Low Stock" hint={`${all.length} items at or below their minimum: ${n('out')} sold out, ${n('critical')} critical, ${n('low')} running low. Suggested order tops each item up to twice its minimum.`}>
        <select aria-label="Status" className={sel} value={sev} onChange={(e) => setSev(e.target.value as Sev)}><option value="all">All</option><option value="out">Sold out</option><option value="critical">Critical</option><option value="low">Running low</option></select>
        <select aria-label="Category" className={sel} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
        <input id="ls-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search   ( / )" className="!w-48 !rounded-md !px-2.5 !py-1.5 text-[13px]" />
      </ScreenHead>
      <DataGrid csvName="reorder-list" rows={rows} rowKey={(i) => i.p.id} onOpen={(i) => router.push(`/admin/products/${i.p.id}`)} openOnClick maxH="calc(100vh - 420px)" empty={all.length ? 'No item matches these filters' : 'Nothing is running low. Every item is above its minimum.'}
        cols={[
          { h: 'Item', v: (i) => i.p.name, csv: (i) => i.p.name, sort: (i) => i.p.name },
          { h: 'Code', v: (i) => <span className="font-mono text-[12px]">{i.p.sku}</span>, csv: (i) => i.p.sku, w: '110px' },
          { h: 'Status', v: (i) => <span className={SEV_CLS[i.sev]}>{SEV_LABEL[i.sev]}</span>, csv: (i) => SEV_LABEL[i.sev], sort: (i) => i.tot / Math.max(1, i.p.min) },
          { h: 'In stock', right: true, v: (i) => <b>{packBreakdown(i.tot, i.p.unit, i.p.packs)}</b>, csv: (i) => i.tot, sort: (i) => i.tot },
          { h: 'Minimum', right: true, v: (i) => i.p.min, csv: (i) => i.p.min, sort: (i) => i.p.min },
          ...LOCS.map((l, k) => ({ h: l, right: true, v: (i: Item) => i.p.stock[k] ?? 0, csv: (i: Item) => i.p.stock[k] ?? 0 })),
          { h: 'Order', right: true, v: (i) => <b>{i.need}</b>, csv: (i) => i.need, sort: (i) => i.need },
          { h: 'Vendor', v: (i) => vname(i.vid) || <span className="text-steel">none yet</span>, csv: (i) => vname(i.vid), sort: (i) => vname(i.vid) },
        ]} />
      {groups.length > 0 && (
        <div className="mt-3 max-w-3xl">
          <Panel title="Order list by vendor" hint="Vendor is the item's default vendor, or whoever you last bought it from">
            <div className="flex flex-wrap items-center gap-2 py-2">
              <select aria-label="Vendor" className={sel} value={gl?.[0] ?? ''} onChange={(e) => setVsel(e.target.value)}>{groups.map(([k, l]) => <option key={k} value={k}>{vname(k) || 'No vendor yet'} ({l.length})</option>)}</select>
              {gv && <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1.5 text-[13px] hover:bg-paper"><Copy className="h-4 w-4" />Copy order list</button>}
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-ink bg-ink px-2.5 py-1.5 text-[13px] text-white"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
              {gv && <Link href={`/admin/stockin?vendor=${gv.id}`} className="text-[13px] underline">Record delivery from {gv.name}</Link>}
            </div>
            <pre className="mb-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-paper p-2.5 text-[12.5px]">{text}</pre>
          </Panel>
        </div>
      )}
    </div>
  );
}
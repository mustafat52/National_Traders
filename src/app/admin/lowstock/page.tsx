'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRightLeft, Check, Copy, Download, MessageCircle, PackagePlus, Pencil, Search } from 'lucide-react';
import { useStore } from '@/lib/store';
import { emojiFor } from '@/lib/categories';
import { download, isLow, stockTotal, toCsv } from '@/lib/rules';
import { LOCS, Product, Vendor } from '@/lib/types';
import { CountUp, GrowBar } from '@/components/CountUp';
import { EmojiTile, productPath } from '@/components/ProductSearch';
import { Stepper } from '@/components/Stepper';

type Sev = 'out' | 'critical' | 'low';
interface Item { p: Product; tot: number; ratio: number; sev: Sev; need: number }
const SEV: Record<Sev, { label: string; bar: string; chip: string; box: string }> = {
  out: { label: 'Sold out', bar: '#D9705F', chip: 'bg-blush-bg text-blush-fg', box: 'bg-blush-bg text-blush-fg' },
  critical: { label: 'Critical', bar: '#E08A3C', chip: 'bg-butter-bg text-butter-fg', box: 'bg-butter-bg text-butter-fg' },
  low: { label: 'Running low', bar: '#8FA05E', chip: 'bg-sage-bg text-sage-fg', box: 'bg-sage-bg text-sage-fg' },
};
const LOCC = ['#B8892B', '#8FA05E', '#EAD9A3'];
const card = 'rounded-[22px] border border-line bg-panel';
const PAGE = 30;
const orderText = (v: Vendor | null, list: Item[]) =>
  `Hello${v ? ' ' + v.name : ''}, we would like to order:\n${list.map((i) => `- ${i.p.name}: ${i.need} ${i.p.unit}`).join('\n')}\nThank you, National Traders`;

export default function LowStock() {
  const { products, purchases, vendors, saveProduct } = useStore();
  const [sev, setSev] = useState<Sev | 'all'>('all'); const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState(''); const [sort, setSort] = useState<'urgent' | 'need' | 'name'>('urgent');
  const [view, setView] = useState<'all' | 'vendor'>('all'); const [shown, setShown] = useState(PAGE); const [note, setNote] = useState('');
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(''), 4500); return () => clearTimeout(t); }, [note]);
  useEffect(() => setShown(PAGE), [sev, cat, q, sort, view]);

  const all: Item[] = useMemo(() => products.filter(isLow).map((p) => {
    const tot = stockTotal(p); const ratio = tot / Math.max(1, p.min);
    return { p, tot, ratio, sev: (tot === 0 ? 'out' : ratio <= 0.35 ? 'critical' : 'low') as Sev, need: Math.max(1, p.min * 2 - tot) };
  }), [products]);
  const vendorOf = useMemo(() => { const m = new Map<string, { vid: string; date: string }>(); for (const pu of purchases) for (const l of pu.lines) { const c = m.get(l.pid); if (!c || pu.date > c.date) m.set(l.pid, { vid: pu.vendorId, date: pu.date }); } return m; }, [purchases]);
  const vname = (pid: string) => vendors.find((v) => v.id === vendorOf.get(pid)?.vid)?.name;

  const text = q.trim().toLowerCase();
  const byText = useMemo(() => all.filter((i) => !text || `${i.p.name} ${i.p.sku} ${i.p.cat} ${i.p.brand ?? ''}`.toLowerCase().includes(text)), [all, text]);
  const bySev = byText.filter((i) => sev === 'all' || i.sev === sev);
  const counts = { out: byText.filter((i) => i.sev === 'out').length, critical: byText.filter((i) => i.sev === 'critical').length, low: byText.filter((i) => i.sev === 'low').length };
  const cats = useMemo(() => { const m = new Map<string, number>(); bySev.forEach((i) => m.set(i.p.cat, (m.get(i.p.cat) ?? 0) + 1)); return [...m].sort((a, b) => b[1] - a[1]); }, [bySev]);
  const items = useMemo(() => {
    const l = bySev.filter((i) => !cat || i.p.cat === cat);
    return l.sort((a, b) => (sort === 'name' ? a.p.name.localeCompare(b.p.name) : sort === 'need' ? b.need - a.need : a.ratio - b.ratio || a.p.name.localeCompare(b.p.name)));
  }, [bySev, cat, sort]);

  const groups = useMemo(() => {
    const m = new Map<string, Item[]>(); items.forEach((i) => { const k = vendorOf.get(i.p.id)?.vid ?? 'none'; if (!m.has(k)) m.set(k, []); m.get(k)!.push(i); });
    return [...m].map(([k, list]) => ({ vendor: vendors.find((v) => v.id === k) ?? null, list })).sort((a, b) => (a.vendor ? 0 : 1) - (b.vendor ? 0 : 1) || b.list.length - a.list.length);
  }, [items, vendorOf, vendors]);

  const setMin = (p: Product, min: number) => { saveProduct({ ...p, min }); setNote(stockTotal(p) > min ? `${p.name} is no longer low. Its minimum is now ${min}.` : `Minimum for ${p.name} set to ${min}.`); };
  const exportCsv = () => download('reorder-list.csv', toCsv([['Product', 'SKU', 'Category', 'Company', 'In stock', 'Minimum', 'Suggested order', 'Last vendor'],
    ...items.map((i) => [i.p.name, i.p.sku, i.p.cat, i.p.brand ?? '', i.tot, i.p.min, i.need, vname(i.p.id) ?? ''])]));

  const chips: { k: Sev | 'all'; label: string; n: number; cls: string }[] = [
    { k: 'all', label: 'All low stock', n: counts.out + counts.critical + counts.low, cls: 'bg-white text-ink' },
    { k: 'out', label: SEV.out.label, n: counts.out, cls: SEV.out.box }, { k: 'critical', label: SEV.critical.label, n: counts.critical, cls: SEV.critical.box }, { k: 'low', label: SEV.low.label, n: counts.low, cls: SEV.low.box },
  ];

  return (
    <div className="mx-auto max-w-[1380px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[40px] font-semibold leading-none tracking-tight">Low Stock</h1>
          <p className="mt-1 text-steel">Products at or below their minimum, most urgent first. Suggested orders top each one up to twice its minimum.</p>
        </div>
        <button onClick={exportCsv} disabled={!items.length} className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium hover:bg-paper disabled:opacity-40"><Download className="h-4 w-4" />Export reorder list</button>
      </div>

      {note && <div className="fade-up mb-4 flex items-center gap-2 rounded-2xl bg-sage-bg px-4 py-3 text-sm text-sage-fg"><Check className="h-5 w-5" />{note}</div>}

      {/* severity chips double as filters */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {chips.map((c) => (
          <button key={c.k} onClick={() => setSev(sev === c.k ? 'all' : c.k)} className={`rounded-[20px] p-4 text-left transition ${c.cls} ${sev === c.k ? 'ring-2 ring-brand' : 'border border-line hover:-translate-y-0.5'}`}>
            <div className="text-sm font-medium opacity-80">{c.label}</div>
            <div className="font-display text-[40px] font-semibold leading-none"><CountUp value={c.n} duration={700} /></div>
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] flex-1 sm:max-w-md"><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-steel" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company or SKU" className="w-full !rounded-2xl !py-3 !pl-12" /></div>
        <select value={sort} onChange={(e) => setSort(e.target.value as 'urgent')} className="!rounded-xl" aria-label="Sort"><option value="urgent">Most urgent first</option><option value="need">Largest order first</option><option value="name">Name A to Z</option></select>
        <div className="flex rounded-xl border border-line bg-white p-1 text-sm font-medium">
          {([['all', 'All items'], ['vendor', 'By vendor']] as const).map(([k, l]) => <button key={k} onClick={() => setView(k)} className={`rounded-lg px-3.5 py-1.5 ${view === k ? 'bg-brand text-white' : 'text-steel hover:text-ink'}`}>{l}</button>)}
        </div>
        <select className="!rounded-xl lg:hidden" value={cat ?? ''} onChange={(e) => setCat(e.target.value || null)} aria-label="Category"><option value="">All categories</option>{cats.map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}</select>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-12">
        {/* category rail */}
        <aside className="hidden lg:col-span-3 lg:block">
          <div className={`${card} sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto p-3`}>
            <button onClick={() => setCat(null)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium ${!cat ? 'bg-sage-bg text-sage-fg' : 'hover:bg-paper'}`}>All categories<span>{bySev.length}</span></button>
            {cats.map(([c, n]) => (
              <button key={c} onClick={() => setCat(cat === c ? null : c)} className={`mt-0.5 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm ${cat === c ? 'bg-sage-bg font-medium text-sage-fg' : 'hover:bg-paper'}`}>
                <span className="text-lg leading-none">{emojiFor(c)}</span><span className="min-w-0 flex-1 truncate">{c}</span><span className="rounded-full bg-paper px-2 py-0.5 text-xs font-medium text-steel">{n}</span>
              </button>
            ))}
            {cats.length === 0 && <p className="px-3 py-4 text-sm text-steel">No categories match.</p>}
          </div>
        </aside>

        <div className="space-y-3 lg:col-span-9">
          {items.length === 0 && (
            <div className="flex flex-col items-center rounded-[22px] border-2 border-dashed border-line px-6 py-16 text-center">
              <div className="mb-3 text-5xl">✅</div><div className="font-display text-xl font-semibold">Nothing is running low here</div>
              <p className="mt-1 max-w-sm text-sm text-steel">{all.length ? 'No items match these filters. Try clearing the search or category.' : 'Every product is above its minimum.'}</p>
            </div>
          )}

          {view === 'all' && items.slice(0, shown).map((i, n) => <Row key={i.p.id} i={i} vendor={vname(i.p.id)} onMin={setMin} delay={(n % PAGE) * 25} />)}
          {view === 'all' && items.length > shown && <button onClick={() => setShown(shown + PAGE)} className="w-full rounded-2xl border border-line bg-white py-3 font-medium hover:bg-paper">Show {Math.min(PAGE, items.length - shown)} more ({items.length - shown} left)</button>}

          {view === 'vendor' && groups.map((g) => <Group key={g.vendor?.id ?? 'none'} vendor={g.vendor} list={g.list} />)}
          {items.length > 0 && <p className="px-1 pt-1 text-xs text-steel">Showing {view === 'all' ? Math.min(shown, items.length) : items.length} of {items.length} items. Vendors are taken from your latest purchase of each product.</p>}
        </div>
      </div>
    </div>
  );
}

function Row({ i, vendor, onMin, delay }: { i: Item; vendor?: string; onMin: (p: Product, n: number) => void; delay: number }) {
  const { p, tot, ratio, sev, need } = i; const [edit, setEdit] = useState(false); const [val, setVal] = useState(p.min);
  const canMove = p.stock.some((q, k) => k > 0 && q > 0);
  return (
    <article className={`${card} fade-up grid items-center gap-x-5 gap-y-3 p-4 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_auto]`} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex min-w-0 items-center gap-3">
        <EmojiTile cat={p.cat} size={44} />
        <div className="min-w-0">
          <Link href={`/admin/products/${p.id}`} className="block truncate font-medium hover:underline">{p.name}</Link>
          <div className="truncate text-xs text-steel">{productPath(p)}</div>
          {vendor && <span className="mt-1 inline-block rounded-full bg-paper px-2 py-0.5 text-[11px] text-steel">Last bought from {vendor}</span>}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span><b className="font-display text-xl">{tot}</b> <span className="text-steel">of {p.min}</span>
            <button aria-label="Edit minimum" onClick={() => { setVal(p.min); setEdit(!edit); }} className="ml-1.5 inline-flex rounded-md p-1 text-steel hover:bg-paper hover:text-ink"><Pencil className="h-3.5 w-3.5" /></button></span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SEV[sev].chip}`}>{SEV[sev].label}</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper"><GrowBar pct={Math.max(3, Math.min(1, ratio) * 100)} color={SEV[sev].bar} /></div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-steel">{['Shop', 'G1', 'G2'].map((l, k) => <span key={l} className="whitespace-nowrap"><i className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: LOCC[k] }} />{l} <b className={p.stock[k] ? 'text-ink' : 'text-steel/50'}>{p.stock[k]}</b></span>)}</div>
        {edit && (
          <div className="fade-up mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-paper p-3 text-sm">
            <span className="text-steel">Alert me at or below</span><Stepper value={val} min={0} onChange={setVal} />
            <button onClick={() => { onMin(p, val); setEdit(false); }} className="rounded-lg bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-light">Save</button>
            <button onClick={() => setEdit(false)} className="text-steel underline underline-offset-2">Cancel</button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-start gap-2 md:items-end">
        <div className="text-xs text-steel">Suggest ordering <b className="font-display text-base text-ink">{need}</b> {p.unit}</div>
        <div className="flex gap-2">
          <Link href={`/admin/stockin?product=${p.id}`} className="flex items-center gap-1.5 rounded-xl bg-sage-bg px-3 py-2 text-sm font-semibold text-sage-fg hover:brightness-95"><PackagePlus className="h-4 w-4" />Add stock</Link>
          {canMove && <Link href={`/admin/transfers?product=${p.id}`} className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-paper"><ArrowRightLeft className="h-4 w-4" />Move</Link>}
        </div>
      </div>
    </article>
  );
}

function Group({ vendor, list }: { vendor: Vendor | null; list: Item[] }) {
  const [all, setAll] = useState(false); const [copied, setCopied] = useState(false);
  const text = orderText(vendor, list); const wa = vendor && /^\d{10}$/.test(vendor.phone) ? `https://wa.me/91${vendor.phone}?text=${encodeURIComponent(text)}` : '';
  const copy = async () => { try { await navigator.clipboard.writeText(text); } catch { /* clipboard may be blocked */ } setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const rows = all ? list : list.slice(0, 6);
  return (
    <section className={`${card} fade-up overflow-hidden`}>
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-paper/60 px-5 py-4">
        <div className="min-w-0 flex-1"><div className="font-display text-xl font-semibold">{vendor ? vendor.name : 'No vendor yet'}</div><div className="text-xs text-steel">{vendor ? `${vendor.phone}, ${vendor.terms}. ` : 'These products have never been purchased. '}{list.length} {list.length === 1 ? 'item' : 'items'} to order</div></div>
        {vendor && <button onClick={copy} className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-paper">{copied ? <><Check className="h-4 w-4 text-sage-fg" />Copied</> : <><Copy className="h-4 w-4" />Copy order list</>}</button>}
        {wa && <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-light"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
      </div>
      <ul className="divide-y divide-line px-5">
        {rows.map((i) => (
          <li key={i.p.id} className="flex items-center gap-3 py-2.5 text-sm">
            <EmojiTile cat={i.p.cat} size={32} /><Link href={`/admin/products/${i.p.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">{i.p.name}</Link>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEV[i.sev].chip}`}>{i.tot} of {i.p.min}</span>
            <span className="w-24 text-right text-steel">order <b className="font-display text-base text-ink">{i.need}</b></span>
          </li>
        ))}
      </ul>
      {list.length > 6 && <button onClick={() => setAll(!all)} className="w-full border-t border-line py-2.5 text-sm font-medium text-brand hover:bg-paper">{all ? 'Show fewer' : `Show all ${list.length}`}</button>}
    </section>
  );
}
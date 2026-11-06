'use client';
import { useRouter } from 'next/navigation';
import { LOCS } from '@/lib/types';
import { isLow, money, packBreakdown, stockTotal } from '@/lib/rules';
import { DataGrid } from '@/components/grid/DataGrid';
import { ScreenHead } from '@/components/grid/Screen';
import { useProductFilters } from '@/components/grid/ProductFilters';

/** Stock Position: how much is where. Read only. Stock is added on Stock In and corrected on Stock Count. */
export default function StockPosition() {
  const router = useRouter(); const { list, bar } = useProductFilters();
  const value = list.reduce((a, p) => a + stockTotal(p) * p.pp, 0);
  return (
    <div>
      <ScreenHead title="Stock Position" hint="Read only. To add stock use Stock In (F7). To correct a count use Stock Count." />
      {bar}
      <DataGrid csvName="stock-position" rows={list} rowKey={(p) => p.id} onOpen={(p) => router.push(`/admin/products/${p.id}`)}
        foot={<span>Value at purchase price <b className="text-ink">{money(value)}</b></span>}
        cols={[
          { h: 'SKU', v: (p) => <span className="font-mono text-[12px]">{p.sku}</span>, csv: (p) => p.sku, w: '130px' },
          { h: 'Product', v: (p) => p.name, csv: (p) => p.name },
          ...LOCS.map((l, i) => ({ h: l, right: true, v: (p: typeof list[number]) => p.stock[i] ?? 0, csv: (p: typeof list[number]) => p.stock[i] ?? 0 })),
          { h: 'Total', right: true, v: (p) => <span className={isLow(p) ? 'font-semibold text-blush-fg' : 'font-semibold'}>{packBreakdown(stockTotal(p), p.unit, p.packs)}</span>, csv: stockTotal, sort: stockTotal },
          { h: 'Alert at', right: true, v: (p) => p.min, csv: (p) => p.min },
          { h: 'Value', right: true, v: (p) => money(stockTotal(p) * p.pp), csv: (p) => stockTotal(p) * p.pp, sort: (p) => stockTotal(p) * p.pp },
        ]} />
    </div>
  );
}

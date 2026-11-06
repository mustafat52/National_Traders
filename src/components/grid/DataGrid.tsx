'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useScreenKeys } from '@/lib/hotkeys';
import { download, toCsv } from '@/lib/rules';
import { cx } from '@/components/ui';
import { toast } from './Toast';

export interface GCol<T> { h: string; v: (r: T) => React.ReactNode; csv?: (r: T) => string | number; sort?: (r: T) => string | number; right?: boolean; w?: string }

/** The list pattern: dense table, arrow keys move the row, Enter opens it, click a heading to sort, Ctrl+E exports. */
export function DataGrid<T>({ cols, rows, rowKey, onOpen, csvName, pageSize = 100, empty = 'Nothing to show', rowClass, foot, primary = true, maxH, onActive, openOnClick }: {
  cols: GCol<T>[]; rows: T[]; rowKey: (r: T) => string; onOpen?: (r: T) => void; csvName?: string; pageSize?: number; empty?: string; rowClass?: (r: T) => string; foot?: React.ReactNode; primary?: boolean; maxH?: string; /** open a row with a single click */ openOnClick?: boolean; /** called with the highlighted row whenever it changes */ onActive?: (r: T) => void;
}) {
  const [sel, setSel] = useState(0); const [sortBy, setSortBy] = useState<{ i: number; dir: 1 | -1 } | null>(null);
  const body = useRef<HTMLTableSectionElement>(null); const [armed, setArmed] = useState(primary);
  const sorted = useMemo(() => {
    if (!sortBy) return rows; const c = cols[sortBy.i]; const f = c.sort ?? c.csv ?? ((r: T) => { const x = c.v(r); return typeof x === 'number' || typeof x === 'string' ? x : ''; });
    return [...rows].sort((a, b) => { const x = f(a), y = f(b); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * sortBy.dir; });
  }, [rows, sortBy, cols]);
  const n = sorted.length; const cur = Math.min(sel, Math.max(0, n - 1)); const page = Math.floor(cur / pageSize);
  const slice = sorted.slice(page * pageSize, page * pageSize + pageSize);
  useEffect(() => { setSel(0); }, [rows.length]);
  useEffect(() => { if (onActive && sorted[cur]) onActive(sorted[cur]); }, [cur, sorted]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { body.current?.querySelector<HTMLElement>('[data-sel="1"]')?.scrollIntoView({ block: 'nearest' }); }, [cur, page]);
  const go = (i: number) => setSel(Math.max(0, Math.min(n - 1, i)));
  const exportCsv = () => { if (!csvName) return; download(csvName + '.csv', toCsv([cols.map((c) => c.h), ...sorted.map((r) => cols.map((c) => { if (c.csv) return c.csv(r); const x = c.v(r); return typeof x === 'string' || typeof x === 'number' ? x : ''; }))])); toast('Exported ' + n.toLocaleString('en-IN') + ' rows'); };
  useScreenKeys(!armed ? [] : [
    { key: 'Down', label: '', run: () => go(cur + 1), hidden: true, typing: true }, { key: 'Up', label: '', run: () => go(cur - 1), hidden: true, typing: true },
    { key: 'PgDn', label: '', run: () => go(cur + 15), hidden: true, typing: true }, { key: 'PgUp', label: '', run: () => go(cur - 15), hidden: true, typing: true },
    ...(onOpen ? [{ key: 'Enter', label: 'Open', run: () => { if (sorted[cur]) onOpen(sorted[cur]); }, typing: true }] : []),
    ...(csvName ? [{ key: 'Ctrl+E', label: 'Export', run: exportCsv }] : []),
  ]);
  return (
    <div tabIndex={primary ? undefined : 0} onMouseEnter={() => !primary && setArmed(true)} onMouseLeave={() => !primary && setArmed(false)} onFocus={() => !primary && setArmed(true)} onBlur={() => !primary && setArmed(false)} className="outline-none">
      <div className="overflow-auto rounded-md border border-line bg-white" style={{ maxHeight: maxH ?? 'calc(100vh - 250px)' }}>
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-paper text-[11px] uppercase tracking-wide text-steel">
            <tr>{cols.map((c, i) => <th key={c.h + i} onClick={() => setSortBy(sortBy?.i === i ? { i, dir: (sortBy.dir * -1) as 1 | -1 } : { i, dir: 1 })} style={c.w ? { width: c.w } : undefined} className={cx('cursor-pointer select-none whitespace-nowrap border-b border-line px-2.5 py-1.5 font-semibold hover:text-ink', c.right ? 'text-right' : 'text-left')}>{c.h}{sortBy?.i === i && (sortBy.dir === 1 ? ' ▲' : ' ▼')}</th>)}</tr>
          </thead>
          <tbody ref={body}>
            {slice.map((r, k) => { const idx = page * pageSize + k; const on = idx === cur; return (
              <tr key={rowKey(r)} data-sel={on ? 1 : 0} onClick={() => { setSel(idx); if (openOnClick) onOpen?.(r); }} onDoubleClick={() => onOpen?.(r)} className={cx('border-b border-line/70', on ? 'bg-sage-bg/70 shadow-[inset_3px_0_0_#B8892B]' : 'hover:bg-paper/70', onOpen && 'cursor-pointer', rowClass?.(r))}>
                {cols.map((c, i) => <td key={c.h + i} className={cx('px-2.5 py-1', c.right && 'text-right tabular-nums')}>{c.v(r)}</td>)}
              </tr>); })}
            {!n && <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-steel">{empty}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[12px] text-steel">
        <span>{n ? `Row ${(cur + 1).toLocaleString('en-IN')} of ${n.toLocaleString('en-IN')}` : '0 rows'}{n > pageSize && ` · page ${page + 1} of ${Math.ceil(n / pageSize)}`}</span>
        {foot}
      </div>
    </div>
  );
}
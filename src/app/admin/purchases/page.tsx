'use client';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { fmtDate, money } from '@/lib/rules';
import { Btn, DataTable, PageTitle } from '@/components/ui';

export default function Purchases() {
  const { purchases, vendors } = useStore();
  return (
    <>
      <PageTitle title="Purchases" sub="Stock received from vendors"><Link href="/admin/purchases/new"><Btn><Plus className="h-4 w-4" />New purchase</Btn></Link></PageTitle>
      <DataTable csv="purchases" rows={purchases} cols={[
        { h: 'No.', v: (p) => p.no }, { h: 'Date', v: (p) => fmtDate(p.date) }, { h: 'Vendor', v: (p) => vendors.find((v) => v.id === p.vendorId)?.name },
        { h: 'Vendor bill', v: (p) => p.billNo }, { h: 'Items', v: (p) => p.lines.length, right: true }, { h: 'Total', v: (p) => money(p.total), csv: (p) => p.total, right: true },
      ]} />
    </>
  );
}

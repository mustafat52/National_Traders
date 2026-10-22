'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeftRight, AlertTriangle, Boxes, FileText, LayoutDashboard, LogOut, PackagePlus, Settings, Truck, Users, type LucideIcon } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useGuard } from '@/components/Shell';
import { cx } from '@/components/ui';

type Item = [string, string, LucideIcon];
const GROUPS: { label: string; items: Item[] }[] = [
  { label: '', items: [['/admin', 'Dashboard', LayoutDashboard]] },
  { label: 'Stock', items: [['/admin/products', 'Products & Prices', Boxes], ['/admin/stockin', 'Stock In (Incoming)', PackagePlus], ['/admin/transfers', 'Stock Transfers', ArrowLeftRight], ['/admin/lowstock', 'Low Stock', AlertTriangle]] },
  { label: 'Buying', items: [['/admin/vendors', 'Vendors & Payables', Truck]] },
  { label: 'Team and reports', items: [['/admin/staff', 'Staff & Attendance', Users], ['/admin/reports', 'Reports', FileText]] },
];
const ALL: Item[] = [...GROUPS.flatMap((g) => g.items), ['/admin/settings', 'Settings', Settings]];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = useGuard('admin'); const path = usePathname(); const router = useRouter(); const logout = useStore((s) => s.logout);
  if (!session) return null;
  const active = (href: string) => (href === '/admin' ? path === href : path.startsWith(href));
  const link = (href: string, label: string, Icon: LucideIcon) => (
    <Link key={href} href={href} className={cx('mx-3 flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] transition-colors', active(href) ? 'bg-sage-bg font-semibold text-sage-fg' : 'text-steel hover:bg-white hover:text-ink')}>
      <Icon className="h-[18px] w-[18px]" />{label}
    </Link>
  );
  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line py-6 md:flex">
        <div className="mb-7 flex items-center gap-3 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand font-display text-lg font-bold text-white">NT</div>
          <div className="font-display text-lg font-semibold leading-5">National Traders<div className="font-sans text-xs font-normal text-steel">Back office</div></div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {GROUPS.map((g) => (
            <div key={g.label || 'top'} className="pb-3">
              {g.label && <div className="px-6 pb-1 pt-2 text-xs text-steel/80">{g.label}</div>}
              {g.items.map(([h, l, I]) => link(h, l, I))}
            </div>
          ))}
        </nav>
        <div className="space-y-0.5 border-t border-line pt-3">
          {link('/admin/settings', 'Settings', Settings)}
          <button onClick={() => { logout(); router.push('/login'); }} className="mx-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl px-3 py-2 text-[15px] text-steel hover:bg-white hover:text-ink"><LogOut className="h-[18px] w-[18px]" />Log out</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-10">
        <div className="no-print mb-4 flex gap-1 overflow-x-auto md:hidden">{ALL.map(([href, label]) => <Link key={href} href={href} className={cx('whitespace-nowrap rounded-full px-3 py-1 text-xs', active(href) ? 'bg-brand text-white' : 'bg-white')}>{label}</Link>)}</div>
        {children}
      </main>
    </div>
  );
}
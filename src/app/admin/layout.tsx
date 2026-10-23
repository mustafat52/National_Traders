'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeftRight, AlertTriangle, Boxes, FileText, LayoutDashboard, LogOut, PackagePlus, Settings, Truck, Users, CalendarDays, Wallet, TrendingUp, ClipboardCheck, type LucideIcon } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useGuard } from '@/components/Shell';
import { cx } from '@/components/ui';

type Item = [string, string, LucideIcon];
const GROUPS: { label: string; items: Item[] }[] = [
  { label: '', items: [['/admin', 'Dashboard', LayoutDashboard]] },
  { label: 'Sales', items: [['/admin/business', 'Business', TrendingUp], ['/admin/estimates', 'Estimates', ClipboardCheck]] },
  { label: 'Stock', items: [['/admin/products', 'Products & Prices', Boxes], ['/admin/stockin', 'Stock In (Incoming)', PackagePlus], ['/admin/transfers', 'Stock Transfers', ArrowLeftRight], ['/admin/lowstock', 'Low Stock', AlertTriangle]] },
  { label: 'Buying', items: [['/admin/vendors', 'Vendors & Payables', Truck]] },
  { label: 'Team and reports', items: [['/admin/staff', 'Staff & Attendance', Users], ['/admin/leaves', 'Leave Requests', CalendarDays], ['/admin/payroll', 'Salaries & Payroll', Wallet], ['/admin/reports', 'Reports', FileText]] },
];
const ALL: Item[] = [...GROUPS.flatMap((g) => g.items), ['/admin/settings', 'Settings', Settings]];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = useGuard('admin'); const pendingLeaves = useStore((st) => st.leaves.filter((l) => l.status === 'pending').length); const openEst = useStore((st) => st.bills.filter((b) => b.kind === 'estimate' && b.status === 'open' && (!b.validUntil || new Date(b.validUntil).getTime() > Date.now())).length); const path = usePathname(); const router = useRouter(); const logout = useStore((s) => s.logout);
  if (!session) return null;
  const active = (href: string) => (href === '/admin' ? path === href : path.startsWith(href));
  const link = (href: string, label: string, Icon: LucideIcon) => (
    <Link key={href} href={href} className={cx('mx-3 flex items-center gap-3 rounded-xl px-3 py-1.5 text-[14px] transition-colors', active(href) ? 'bg-gold-light/15 font-semibold text-gold-light' : 'text-white/70 hover:bg-white/10 hover:text-white')}>
      <Icon className="h-[18px] w-[18px]" />{label}{href === '/admin/estimates' && openEst > 0 && <span className="ml-auto rounded-full bg-butter-bg px-2 py-0.5 text-xs font-semibold text-butter-fg">{openEst}</span>}{href === '/admin/leaves' && pendingLeaves > 0 && <span className="ml-auto rounded-full bg-butter-bg px-2 py-0.5 text-xs font-semibold text-butter-fg">{pendingLeaves}</span>}
    </Link>
  );
  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-black py-3 md:flex">
        <div className="mb-2 px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-header.png" alt="National Traders" className="mx-auto w-40" />
          <div className="text-center text-[10px] tracking-[0.2em] text-gold-light/80">BACK OFFICE</div>
        </div>
        <nav className="nav-scroll flex-1 space-y-0.5 overflow-y-auto">
          {GROUPS.map((g) => (
            <div key={g.label || 'top'} className="pb-1.5">
              {g.label && <div className="px-6 pb-0.5 pt-1.5 text-[11px] text-white/40">{g.label}</div>}
              {g.items.map(([h, l, I]) => link(h, l, I))}
            </div>
          ))}
        </nav>
        <div className="space-y-0.5 border-t border-white/10 pt-2">
          {link('/admin/settings', 'Settings', Settings)}
          <button onClick={() => { logout(); router.push('/login'); }} className="mx-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl px-3 py-1.5 text-[14px] text-white/70 hover:bg-white/10 hover:text-white"><LogOut className="h-[18px] w-[18px]" />Log out</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-10">
        <div className="no-print mb-4 flex gap-1 overflow-x-auto md:hidden">{ALL.map(([href, label]) => <Link key={href} href={href} className={cx('whitespace-nowrap rounded-full px-3 py-1 text-xs', active(href) ? 'bg-brand text-white' : 'bg-white')}>{label}</Link>)}</div>
        {children}
      </main>
    </div>
  );
}
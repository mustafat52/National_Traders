'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FilePlus2, History, Home, MapPin, Undo2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useGuard } from '@/components/Shell';
import { cx } from '@/components/ui';

const NAV = [['/staff', 'Home', Home], ['/staff/bill', 'New bill', FilePlus2], ['/staff/history', 'History', History], ['/staff/returns', 'Returns', Undo2]] as const;
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = useGuard('staff'); const { insideShop, setInside, logout, staff } = useStore(); const path = usePathname(); const router = useRouter();
  // Location rule: leaving the shop ends the session automatically and records the gap in attendance.
  useEffect(() => { if (session && !insideShop) { logout(true); router.replace('/login'); } }, [session, insideShop, logout, router]);
  if (!session) return null;
  const me = staff.find((s) => s.id === session.staffId);
  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-20 shadow-xl">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-brand px-4 py-3 text-white">
        <div className="text-sm"><div className="font-semibold">{me?.name}</div><div className="text-xs text-white/70">National Traders</div></div>
        <button onClick={() => setInside(false)} className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs" title="Demo: simulate walking out of the shop"><MapPin className="h-3.5 w-3.5" />In shop · simulate exit</button>
      </header>
      <div className="p-4">{children}</div>
      <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white">
        {NAV.map(([href, label, Icon]) => <Link key={href} href={href} className={cx('flex flex-1 flex-col items-center py-2 text-xs', path === href ? 'font-semibold text-brand' : 'text-slate-500')}><Icon className="mb-0.5 h-5 w-5" />{label}</Link>)}
      </nav>
    </div>
  );
}

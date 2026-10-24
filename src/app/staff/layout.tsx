'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, Coffee, History, LogOut, MapPin, Menu, ReceiptText, Undo2, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useGuard } from '@/components/Shell';
import { dk, fmtTime } from '@/lib/rules';
import { cx } from '@/components/ui';

const NAV = [['/staff', 'Make a bill', ReceiptText], ['/staff/history', 'My bills', History], ['/staff/returns', 'Returns', Undo2], ['/staff/day', 'My day and leave', CalendarDays]] as const;

/** Phone shell: the home screen is the billing counter. Everything else lives in the side menu. */
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = useGuard('staff'); const d = useStore(); const path = usePathname(); const router = useRouter(); const [open, setOpen] = useState(false);
  // Location rule: leaving the shop ends the session automatically and records the gap in attendance.
  useEffect(() => { if (session && !d.insideShop) { d.logout(true); router.replace('/login'); } }, [session, d.insideShop]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setOpen(false), [path]);
  if (!session) return null;
  const me = d.staff.find((s) => s.id === session.staffId); const att = d.attendance.find((a) => a.staffId === session.staffId && a.date === dk(new Date()));
  const onBreak = !!att?.breaks.some((b) => !b.e); const bills = d.drafts.filter((x) => x.staffId === session.staffId && !x.result).length;
  return (
    <div className="mx-auto min-h-screen max-w-md bg-paper shadow-xl">
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-black px-3 py-2.5 text-white">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="relative rounded-xl p-2 hover:bg-white/10"><Menu className="h-6 w-6" />{bills > 1 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-light px-1 text-[10px] font-bold text-black">{bills}</span>}</button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="" className="h-9 w-9 rounded-lg" />
        <div className="min-w-0 flex-1 text-sm leading-4"><div className="truncate font-semibold">{me?.name}</div><div className="text-xs text-gold-light">{onBreak ? 'On a break' : att ? `In since ${fmtTime(att.in)}` : 'National Traders'}</div></div>
        {onBreak && <button onClick={d.endBreak} className="rounded-full bg-gold-light px-3 py-1.5 text-xs font-semibold text-black">End break</button>}
      </header>
      <div className="p-3 pb-6">{children}</div>

      {open && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-label="Menu">
          <div className="fade-up flex h-full w-[78%] max-w-xs flex-col bg-black text-white shadow-2xl">
            <div className="flex items-center justify-between px-4 pb-2 pt-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-header.png" alt="National Traders" className="h-14" />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-xl p-2 hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-5 pb-3 text-sm text-white/60">Hello, <b className="text-white">{me?.name}</b></div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3">
              {NAV.map(([href, label, Icon]) => (
                <Link key={href} href={href} className={cx('flex items-center gap-3 rounded-xl px-3 py-3 text-[16px]', path === href ? 'bg-gold-light/15 font-semibold text-gold-light' : 'text-white/80 hover:bg-white/10')}>
                  <Icon className="h-5 w-5" />{label}{href === '/staff' && bills > 0 && <span className="ml-auto rounded-full bg-gold-light px-2 py-0.5 text-xs font-bold text-black">{bills} open</span>}
                </Link>))}
            </nav>
            <div className="space-y-2 border-t border-white/10 p-4">
              {onBreak ? <button onClick={d.endBreak} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-light py-3 font-semibold text-black"><Coffee className="h-5 w-5" />End break</button>
                : <button onClick={() => { d.startBreak(); setOpen(false); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 py-3 font-medium"><Coffee className="h-5 w-5" />Take a break</button>}
              <button onClick={() => { if (confirm('End your day and log out?')) { d.endDay(); router.push('/login'); } }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-3 font-medium"><LogOut className="h-5 w-5" />End day</button>
              <button onClick={() => d.setInside(false)} title="Demo: simulate walking out of the shop" className="flex w-full items-center justify-center gap-1.5 pt-1 text-xs text-white/40"><MapPin className="h-3.5 w-3.5" />Demo: simulate leaving the shop</button>
            </div>
          </div>
          <button className="flex-1 bg-black/60" aria-label="Close menu" onClick={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
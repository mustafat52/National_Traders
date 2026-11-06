'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { NAV, navByG } from '@/lib/nav';
import { handleKey, isTyping, useKeys, type KeyAction } from '@/lib/hotkeys';
import { cx } from '@/components/ui';
import { KeyBar } from './KeyBar';
import { CommandPalette } from './CommandPalette';
import { ShortcutHelp } from './ShortcutHelp';
import { Toaster } from '@/components/grid/Toast';

const WIDE = ['/admin', '/admin/reports'];  // Dashboard and Reports keep their roomy look
/** Frame for every back-office screen: menu, work area, shortcut bar, F1 help, F2 search, g-shortcuts. */
export function AppFrame({ badges, onLogout, children }: { badges: Record<string, number>; onLogout: () => void; children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter();
  const help = useKeys((s) => s.help); const palette = useKeys((s) => s.palette);
  const [pending, setPending] = useState(false); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const globals = useMemo<KeyAction[]>(() => [
    { key: 'F1', label: 'Help', run: () => useKeys.setState({ help: true }) },
    { key: 'F2', label: 'Go to', run: () => useKeys.setState({ palette: true }) },
    { key: 'Ctrl+K', label: '', run: () => useKeys.setState({ palette: true }), hidden: true },
    { key: 'F7', label: 'Stock in', run: () => router.push('/admin/stockin') },
    { key: 'F8', label: 'Products', run: () => router.push('/admin/products') },
  ], [router]);
  const gl = useRef(globals); gl.current = globals;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (pending0.current && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) { // second key of "g then letter"
        pending0.current = false; setPending(false); if (timer.current) clearTimeout(timer.current);
        const n = navByG(e.key.toLowerCase()); if (n) { e.preventDefault(); router.push(n.href); return; }
      }
      if (handleKey(e, gl.current)) return;
      if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && !isTyping(e.target) && !useKeys.getState().layers.some((l) => l.modal)) {
        e.preventDefault(); pending0.current = true; setPending(true);
        timer.current = setTimeout(() => { pending0.current = false; setPending(false); }, 1500);
      }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [router]);
  const pending0 = useRef(false);
  const active = (href: string) => (path === href || (href !== '/admin' && path.startsWith(href + '/')));
  const wide = WIDE.includes(path);
  const groups = NAV.reduce<Record<string, typeof NAV>>((a, n) => { if (n.group !== 'Settings') (a[n.group] ||= []).push(n); return a; }, {});
  const link = (n: (typeof NAV)[number]) => (
    <Link key={n.href} href={n.href} className={cx('mx-3 flex items-center gap-3 rounded-lg px-3 py-1.5 text-[13.5px] transition-colors', active(n.href) ? 'bg-gold-light/15 font-semibold text-gold-light' : 'text-white/70 hover:bg-white/10 hover:text-white')}>
      <n.icon className="h-[17px] w-[17px]" />{n.title}{badges[n.href] > 0 && <span className="ml-auto rounded-full bg-butter-bg px-2 py-0.5 text-xs font-semibold text-butter-fg">{badges[n.href]}</span>}
    </Link>);
  const settings = NAV.find((n) => n.group === 'Settings')!;
  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-black py-3 md:flex">
        <div className="mb-2 px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-header.png" alt="National Traders" className="mx-auto w-36" />
          <div className="text-center text-[10px] tracking-[0.2em] text-gold-light/80">BACK OFFICE</div>
        </div>
        <nav className="nav-scroll flex-1 overflow-y-auto pb-12">
          {Object.entries(groups).map(([g, items]) => (
            <div key={g || 'top'} className="pb-1">{g && <div className="px-6 pb-0.5 pt-1.5 text-[11px] text-white/40">{g}</div>}{items.map(link)}</div>
          ))}
        </nav>
        <div className="space-y-0.5 border-t border-white/10 pb-9 pt-2">
          {link(settings)}
          <button onClick={onLogout} className="mx-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-lg px-3 py-1.5 text-[13.5px] text-white/70 hover:bg-white/10 hover:text-white"><LogOut className="h-[17px] w-[17px]" />Log out</button>
        </div>
      </aside>
      <main className={cx('min-w-0 flex-1', wide ? 'p-4 pb-16 md:p-10 md:pb-16' : 'px-4 py-3 pb-16 md:px-6 md:py-4 md:pb-16')}>
        <div className="no-print mb-3 flex gap-1 overflow-x-auto md:hidden">{NAV.map((n) => <Link key={n.href} href={n.href} className={cx('whitespace-nowrap rounded-full px-3 py-1 text-xs', active(n.href) ? 'bg-brand text-white' : 'bg-white')}>{n.title}</Link>)}</div>
        {children}
      </main>
      <KeyBar globals={globals} pending={pending} />
      <Toaster />
      {palette && <CommandPalette onClose={() => useKeys.setState({ palette: false })} />}
      {help && <ShortcutHelp globals={globals} onClose={() => useKeys.setState({ help: false })} />}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { useStore } from '@/lib/store';
import { OWNERS } from '@/lib/owners';
import { Btn } from '@/components/ui';

interface Welcome { name: string; initial: string; role: string; to: string; }

export default function Login() {
  const { staff, login, insideShop, setInside } = useStore(); const r = useRouter();
  const [w, setW] = useState<Welcome | null>(null);
  const enter = (staffId: string, to: string, name: string, role: string, owner?: string) => { login(staffId, owner); setW({ name, initial: name[0], role, to }); };
  return (
    <div className="min-h-screen bg-black px-4 py-8">
      <div className="mx-auto max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="National Traders, wholesale plywood and hardware" className="mx-auto w-full max-w-sm" />
        <p className="mb-6 mt-1 text-center text-sm text-white/60">Business Management System · <b className="text-gold-light">Demo with fake data</b></p>
        <div className="mb-4 rounded-[22px] bg-paper p-5">
          <div className="mb-3 font-display text-lg font-semibold">Owner (laptop panel)</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {OWNERS.map((o) => (
              <button key={o.key} onClick={() => enter('S0', '/admin', o.full, 'Owner', o.key)} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-2.5 text-left transition hover:border-gold hover:shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black font-display text-lg font-semibold text-gold-light">{o.initial}</span>
                <span className="min-w-0 leading-tight"><span className="block truncate text-[15px] font-semibold">{o.first} Bhai</span><span className="block text-xs text-steel">Bandeali</span></span>
              </button>))}
          </div>
        </div>
        <div className="mb-4 rounded-[22px] bg-paper p-5">
          <div className="mb-1 font-display text-lg font-semibold">Salesman (phone app)</div>
          <p className="mb-3 text-xs text-steel">Staff can log in only while inside the shop. In the demo, simulate it here:</p>
          <button onClick={() => setInside(!insideShop)} className={`mb-3 flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm ${insideShop ? 'border-gold bg-sage-bg text-sage-fg' : 'border-blush-fg/40 bg-blush-bg text-blush-fg'}`}>
            <MapPin className="h-4 w-4" />Simulated location: <b>{insideShop ? 'Inside the shop' : 'Outside the shop'}</b> (tap to toggle)
          </button>
          {!insideShop && <p className="mb-3 text-sm font-medium text-blush-fg">Access denied: you must be inside the shop to log in.</p>}
          <div className="grid grid-cols-2 gap-2">
            {staff.filter((s) => s.role === 'salesman').map((s) => <Btn key={s.id} variant="outline" disabled={!insideShop} onClick={() => enter(s.id, '/staff', s.name, 'Salesman')}>{s.name}</Btn>)}
          </div>
        </div>
        <p className="text-center text-xs text-white/40">Demo data is stored in this browser. Use Settings → Reset demo data to start fresh.</p>
      </div>
      {w && <WelcomeScreen w={w} onDone={() => r.push(w.to)} />}
    </div>
  );
}

/** Full-screen welcome: the name is written out letter by letter under a drawn gold line, then we go in. */
function WelcomeScreen({ w, onDone }: { w: Welcome; onDone: () => void }) {
  const hour = new Date().getHours(); const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const text = w.role === 'Owner' ? w.name : `${w.name}`; const [n, setN] = useState(0);
  useEffect(() => { const t = setInterval(() => setN((x) => x + 1), 55); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setTimeout(onDone, 800 + text.length * 55 + 1100); return () => clearTimeout(t); }, [onDone, text.length]);
  return (
    <div onClick={onDone} className="welcome-screen fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-black px-6 text-center" role="status" aria-live="polite">
      <div className="welcome-ring flex h-24 w-24 items-center justify-center rounded-full border border-gold/60"><span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-gold-light to-gold-deep font-display text-4xl font-semibold text-black">{w.initial}</span></div>
      <div className="fade-up mt-8 text-xs uppercase tracking-[0.35em] text-gold-light" style={{ animationDelay: '.3s' }}>{part} · Welcome</div>
      <h1 className="mt-4 min-h-[3.5rem] font-display text-4xl font-semibold leading-tight text-white sm:text-5xl" aria-label={text}>
        <span aria-hidden>{text.slice(0, n)}</span><span aria-hidden className="welcome-caret ml-0.5 inline-block w-[2px] bg-gold-light align-middle">&nbsp;</span>
      </h1>
      <div className="welcome-line mt-6 h-px w-56 bg-gradient-to-r from-transparent via-gold-light to-transparent" />
      <div className="fade-up mt-5 text-sm text-white/50" style={{ animationDelay: '1s' }}>National Traders · {w.role === 'Owner' ? 'Owner panel' : 'Billing counter'}</div>
      <div className="fade-up absolute bottom-8 text-xs text-white/30" style={{ animationDelay: '1.4s' }}>Tap anywhere to skip</div>
    </div>
  );
}
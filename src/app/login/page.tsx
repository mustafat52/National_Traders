'use client';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Btn } from '@/components/ui';

export default function Login() {
  const { staff, login, insideShop, setInside } = useStore(); const r = useRouter();
  const go = (id: string, admin: boolean) => { login(id); r.push(admin ? '/admin' : '/staff'); };
  return (
    <div className="min-h-screen bg-black px-4 py-8">
      <div className="mx-auto max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="National Traders, wholesale plywood and hardware" className="mx-auto w-full max-w-sm" />
        <p className="mb-6 mt-1 text-center text-sm text-white/60">Business Management System · <b className="text-gold-light">Demo with fake data</b></p>
        <div className="mb-4 rounded-[22px] bg-paper p-5">
          <div className="mb-2 font-display text-lg font-semibold">Owner (laptop panel)</div>
          <Btn className="w-full !py-2.5" onClick={() => go('S0', true)}>Enter as Owner</Btn>
        </div>
        <div className="mb-4 rounded-[22px] bg-paper p-5">
          <div className="mb-1 font-display text-lg font-semibold">Salesman (phone app)</div>
          <p className="mb-3 text-xs text-steel">Staff can log in only while inside the shop. In the demo, simulate it here:</p>
          <button onClick={() => setInside(!insideShop)} className={`mb-3 flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm ${insideShop ? 'border-gold bg-sage-bg text-sage-fg' : 'border-blush-fg/40 bg-blush-bg text-blush-fg'}`}>
            <MapPin className="h-4 w-4" />Simulated location: <b>{insideShop ? 'Inside the shop' : 'Outside the shop'}</b> (tap to toggle)
          </button>
          {!insideShop && <p className="mb-3 text-sm font-medium text-blush-fg">Access denied: you must be inside the shop to log in.</p>}
          <div className="grid grid-cols-2 gap-2">
            {staff.filter((s) => s.role === 'salesman').map((s) => <Btn key={s.id} variant="outline" disabled={!insideShop} onClick={() => go(s.id, false)}>{s.name}</Btn>)}
          </div>
        </div>
        <p className="text-center text-xs text-white/40">Demo data is stored in this browser. Use Settings → Reset demo data to start fresh.</p>
      </div>
    </div>
  );
}
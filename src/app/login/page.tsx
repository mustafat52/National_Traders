'use client';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Btn, Card } from '@/components/ui';

export default function Login() {
  const { staff, login, insideShop, setInside } = useStore(); const r = useRouter();
  const go = (id: string, admin: boolean) => { login(id); r.push(admin ? '/admin' : '/staff'); };
  return (
    <div className="mx-auto max-w-md p-4 pt-10">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-xl font-bold text-white">NT</div>
        <h1 className="text-2xl font-bold text-brand">National Traders</h1>
        <p className="text-sm text-slate-500">Business Management System · <b>Demo with fake data</b></p>
      </div>
      <Card className="mb-4">
        <div className="mb-2 text-sm font-semibold">Admin (desktop panel)</div>
        <Btn className="w-full" onClick={() => go('S0', true)}>Enter as Admin</Btn>
      </Card>
      <Card className="mb-4">
        <div className="mb-1 text-sm font-semibold">Salesman (phone app)</div>
        <p className="mb-3 text-xs text-slate-500">Staff can log in only while inside the shop. In the demo, simulate it here:</p>
        <button onClick={() => setInside(!insideShop)} className={`mb-3 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm ${insideShop ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-red-300 bg-red-50 text-red-800'}`}>
          <MapPin className="h-4 w-4" />Simulated location: <b>{insideShop ? 'Inside the shop' : 'Outside the shop'}</b> (tap to toggle)
        </button>
        {!insideShop && <p className="mb-3 text-sm font-medium text-red-700">Access denied: you must be inside the shop to log in.</p>}
        <div className="grid grid-cols-2 gap-2">
          {staff.filter((s) => s.role === 'salesman').map((s) => <Btn key={s.id} variant="outline" disabled={!insideShop} onClick={() => go(s.id, false)}>{s.name}</Btn>)}
        </div>
      </Card>
      <p className="text-center text-xs text-slate-400">Demo data is stored in this browser. Use Settings → Reset demo data to start fresh.</p>
    </div>
  );
}

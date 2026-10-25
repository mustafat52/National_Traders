'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Btn, Card, Field, PageTitle } from '@/components/ui';
import { LOCS } from '@/lib/types';

export default function SettingsPage() {
  const { settings, updateSettings, resetDemo, addLocation, renameLocation } = useStore(); const locs = useStore((st) => st.settings.locations ?? LOCS);
  const [newLoc, setNewLoc] = useState(''); const [locErr, setLocErr] = useState(''); const [names, setNames] = useState<string[]>([]); const router = useRouter(); const [s, setS] = useState(settings);
  const n = (k: keyof typeof s) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: k === 'lateAfter' ? e.target.value : +e.target.value });
  return (
    <>
      <PageTitle title="Settings" />
      <Card className="grid max-w-2xl gap-3 sm:grid-cols-2">
        <Field label="Points per 1,000 of bill value"><input type="number" className="w-full" value={s.pointsPer1000} onChange={n('pointsPer1000')} /></Field>
        <Field label="Repeat-purchase alert window (days)"><input type="number" className="w-full" value={s.repeatDays} onChange={n('repeatDays')} /></Field>
        <Field label="Estimate validity (days)"><input type="number" className="w-full" value={s.estimateDays} onChange={n('estimateDays')} /></Field>
        <Field label="Customer bill link expiry (days)"><input type="number" className="w-full" value={s.linkDays} onChange={n('linkDays')} /></Field>
        <Field label="Late arrival after (HH:MM)"><input className="w-full" value={s.lateAfter} onChange={n('lateAfter')} /></Field>
        <Field label="Weekly off day (not counted as a working day)"><select className="w-full" value={s.weeklyOff} onChange={(e) => setS({ ...s, weeklyOff: +e.target.value })}>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((n, i) => <option key={n} value={i}>{n}</option>)}</select></Field>
        <div className="flex items-end"><Btn onClick={() => { updateSettings(s); alert('Saved'); }}>Save settings</Btn></div>
      </Card>
      <Card className="mt-6 max-w-2xl">
        <div className="mb-1 text-sm font-semibold">Storage places</div>
        <p className="mb-3 text-sm text-slate-600">The shop and each godown. Add a new one whenever you take more space; every product starts with 0 there, and it appears on stock-in, transfers, the counter and reports. Places cannot be deleted, only renamed.</p>
        <div className="space-y-2">{locs.map((n, i) => (
          <div key={i} className="flex items-center gap-2"><span className="w-6 text-sm text-slate-500">{i + 1}</span>
            <input className="flex-1" value={names[i] ?? n} onChange={(e) => { const x = [...names]; x[i] = e.target.value; setNames(x); setLocErr(''); }}
              onBlur={() => { if (names[i] !== undefined && names[i] !== n) { try { renameLocation(i, names[i]); setLocErr(''); } catch (e) { setLocErr((e as Error).message); } setNames((x) => { const y = [...x]; delete y[i]; return y; }); } }} />
          </div>))}</div>
        <div className="mt-3 flex flex-wrap gap-2"><input className="min-w-0 flex-1" placeholder={`e.g. Godown ${locs.length}`} value={newLoc} onChange={(e) => { setNewLoc(e.target.value); setLocErr(''); }} />
          <Btn onClick={() => { try { addLocation(newLoc); setNewLoc(''); setLocErr(''); } catch (e) { setLocErr((e as Error).message); } }}>+ Add storage place</Btn></div>
        {locErr && <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{locErr}</p>}
      </Card>
      <Card className="mt-6 max-w-2xl"><div className="mb-2 text-sm font-semibold">Demo data</div><p className="mb-3 text-sm text-slate-600">Restores the original fake data (products, bills, vendors, attendance) and clears everything you entered.</p>
        <Btn variant="danger" onClick={() => { if (confirm('Reset all demo data?')) { resetDemo(); router.push('/login'); } }}>Reset demo data</Btn></Card>
    </>
  );
}
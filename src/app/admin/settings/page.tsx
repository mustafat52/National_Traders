'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Btn, Card, Field, PageTitle } from '@/components/ui';

export default function SettingsPage() {
  const { settings, updateSettings, resetDemo } = useStore(); const router = useRouter(); const [s, setS] = useState(settings);
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
      <Card className="mt-6 max-w-2xl"><div className="mb-2 text-sm font-semibold">Demo data</div><p className="mb-3 text-sm text-slate-600">Restores the original fake data (products, bills, vendors, attendance) and clears everything you entered.</p>
        <Btn variant="danger" onClick={() => { if (confirm('Reset all demo data?')) { resetDemo(); router.push('/login'); } }}>Reset demo data</Btn></Card>
    </>
  );
}
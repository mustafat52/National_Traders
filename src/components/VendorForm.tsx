'use client';
import { useState } from 'react';
import { Vendor } from '@/lib/types';
import { Panel } from '@/components/grid/Panel';

export type VendorInput = Omit<Vendor, 'id'>;
export const EMPTY_VENDOR: VendorInput = { name: '', phone: '', gst: '', terms: 'Net 30', opening: 0 };
const TERMS = ['Immediate', 'Net 7', 'Net 15', 'Net 30', 'Net 45', 'Net 60'];
const inp = 'w-full !rounded-md !px-2.5 !py-1.5 text-[13px]';

/** Used to add a vendor and to edit one. Validates, then hands the clean values to onSave. */
export function VendorForm({ initial = EMPTY_VENDOR, saveLabel, onSave, onCancel, openingHint, title = 'Vendor details' }: { initial?: VendorInput; saveLabel: string; onSave: (v: VendorInput) => void; onCancel: () => void; openingHint?: string; title?: string }) {
  const [f, setF] = useState<VendorInput>(initial); const [err, setErr] = useState('');
  const set = <K extends keyof VendorInput>(k: K, v: VendorInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const submit = () => {
    const phone = f.phone.replace(/\D/g, '');
    if (!f.name.trim()) return setErr('Enter the vendor name');
    if (phone && phone.length < 10) return setErr('A phone number needs at least 10 digits');
    onSave({ ...f, name: f.name.trim(), phone: f.phone.trim(), gst: f.gst.trim().toUpperCase(), terms: f.terms.trim() || 'Net 30', opening: Math.round(f.opening || 0) });
  };
  const row = (label: string, child: React.ReactNode, hint?: string) => (
    <label className="grid items-start gap-x-3 border-b border-line/50 py-1.5 last:border-0 sm:grid-cols-[190px_1fr]"><span className="pt-1.5 text-[12.5px] font-medium">{label}</span><span className="block">{child}{hint && <span className="mt-0.5 block text-[11.5px] text-steel">{hint}</span>}</span></label>);
  return (
    <Panel title={title} className="max-w-3xl">
      {row('Name', <input autoFocus className={inp} aria-label="Vendor name" value={f.name} onChange={(e) => set('name', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />)}
      {row('Phone', <input inputMode="tel" className={inp + ' !max-w-[220px]'} aria-label="Phone" value={f.phone} onChange={(e) => set('phone', e.target.value)} />)}
      {row('GST number', <input className={inp + ' !max-w-[220px]'} aria-label="GST number" value={f.gst} onChange={(e) => set('gst', e.target.value)} />, 'Optional.')}
      {row('Credit terms', <><input list="vendor-terms" className={inp + ' !max-w-[220px]'} aria-label="Credit terms" value={f.terms} onChange={(e) => set('terms', e.target.value)} /><datalist id="vendor-terms">{TERMS.map((t) => <option key={t} value={t} />)}</datalist></>)}
      {row('Opening balance', <input type="number" min={0} className={inp + ' !max-w-[220px]'} aria-label="Opening balance" value={f.opening || ''} placeholder="0" onChange={(e) => set('opening', +e.target.value)} />, openingHint ?? 'What you already owed this vendor before you started using this system.')}
      {err && <p className="my-1.5 rounded bg-blush-bg px-3 py-1.5 text-[12.5px] text-blush-fg">{err}</p>}
      <div className="flex gap-2 py-2"><button onClick={submit} className="rounded-md border border-ink bg-ink px-4 py-1.5 text-[13px] font-medium text-white">{saveLabel}</button><button onClick={onCancel} className="rounded-md border border-line bg-white px-4 py-1.5 text-[13px] font-medium hover:bg-paper">Cancel</button></div>
    </Panel>
  );
}
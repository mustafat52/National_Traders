'use client';
import { useState } from 'react';
import { Vendor } from '@/lib/types';

export type VendorInput = Omit<Vendor, 'id'>;
export const EMPTY_VENDOR: VendorInput = { name: '', phone: '', gst: '', terms: 'Net 30', opening: 0 };
const TERMS = ['Immediate', 'Net 7', 'Net 15', 'Net 30', 'Net 45', 'Net 60'];

/** Used to add a vendor and to edit one. Validates, then hands the clean values to onSave. */
export function VendorForm({ initial = EMPTY_VENDOR, saveLabel, onSave, onCancel, openingHint }: { initial?: VendorInput; saveLabel: string; onSave: (v: VendorInput) => void; onCancel: () => void; openingHint?: string }) {
  const [f, setF] = useState<VendorInput>(initial); const [err, setErr] = useState('');
  const set = <K extends keyof VendorInput>(k: K, v: VendorInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const submit = () => {
    const phone = f.phone.replace(/\D/g, '');
    if (!f.name.trim()) return setErr('Enter the vendor name');
    if (phone && phone.length < 10) return setErr('A phone number needs at least 10 digits');
    onSave({ ...f, name: f.name.trim(), phone: f.phone.trim(), gst: f.gst.trim().toUpperCase(), terms: f.terms.trim() || 'Net 30', opening: Math.round(f.opening || 0) });
  };
  const lab = 'mb-1 block text-xs font-medium text-steel';
  return (
    <div className="fade-up rounded-[22px] border border-line bg-panel p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <label className="block text-sm lg:col-span-2"><span className={lab}>Vendor name</span><input autoFocus className="w-full" value={f.name} onChange={(e) => set('name', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} /></label>
        <label className="block text-sm"><span className={lab}>Phone</span><input inputMode="tel" className="w-full" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></label>
        <label className="block text-sm"><span className={lab}>GST number (optional)</span><input className="w-full" value={f.gst} onChange={(e) => set('gst', e.target.value)} /></label>
        <label className="block text-sm"><span className={lab}>Credit terms</span><input list="vendor-terms" className="w-full" value={f.terms} onChange={(e) => set('terms', e.target.value)} /><datalist id="vendor-terms">{TERMS.map((t) => <option key={t} value={t} />)}</datalist></label>
        <label className="block text-sm"><span className={lab}>Owed before you started using this system</span><input type="number" min={0} className="w-full" value={f.opening || ''} placeholder="0" onChange={(e) => set('opening', +e.target.value)} /></label>
      </div>
      {openingHint && <p className="mt-2 text-xs text-steel">{openingHint}</p>}
      {err && <div className="mt-3 rounded-xl bg-blush-bg px-3 py-2 text-sm text-blush-fg">{err}</div>}
      <div className="mt-4 flex gap-2">
        <button onClick={submit} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-light">{saveLabel}</button>
        <button onClick={onCancel} className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-medium hover:bg-paper">Cancel</button>
      </div>
    </div>
  );
}
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { LOCS } from '@/lib/types';
import { useScreenKeys } from '@/lib/hotkeys';
import { KBtn, ScreenHead } from '@/components/grid/Screen';
import { Field, Panel } from '@/components/grid/Panel';
import { toast } from '@/components/grid/Toast';
import { errText } from '@/components/StaffBits';

const inp = '!rounded-md !px-2.5 !py-1 text-[13px]';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Material Centre (Godowns) and Settings: bill and attendance rules, transport charge, storage places. */
export default function SettingsPage() {
  const { settings, updateSettings, resetDemo, addLocation, renameLocation } = useStore(); const locs = useStore((st) => st.settings.locations ?? LOCS); const router = useRouter();
  const [s, setS] = useState({ ...settings, transport: settings.transport ?? 0 }); const [newLoc, setNewLoc] = useState(''); const [locErr, setLocErr] = useState(''); const [names, setNames] = useState<Record<number, string>>({});
  const num = (k: 'pointsPer1000' | 'repeatDays' | 'estimateDays' | 'linkDays' | 'transport') => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Math.max(0, +e.target.value || 0) });
  const dirty = JSON.stringify({ ...s }) !== JSON.stringify({ ...settings, transport: settings.transport ?? 0 });
  const save = () => { updateSettings({ ...s, transport: Math.round(s.transport) }); toast('Settings saved'); };
  useScreenKeys([{ key: 'F2', label: 'Save settings', run: save }, { key: 'Ctrl+S', label: '', run: save, hidden: true }]);
  const rename = (i: number, n: string) => { const v = names[i]; if (v === undefined || v === n) return; try { renameLocation(i, v); setLocErr(''); } catch (e) { setLocErr(errText(e)); } setNames((x) => { const y = { ...x }; delete y[i]; return y; }); };
  return (
    <div className="max-w-5xl">
      <ScreenHead title="Material Centre (Godowns) and Settings" hint="Rules used on bills and attendance, and the places where stock is kept.">
        <KBtn primary k="F2" onClick={save} disabled={!dirty}>Save settings</KBtn>
      </ScreenHead>
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Billing" hint="Used by the salesman's counter and the owner's estimate screen">
          <Field label="Transport charge"><span className="flex items-center gap-2"><input id="st-transport" type="number" min={0} aria-label="Transport charge" className={`!w-32 ${inp}`} value={s.transport || ''} placeholder="0" onChange={num('transport')} /><span className="text-[12px] text-steel">Fixed amount. 0 hides the option. When a bill needs transport the salesman ticks a box and this amount is added.</span></span></Field>
          <Field label="Points per 1,000 of bill"><input type="number" aria-label="Points per 1000" className={`!w-32 ${inp}`} value={s.pointsPer1000} onChange={num('pointsPer1000')} /></Field>
          <Field label="Estimate valid for (days)"><input type="number" aria-label="Estimate validity" className={`!w-32 ${inp}`} value={s.estimateDays} onChange={num('estimateDays')} /></Field>
          <Field label="Customer bill link lasts (days)"><input type="number" aria-label="Link expiry" className={`!w-32 ${inp}`} value={s.linkDays} onChange={num('linkDays')} /></Field>
          <Field label="Repeat purchase alert (days)"><input type="number" aria-label="Repeat window" className={`!w-32 ${inp}`} value={s.repeatDays} onChange={num('repeatDays')} /></Field>
        </Panel>
        <Panel title="Attendance">
          <Field label="Late after (HH:MM)"><input aria-label="Late after" className={`!w-28 ${inp}`} value={s.lateAfter} onChange={(e) => setS({ ...s, lateAfter: e.target.value })} /></Field>
          <Field label="Weekly off"><select aria-label="Weekly off" className="rounded-md border border-line bg-white px-2 py-1 text-[13px]" value={s.weeklyOff} onChange={(e) => setS({ ...s, weeklyOff: +e.target.value })}>{DAYS.map((n, i) => <option key={n} value={i}>{n}</option>)}</select></Field>
          <p className="py-1.5 text-[12px] text-steel">The weekly off is not counted as a working day in payroll.</p>
        </Panel>
        <Panel title="Storage places (Material Centres)" hint="The shop and each godown">
          <p className="py-1.5 text-[12px] text-steel">Add a new place whenever you take more space. Every item starts with 0 there. Places cannot be deleted, only renamed.</p>
          {locs.map((n, i) => <Field key={i} label={`Place ${i + 1}`}><input aria-label={`Place ${i + 1}`} className={`w-full ${inp}`} value={names[i] ?? n} onChange={(e) => { setNames({ ...names, [i]: e.target.value }); setLocErr(''); }} onBlur={() => rename(i, n)} onKeyDown={(e) => e.key === 'Enter' && rename(i, n)} /></Field>)}
          <Field label="New place"><span className="flex gap-2"><input aria-label="New place" className={`min-w-0 flex-1 ${inp}`} placeholder={`e.g. Godown ${locs.length}`} value={newLoc} onChange={(e) => { setNewLoc(e.target.value); setLocErr(''); }} /><KBtn onClick={() => { try { addLocation(newLoc); setNewLoc(''); setLocErr(''); toast('Place added'); } catch (e) { setLocErr(errText(e)); } }}>Add</KBtn></span></Field>
          {locErr && <p role="alert" className="my-1.5 rounded bg-blush-bg px-3 py-1.5 text-[12.5px] text-blush-fg">{locErr}</p>}
        </Panel>
        <Panel title="Demo data">
          <p className="py-1.5 text-[12.5px] text-steel">Restores the original sample data (items, bills, vendors, attendance) and clears everything you entered.</p>
          <div className="pb-2"><KBtn onClick={() => { if (confirm('Reset all demo data?')) { resetDemo(); router.push('/login'); } }}>Reset demo data</KBtn></div>
        </Panel>
      </div>
    </div>
  );
}
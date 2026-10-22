import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { buildSeed } from './seed';
import { Attendance, Bill, BillLine, Data, Purchase, PurchaseLine, ReturnRec, Settings, Staff } from './types';
import { calcPoints, dk, pad, uid } from './rules';

/**
 * DATA LAYER (demo). Every action below is what the Supabase backend will replace.
 * Screens only call these actions / read this state, never mutate data directly.
 */
export interface Session { role: 'admin' | 'staff'; staffId: string; }
export interface BillDraft { staffId: string; customerId: string; tier: number; lines: BillLine[]; cash: number; online: number; fromEstimate?: string; }
export interface ConvertDraft { estimateId: string; }

interface Actions {
  login: (staffId: string) => void;
  logout: (left?: boolean) => void;
  setInside: (v: boolean) => void;
  endDay: () => void;
  startBreak: () => void;
  endBreak: () => void;
  requestLeave: (from: string, to: string, type: string, reason: string) => void;
  setLeave: (id: string, status: 'approved' | 'rejected') => void;
  addStaff: (name: string, phone: string) => void;
  saveProduct: (p: Data['products'][number]) => void;
  adjustStock: (pid: string, loc: number, to: number, reason: string) => void;
  transfer: (pid: string, from: number, to: number, qty: number) => void;
  addVendor: (v: Omit<Data['vendors'][number], 'id'>) => void;
  addPayment: (vendorId: string, amount: number, mode: string) => void;
  addPurchase: (vendorId: string, billNo: string, lines: PurchaseLine[]) => void;
  addStockIn: (note: string, lines: { pid: string; qty: number[] }[]) => void;
  purchaseReturn: (vendorId: string, pid: string, qty: number, loc: number) => void;
  upsertCustomer: (phone: string, tier: number) => string;
  saveBill: (kind: 'estimate' | 'quotation', d: BillDraft) => Bill;
  startConvert: (estimateId: string | null) => void;
  processReturn: (r: { kind: 'sales' | 'damage'; billId: string; staffId: string; lines: { pid: string; qty: number; loc: number }[]; cash: number; online: number }) => void;
  updateSettings: (s: Settings) => void;
  resetDemo: () => void;
}
export type Store = Data & Actions & { session: Session | null; insideShop: boolean; convert: ConvertDraft | null };

const storage: StateStorage = {
  getItem: (n) => (typeof window === 'undefined' ? null : window.localStorage.getItem(n)),
  setItem: (n, v) => { try { window.localStorage.setItem(n, v); } catch { /* quota: demo keeps working in-memory */ } },
  removeItem: (n) => { try { window.localStorage.removeItem(n); } catch { /* ignore */ } },
};
const code = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...buildSeed(), session: null, insideShop: true, convert: null,

      /* ---------- session & attendance ---------- */
      login: (staffId) => set((s) => {
        const st = s.staff.find((x) => x.id === staffId)!;
        const session: Session = { role: st.role === 'admin' ? 'admin' : 'staff', staffId };
        if (st.role === 'admin') return { session };
        const today = dk(new Date()); const now = new Date().toISOString();
        const has = s.attendance.find((a) => a.staffId === staffId && a.date === today);
        if (!has) return { session, attendance: [...s.attendance, { id: uid('A'), staffId, date: today, in: now, breaks: [], gaps: [] }] };
        return { session, attendance: s.attendance.map((a) => a === has ? { ...a, out: undefined, gaps: a.gaps.map((g) => (g.back ? g : { ...g, back: now })) } : a) };
      }),
      logout: (left) => set((s) => {
        if (left && s.session?.role === 'staff') {
          const today = dk(new Date()); const now = new Date().toISOString();
          return { session: null, attendance: s.attendance.map((a) => a.staffId === s.session!.staffId && a.date === today ? { ...a, gaps: [...a.gaps, { out: now }] } : a) };
        }
        return { session: null };
      }),
      setInside: (v) => set({ insideShop: v }),
      endDay: () => set((s) => {
        const today = dk(new Date()); const now = new Date().toISOString();
        return { session: null, attendance: s.attendance.map((a) => a.staffId === s.session?.staffId && a.date === today ? { ...a, out: now, breaks: a.breaks.map((b) => (b.e ? b : { ...b, e: now })) } : a) };
      }),
      startBreak: () => set((s) => ({ attendance: s.attendance.map((a) => a.staffId === s.session?.staffId && a.date === dk(new Date()) ? { ...a, breaks: [...a.breaks, { s: new Date().toISOString() }] } : a) })),
      endBreak: () => set((s) => ({ attendance: s.attendance.map((a) => a.staffId === s.session?.staffId && a.date === dk(new Date()) ? { ...a, breaks: a.breaks.map((b) => (b.e ? b : { ...b, e: new Date().toISOString() })) } : a) })),
      requestLeave: (from, to, type, reason) => set((s) => ({ leaves: [{ id: uid('L'), staffId: s.session!.staffId, from, to, type, reason, status: 'pending' }, ...s.leaves] })),
      setLeave: (id, status) => set((s) => ({ leaves: s.leaves.map((l) => (l.id === id ? { ...l, status } : l)) })),
      addStaff: (name, phone) => set((s) => ({ staff: [...s.staff, { id: uid('S'), name, phone, role: 'salesman' } as Staff] })),

      /* ---------- inventory ---------- */
      saveProduct: (p) => set((s) => ({ products: s.products.some((x) => x.id === p.id) ? s.products.map((x) => (x.id === p.id ? p : x)) : [p, ...s.products] })),
      adjustStock: (pid, loc, to, reason) => set((s) => {
        const p = s.products.find((x) => x.id === pid)!;
        return {
          products: s.products.map((x) => (x.id === pid ? { ...x, stock: x.stock.map((q, i) => (i === loc ? to : q)) } : x)),
          adjustments: [{ id: uid('AD'), date: new Date().toISOString(), pid, loc, from: p.stock[loc], to, reason, by: s.session?.staffId ?? '' }, ...s.adjustments],
        };
      }),
      transfer: (pid, from, to, qty) => set((s) => {
        const p = s.products.find((x) => x.id === pid)!;
        if (from === to || qty <= 0 || p.stock[from] < qty) throw new Error('Invalid transfer: check locations and available quantity');
        return {
          products: s.products.map((x) => (x.id === pid ? { ...x, stock: x.stock.map((q, i) => (i === from ? q - qty : i === to ? q + qty : q)) } : x)),
          transfers: [{ id: uid('T'), date: new Date().toISOString(), pid, from, to, qty, by: s.session?.staffId ?? '' }, ...s.transfers],
        };
      }),

      /* ---------- vendors & purchases (admin) ---------- */
      addVendor: (v) => set((s) => ({ vendors: [...s.vendors, { ...v, id: uid('V') }] })),
      addPayment: (vendorId, amount, mode) => set((s) => ({ payments: [{ id: uid('VP'), vendorId, date: new Date().toISOString(), amount, mode }, ...s.payments] })),
      addPurchase: (vendorId, billNo, lines) => set((s) => {
        const n = s.counters.pur;
        const total = lines.reduce((a, l) => a + l.price * l.qty.reduce((x, y) => x + y, 0), 0);
        // Direct-to-shop products always land in Main Shop, whatever the entry says.
        const pm0 = new Map(s.products.map((p) => [p.id, p]));
        const norm = lines.map((l) => (pm0.get(l.pid)?.shopOnly ? { ...l, qty: [l.qty.reduce((a, b) => a + b, 0), 0, 0] } : l));
        const pur: Purchase = { id: uid('P'), no: `PUR-${pad(n)}`, vendorId, date: new Date().toISOString(), billNo, lines: norm, total };
        const m = new Map(norm.map((l) => [l.pid, l]));
        return {
          purchases: [pur, ...s.purchases], counters: { ...s.counters, pur: n + 1 },
          products: s.products.map((p) => { const l = m.get(p.id); return l ? { ...p, pp: l.price, stock: p.stock.map((q, i) => q + (l.qty[i] || 0)) } : p; }),
        };
      }),
      /** Incoming stock without a vendor bill (goods received, opening stock, godown receipts). Raises stock only. */
      addStockIn: (note, lines) => set((s) => {
        const pm = new Map(s.products.map((p) => [p.id, p]));
        const clean = lines.map((l) => {
          const sum = l.qty.reduce((a, b) => a + (b || 0), 0);
          return { pid: l.pid, qty: pm.get(l.pid)?.shopOnly ? [sum, 0, 0] : [0, 1, 2].map((i) => l.qty[i] || 0) };
        }).filter((l) => l.qty.some((q) => q > 0));
        if (!clean.length) throw new Error('Enter a quantity for at least one product');
        const m = new Map(clean.map((l) => [l.pid, l.qty])); const n = s.counters.sin;
        return {
          stockIns: [{ id: uid('SI'), no: `SIN-${pad(n)}`, date: new Date().toISOString(), by: s.session?.staffId ?? '', note, lines: clean }, ...s.stockIns],
          counters: { ...s.counters, sin: n + 1 },
          products: s.products.map((p) => { const q = m.get(p.id); return q ? { ...p, stock: p.stock.map((x, i) => x + q[i]) } : p; }),
        };
      }),
      purchaseReturn: (vendorId, pid, qty, loc) => set((s) => {
        const p = s.products.find((x) => x.id === pid)!;
        if (qty <= 0 || p.stock[loc] < qty) throw new Error('Not enough stock at that location');
        return {
          products: s.products.map((x) => (x.id === pid ? { ...x, stock: x.stock.map((q, i) => (i === loc ? q - qty : q)) } : x)),
          pReturns: [{ id: uid('PR'), vendorId, date: new Date().toISOString(), pid, qty, loc, amount: qty * p.pp }, ...s.pReturns],
        };
      }),

      /* ---------- customers & billing ---------- */
      upsertCustomer: (phone, tier) => {
        const ex = get().customers.find((c) => c.phone === phone);
        if (ex) { if (ex.tier !== tier) set((s) => ({ customers: s.customers.map((c) => (c.id === ex.id ? { ...c, tier } : c)) })); return ex.id; }
        const id = uid('C'); set((s) => ({ customers: [...s.customers, { id, phone, name: '', tier }] })); return id;
      },
      saveBill: (kind, d) => {
        const s = get(); const now = new Date();
        const total = d.lines.reduce((a, l) => a + l.qty * l.price, 0);
        if (!d.lines.length) throw new Error('Add at least one item');
        if (kind === 'quotation') {
          const pm = new Map(s.products.map((p) => [p.id, p]));
          for (const l of d.lines) {
            const p = pm.get(l.pid)!;
            if (l.alloc.reduce((a, b) => a + b, 0) !== l.qty) throw new Error(`Dispatch quantities for "${p.name}" must add up to ${l.qty}`);
            l.alloc.forEach((a, i) => { if (a > p.stock[i]) throw new Error(`Only ${p.stock[i]} of "${p.name}" in ${['Main Shop', 'Godown 1', 'Godown 2'][i]}`); });
          }
          if (Math.round(d.cash + d.online) !== Math.round(total)) throw new Error('Payment amounts must add up to the bill total');
        }
        const n = kind === 'estimate' ? s.counters.est : s.counters.quo;
        const bill: Bill = {
          id: uid('B'), no: `${kind === 'estimate' ? 'EST' : 'QUO'}-${pad(n)}`, kind, code: code(), date: now.toISOString(),
          staffId: d.staffId, customerId: d.customerId, tier: d.tier, lines: d.lines, total,
          cash: kind === 'quotation' ? d.cash : 0, online: kind === 'quotation' ? d.online : 0,
          points: kind === 'quotation' ? calcPoints(total, s.settings.pointsPer1000) : 0,
          status: kind === 'quotation' ? 'paid' : 'open', fromEstimate: d.fromEstimate,
          validUntil: kind === 'estimate' ? new Date(now.getTime() + s.settings.estimateDays * 86400000).toISOString() : undefined,
        };
        set((st) => {
          const ded = new Map<string, number[]>(); if (kind === 'quotation') d.lines.forEach((l) => ded.set(l.pid, l.alloc));
          return {
            bills: [bill, ...st.bills.map((b) => (b.id === d.fromEstimate ? { ...b, status: 'converted' as const } : b))],
            counters: { ...st.counters, [kind === 'estimate' ? 'est' : 'quo']: n + 1 },
            products: kind === 'quotation' ? st.products.map((p) => { const a = ded.get(p.id); return a ? { ...p, stock: p.stock.map((q, i) => q - a[i]) } : p; }) : st.products,
          };
        });
        return bill;
      },
      startConvert: (estimateId) => set({ convert: estimateId ? { estimateId } : null }),

      /* ---------- returns ---------- */
      processReturn: (r) => {
        const s = get(); const bill = s.bills.find((b) => b.id === r.billId)!;
        const pm = new Map(s.products.map((p) => [p.id, p]));
        const lines = r.lines.filter((l) => l.qty > 0).map((l) => {
          const bl = bill.lines.find((x) => x.pid === l.pid)!;
          return { pid: l.pid, qty: l.qty, amount: l.qty * bl.price, pp: pm.get(l.pid)!.pp, loc: l.loc };
        });
        if (!lines.length) throw new Error('Select at least one item to return');
        const amount = lines.reduce((a, l) => a + l.amount, 0);
        if (Math.round(r.cash + r.online) !== Math.round(amount)) throw new Error('Refund amounts must add up to the return value');
        const rec: ReturnRec = {
          id: uid('R'), no: `RET-${pad(s.counters.ret)}`, kind: r.kind, billId: r.billId, date: new Date().toISOString(), staffId: r.staffId, lines,
          refundCash: r.cash, refundOnline: r.online, pointsReversed: Math.floor((bill.points * amount) / bill.total),
        };
        set((st) => ({
          returns: [rec, ...st.returns], counters: { ...st.counters, ret: st.counters.ret + 1 },
          // Sales return -> back to inventory at the chosen location. Damage -> NOT added back (recorded separately).
          products: r.kind === 'sales' ? st.products.map((p) => { const l = lines.find((x) => x.pid === p.id); return l ? { ...p, stock: p.stock.map((q, i) => (i === l.loc ? q + l.qty : q)) } : p; }) : st.products,
        }));
      },

      updateSettings: (settings) => set({ settings }),
      resetDemo: () => set({ ...buildSeed(), session: null, insideShop: true, convert: null }),
    }),
    {
      name: 'nt-demo-v5', storage: createJSONStorage(() => storage),
      // Saved data from an older version is merged over today's defaults, so newer fields (stockIns, counters.sin) always exist.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Store>;
        return { ...current, ...p, stockIns: p.stockIns ?? current.stockIns, counters: { ...current.counters, ...(p.counters ?? {}) }, settings: { ...current.settings, ...(p.settings ?? {}) } } as Store;
      },
    }
  )
);
export const useProductMap = () => { const p = useStore((s) => s.products); return useMapMemo(p); };
import { useMemo } from 'react';
function useMapMemo(p: Data['products']) { return useMemo(() => new Map(p.map((x) => [x.id, x])), [p]); }
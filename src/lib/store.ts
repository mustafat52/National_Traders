import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { buildSeed } from './seed';
import { AdjustKind, Bill, BillLine, Data, Purchase, ReturnRec, Settings, Staff, Vendor } from './types';
import { calcPoints, dk, money, pad, uid } from './rules';
import { carpRows } from './carpenters';
import { computePay, figuresOf, leaveDays, leaveLocked, monthLabel } from './payroll';

/**
 * DATA LAYER (demo). Every action below is what the Supabase backend will replace.
 * Screens only call these actions / read this state, never mutate data directly.
 */
export interface Session { role: 'admin' | 'staff'; staffId: string; owner?: string; }
export interface BillDraft { staffId: string; customerId: string; tier: number; lines: BillLine[]; cash: number; online: number; fromEstimate?: string; referredBy?: string; needsCarpenter?: boolean; }
export interface ConvertDraft { estimateId: string; }
/** A bill being made at the counter. A salesman can keep several open at once (a crowd in the shop) and switch between them. */
export interface DraftLine { pid: string; qty: number; alloc: number[]; }
export interface DraftResult { no: string; kind: 'estimate' | 'quotation'; total: number; points: number; code: string; carpenter?: string; needsCarpenter?: boolean; }
export interface Draft { id: string; staffId: string; phone: string; tier: number | null; carpenterId?: string | null; needsCarpenter?: boolean; lines: DraftLine[]; createdAt: string; result?: DraftResult; }
/** Present when the delivery came with a vendor bill: creates the bill (money owed) and updates purchase prices. */
export interface StockInBill { vendorId: string; billNo: string; prices: Record<string, number>; }

interface Actions {
  login: (staffId: string, owner?: string) => void;
  logout: (left?: boolean) => void;
  setInside: (v: boolean) => void;
  endDay: () => void;
  startBreak: () => void;
  endBreak: () => void;
  requestLeave: (from: string, to: string, type: string, reason: string) => void;
  /** Approving needs a pay decision (paid keeps the salary, unpaid deducts). Rejecting needs a remark. */
  decideLeave: (id: string, status: 'approved' | 'rejected', pay?: 'paid' | 'unpaid', note?: string) => void;
  addStaff: (name: string, phone: string, salary: number) => void;
  updateStaff: (id: string, v: { name: string; phone: string; salary: number }) => void;
  addPayAdjust: (staffId: string, month: string, kind: AdjustKind, amount: number, note: string) => void;
  removePayAdjust: (id: string) => void;
  payStaff: (staffId: string, month: string, mode: string) => void;
  reopenPayslip: (id: string) => void;
  saveProduct: (p: Data['products'][number]) => void;
  adjustStock: (pid: string, loc: number, to: number, reason: string) => void;
  transfer: (pid: string, from: number, to: number, qty: number) => void;
  addVendor: (v: Omit<Data['vendors'][number], 'id'>) => void;
  addPayment: (vendorId: string, amount: number, mode: string) => void;
  updateVendor: (id: string, v: Omit<Vendor, 'id'>) => void;
  addStockIn: (note: string, lines: { pid: string; qty: number[] }[], bill?: StockInBill) => void;
  upsertCustomer: (phone: string, tier: number) => string;
  saveBill: (kind: 'estimate' | 'quotation', d: BillDraft) => Bill;
  startConvert: (estimateId: string | null) => void;
  /** OWNER ONLY. Turns an open estimate into a paid sale at the prices the owner chose. Points go to the salesman who made the estimate. */
  convertEstimate: (estimateId: string, choices: { pid: string; price: number; alloc: number[] }[], cash: number, online: number) => Bill;
  processReturn: (r: { kind: 'sales' | 'damage'; billId: string; staffId: string; lines: { pid: string; qty: number; loc: number }[]; cash: number; online: number }) => void;
  updateSettings: (s: Settings) => void;
  newDraft: () => string;
  patchDraft: (id: string, patch: Partial<Omit<Draft, 'id' | 'staffId'>>) => void;
  closeDraft: (id: string) => void;
  setActiveDraft: (id: string | null) => void;
  /* carpenters: all of these are owner only */
  addCarpenter: (v: { name: string; phone: string; area: string; skill: string; ratePct: number }) => void;
  updateCarpenter: (id: string, v: { name: string; phone: string; area: string; skill: string; ratePct: number; active: boolean }) => void;
  /** Sends a carpenter to this bill's customer. The fee is what the shop pays the carpenter once the job is done. */
  assignCarpenter: (billId: string, carpenterId: string, date: string, fee: number, note: string) => void;
  setJobDone: (billId: string, done: boolean) => void;
  removeJob: (billId: string) => void;
  /** Fix who brought the customer after the bill was made. */
  setReferrer: (billId: string, carpenterId: string | null) => void;
  payCarpenter: (carpenterId: string, amount: number, mode: string, note: string) => void;
  resetDemo: () => void;
}
export type Store = Data & Actions & { session: Session | null; insideShop: boolean; convert: ConvertDraft | null; drafts: Draft[]; activeDraft: string | null };

const storage: StateStorage = {
  getItem: (n) => (typeof window === 'undefined' ? null : window.localStorage.getItem(n)),
  setItem: (n, v) => { try { window.localStorage.setItem(n, v); } catch { /* quota: demo keeps working in-memory */ } },
  removeItem: (n) => { try { window.localStorage.removeItem(n); } catch { /* ignore */ } },
};
const ownerOnly = (s: { session: { role: string } | null }) => { if (s.session?.role !== 'admin') throw new Error('Only the owner can do this'); };
const code = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...buildSeed(), session: null, insideShop: true, convert: null, drafts: [], activeDraft: null,

      /* ---------- session & attendance ---------- */
      login: (staffId, owner) => set((s) => {
        const st = s.staff.find((x) => x.id === staffId)!;
        const session: Session = { role: st.role === 'admin' ? 'admin' : 'staff', staffId, ...(st.role === 'admin' ? { owner: owner ?? 'M' } : {}) };
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
      requestLeave: (from, to, type, reason) => set((s) => {
        const me = s.session!.staffId; const why = reason.trim();
        if (!from || !to || to < from) throw new Error('The last day cannot be before the first day');
        if (why.length < 5) throw new Error('Please write the reason for your leave (at least a few words)');
        const days = leaveDays(from, to, s.settings.weeklyOff);
        if (days === 0) throw new Error('Those dates are only the weekly off, so no leave is needed');
        if (s.leaves.some((l) => l.staffId === me && l.status !== 'rejected' && from <= l.to && to >= l.from)) throw new Error('You already have a leave request that overlaps these dates');
        return { leaves: [{ id: uid('L'), staffId: me, from, to, type, reason: why, days, requestedAt: new Date().toISOString(), status: 'pending' as const }, ...s.leaves] };
      }),
      decideLeave: (id, status, pay, note) => set((s) => {
        const l = s.leaves.find((x) => x.id === id)!;
        if (leaveLocked(s, l)) throw new Error('Salary for this period is already paid, so this leave can no longer change. Reopen the payslip first.');
        if (status === 'approved' && !pay) throw new Error('Choose whether this leave is paid or unpaid');
        if (status === 'rejected' && !(note ?? '').trim()) throw new Error('Write a short reason so the staff member knows why it was rejected');
        return { leaves: s.leaves.map((x) => (x.id === id ? { ...x, status, pay: status === 'approved' ? pay : undefined, note: (note ?? '').trim() || undefined, decidedAt: new Date().toISOString() } : x)) };
      }),
      addStaff: (name, phone, salary) => set((s) => {
        if (!name.trim()) throw new Error('Enter the name');
        if (!(salary > 0)) throw new Error('Enter the monthly salary');
        return { staff: [...s.staff, { id: uid('S'), name: name.trim(), phone, salary, joined: dk(new Date()), role: 'salesman' } as Staff] };
      }),
      updateStaff: (id, v) => set((s) => {
        if (!v.name.trim()) throw new Error('Enter the name');
        if (!(v.salary > 0)) throw new Error('Enter the monthly salary');
        return { staff: s.staff.map((x) => (x.id === id ? { ...x, ...v, name: v.name.trim() } : x)) };
      }),
      addPayAdjust: (staffId, month, kind, amount, note) => set((s) => {
        if (s.payslips.some((p) => p.staffId === staffId && p.month === month)) throw new Error(`${monthLabel(month)} is already paid. Reopen the payslip to change it.`);
        if (!(amount > 0)) throw new Error('Enter an amount');
        if (!note.trim()) throw new Error('Add a short note so the reason is on record');
        return { payAdjusts: [{ id: uid('PA'), staffId, month, kind, amount: Math.round(amount), note: note.trim(), date: new Date().toISOString() }, ...s.payAdjusts] };
      }),
      removePayAdjust: (id) => set((s) => {
        const a = s.payAdjusts.find((x) => x.id === id)!;
        if (s.payslips.some((p) => p.staffId === a.staffId && p.month === a.month)) throw new Error('This month is already paid. Reopen the payslip first.');
        return { payAdjusts: s.payAdjusts.filter((x) => x.id !== id) };
      }),
      /** Freezes the month's figures as a payslip. Leaves and adjustments for that month are locked afterwards. */
      payStaff: (staffId, month, mode) => set((s) => {
        const st = s.staff.find((x) => x.id === staffId)!;
        if (s.payslips.some((p) => p.staffId === staffId && p.month === month)) throw new Error('Already paid for this month');
        if (s.leaves.some((l) => l.staffId === staffId && l.status === 'pending' && l.from.slice(0, 7) <= month && l.to.slice(0, 7) >= month))
          throw new Error('There is a leave request for this month still waiting for your decision. Decide it first so the pay is right.');
        const c = computePay(s, st, month);
        if (c.net < 0) throw new Error(`Net pay is ${money(c.net)}. Reduce the advance or deductions before paying.`);
        const n = s.counters.pay;
        return { payslips: [{ ...figuresOf(c), id: uid('PS'), no: `SLP-${pad(n)}`, staffId, month, paidOn: new Date().toISOString(), mode }, ...s.payslips], counters: { ...s.counters, pay: n + 1 } };
      }),
      reopenPayslip: (id) => set((s) => ({ payslips: s.payslips.filter((p) => p.id !== id) })),

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
            updateVendor: (id, v) => set((s) => ({ vendors: s.vendors.map((x) => (x.id === id ? { ...v, id } : x)) })),
      /**
       * ONE way to add incoming stock. Without `bill` it only raises stock (opening stock, godown receipts, found stock).
       * With `bill` it also records the vendor's bill (adds to what we owe) and updates each product's last purchase price.
       */
      addStockIn: (note, lines, bill) => set((s) => {
        const pm = new Map(s.products.map((p) => [p.id, p]));
        // Direct-to-shop products always land in Main Shop, whatever the entry says.
        const clean = lines.map((l) => {
          const sum = l.qty.reduce((a, b) => a + (b || 0), 0);
          return { pid: l.pid, qty: pm.get(l.pid)?.shopOnly ? [sum, 0, 0] : [0, 1, 2].map((i) => l.qty[i] || 0) };
        }).filter((l) => l.qty.some((q) => q > 0));
        if (!clean.length) throw new Error('Enter a quantity for at least one product');
        const now = new Date().toISOString(); const n = s.counters.sin;
        let purchase: Purchase | undefined;
        if (bill) {
          const billNo = bill.billNo.trim();
          if (!bill.vendorId) throw new Error('Choose the vendor this delivery came from');
          if (!billNo) throw new Error('Enter the vendor bill number');
          if (s.purchases.some((p) => p.vendorId === bill.vendorId && p.billNo.toLowerCase() === billNo.toLowerCase()))
            throw new Error(`Bill ${billNo} from this vendor is already recorded. Check it was not entered before.`);
          for (const l of clean) if (!((bill.prices[l.pid] ?? 0) > 0)) throw new Error(`Enter the purchase price for "${pm.get(l.pid)!.name}"`);
          const pl = clean.map((l) => ({ pid: l.pid, qty: l.qty, price: bill.prices[l.pid] }));
          purchase = { id: uid('P'), no: `PUR-${pad(s.counters.pur)}`, vendorId: bill.vendorId, date: now, billNo, lines: pl, total: pl.reduce((a, l) => a + l.price * l.qty.reduce((x, y) => x + y, 0), 0) };
        }
        const m = new Map(clean.map((l) => [l.pid, l.qty]));
        return {
          stockIns: [{ id: uid('SI'), no: `SIN-${pad(n)}`, date: now, by: s.session?.staffId ?? '', note, lines: clean, purchaseId: purchase?.id }, ...s.stockIns],
          purchases: purchase ? [purchase, ...s.purchases] : s.purchases,
          counters: { ...s.counters, sin: n + 1, pur: purchase ? s.counters.pur + 1 : s.counters.pur },
          products: s.products.map((p) => {
            const q = m.get(p.id); if (!q) return p;
            return { ...p, pp: purchase ? bill!.prices[p.id] : p.pp, stock: p.stock.map((x, i) => x + q[i]) };
          }),
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
        if (d.fromEstimate && s.session?.role !== 'admin') throw new Error('Only the owner can convert an estimate to a sale');
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
          convertedBy: d.fromEstimate ? s.session?.staffId : undefined, convertedAt: d.fromEstimate ? now.toISOString() : undefined,
          referredBy: d.referredBy || undefined, needsCarpenter: d.needsCarpenter || undefined,
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
      convertEstimate: (estimateId, choices, cash, online) => {
        const s = get(); const est = s.bills.find((b) => b.id === estimateId);
        if (s.session?.role !== 'admin') throw new Error('Only the owner can convert an estimate to a sale');
        if (!est || est.kind !== 'estimate') throw new Error('Estimate not found');
        if (est.status !== 'open') throw new Error('This estimate has already been converted');
        if (!choices.length) throw new Error('Keep at least one item in the sale');
        const lines: BillLine[] = choices.map((c) => {
          const o = est.lines.find((l) => l.pid === c.pid); if (!o) throw new Error('An item is not part of this estimate');
          if (!(c.price > 0)) throw new Error('Every price must be more than zero');
          return { pid: c.pid, qty: o.qty, price: Math.round(c.price), alloc: c.alloc, estPrice: o.price };
        });
        // Points go to est.staffId: the salesman who made the estimate, not the owner.
        const nb = get().saveBill('quotation', { referredBy: est.referredBy, needsCarpenter: est.needsCarpenter, staffId: est.staffId, customerId: est.customerId, tier: est.tier, lines, cash, online, fromEstimate: est.id });
        if (est.job) set((st) => ({ bills: st.bills.map((b) => (b.id === nb.id ? { ...b, job: est.job } : b)) }));
        return nb;
      },

      /* ---------- carpenters (owner only) ---------- */
      addCarpenter: (v) => { ownerOnly(get()); const name = v.name.trim(); if (name.length < 2) throw new Error('Enter the carpenter\'s name'); if (!/^\d{10}$/.test(v.phone)) throw new Error('Phone number must be 10 digits'); if (get().carpenters.some((c) => c.phone === v.phone)) throw new Error('A carpenter with this phone number already exists'); if (!(v.ratePct >= 0 && v.ratePct <= 20)) throw new Error('Commission must be between 0 and 20 percent');
        set((s) => ({ carpenters: [...s.carpenters, { id: uid('K'), ...v, name, joined: new Date().toISOString(), active: true }] })); },
      updateCarpenter: (id, v) => { ownerOnly(get()); if (v.name.trim().length < 2) throw new Error('Enter the carpenter\'s name'); if (!/^\d{10}$/.test(v.phone)) throw new Error('Phone number must be 10 digits'); if (!(v.ratePct >= 0 && v.ratePct <= 20)) throw new Error('Commission must be between 0 and 20 percent');
        set((s) => ({ carpenters: s.carpenters.map((c) => (c.id === id ? { ...c, ...v, name: v.name.trim() } : c)) })); },
      assignCarpenter: (billId, carpenterId, date, fee, note) => { ownerOnly(get()); if (!get().carpenters.some((c) => c.id === carpenterId)) throw new Error('Choose a carpenter'); if (!date) throw new Error('Choose the date of the job'); if (!(fee >= 0)) throw new Error('Fee cannot be negative');
        set((s) => ({ bills: s.bills.map((b) => (b.id === billId ? { ...b, needsCarpenter: undefined, job: { carpenterId, status: 'booked' as const, date, fee: Math.round(fee), note: note.trim(), assignedAt: new Date().toISOString() } } : b)) })); },
      setJobDone: (billId, done) => { ownerOnly(get()); set((s) => ({ bills: s.bills.map((b) => (b.id === billId && b.job ? { ...b, job: { ...b.job, status: done ? 'done' as const : 'booked' as const, doneAt: done ? new Date().toISOString() : undefined } } : b)) })); },
      removeJob: (billId) => { ownerOnly(get()); set((s) => ({ bills: s.bills.map((b) => (b.id === billId ? { ...b, job: undefined } : b)) })); },
      setReferrer: (billId, carpenterId) => { ownerOnly(get()); set((s) => ({ bills: s.bills.map((b) => (b.id === billId ? { ...b, referredBy: carpenterId || undefined } : b)) })); },
      payCarpenter: (carpenterId, amount, mode, note) => { ownerOnly(get()); const row = carpRows(get()).find((r) => r.c.id === carpenterId); if (!row) throw new Error('Carpenter not found');
        const a = Math.round(amount); if (!(a > 0)) throw new Error('Enter an amount'); if (a > row.balance) throw new Error(`Only ${money(row.balance)} is owed to ${row.c.name}`);
        set((s) => ({ carpPayouts: [{ id: uid('CP'), no: `CPY-${pad(s.carpPayouts.length + 1)}`, carpenterId, date: new Date().toISOString(), amount: a, mode, note: note.trim() }, ...s.carpPayouts] })); },

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

      /* ---------- bills in progress (several at once) ---------- */
      newDraft: () => {
        const id = uid('D'); const me = get().session?.staffId ?? '';
        set((s) => ({ drafts: [...s.drafts, { id, staffId: me, phone: '', tier: null, lines: [], createdAt: new Date().toISOString() }], activeDraft: id }));
        return id;
      },
      patchDraft: (id, patch) => set((s) => ({ drafts: s.drafts.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      closeDraft: (id) => set((s) => {
        const mine = s.drafts.filter((x) => x.staffId === s.session?.staffId); const i = mine.findIndex((x) => x.id === id);
        const rest = s.drafts.filter((x) => x.id !== id); const next = mine.filter((x) => x.id !== id);
        return { drafts: rest, activeDraft: s.activeDraft === id ? (next[Math.min(i, next.length - 1)]?.id ?? null) : s.activeDraft };
      }),
      setActiveDraft: (id) => set({ activeDraft: id }),

      updateSettings: (settings) => set({ settings }),
      resetDemo: () => set({ ...buildSeed(), session: null, insideShop: true, convert: null, drafts: [], activeDraft: null }),
    }),
    {
      name: 'nt-demo-v7', storage: createJSONStorage(() => storage),
      // Saved data from an older version is merged over today's defaults, so newer fields (stockIns, counters.sin) always exist.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Store>;
        return { ...current, ...p, stockIns: p.stockIns ?? current.stockIns, drafts: p.drafts ?? [], payAdjusts: p.payAdjusts ?? current.payAdjusts, payslips: p.payslips ?? current.payslips, carpenters: p.carpenters ?? current.carpenters, carpPayouts: p.carpPayouts ?? current.carpPayouts, counters: { ...current.counters, ...(p.counters ?? {}) }, settings: { ...current.settings, ...(p.settings ?? {}) } } as Store;
      },
    }
  )
);
export const useProductMap = () => { const p = useStore((s) => s.products); return useMapMemo(p); };
import { useMemo } from 'react';
function useMapMemo(p: Data['products']) { return useMemo(() => new Map(p.map((x) => [x.id, x])), [p]); }
import { Attendance, Bill, Customer, Data, Leave, PayAdjust, Product, Purchase, Staff, Vendor, VendorPayment } from './types';
import { calcPoints, dk, mk, pad } from './rules';
import { computePay, figuresOf, leaveDays, shiftMonth } from './payroll';

const dayKey = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return dk(d); };
function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const CATS: [string, string, string, number, number][] = [
  ['Modular Switches','Switch','pcs',40,300],['Sockets & Plugs','Socket','pcs',50,400],['Wires & Cables','Copper Wire','coil',900,6500],['MCB & Distribution','MCB','pcs',150,1800],
  ['LED Lighting','LED Bulb','pcs',60,900],['Ceiling Fans','Fan','pcs',1500,4500],['Conduit Pipes','Conduit','m',20,120],['Extension Boards','Extension Board','pcs',200,1200],
  ['PVC Pipes','PVC Pipe','m',80,600],['CPVC Fittings','CPVC Fitting','pcs',15,250],['GI Fittings','GI Fitting','pcs',30,500],['Water Tanks','Water Tank','pcs',2500,15000],
  ['Taps & Faucets','Tap','pcs',150,2500],['Showers','Shower','pcs',300,5000],['Sanitaryware','Sanitary Item','pcs',1200,9000],['Pumps & Motors','Pump','pcs',3500,18000],
  ['Interior Paints','Paint','ltr',250,4500],['Exterior Paints','Exterior Paint','ltr',300,5000],['Primers & Putty','Putty','kg',40,900],['Enamels & Thinners','Enamel','ltr',150,1200],
  ['Paint Brushes','Brush','pcs',20,350],['Rollers & Trays','Roller','pcs',40,450],['Wood Polish','Polish','ltr',200,1500],['Waterproofing','Waterproofing Coat','ltr',200,2500],
  ['Nuts & Bolts','Bolt','box',60,900],['Screws','Screw','box',40,700],['Nails & Staples','Nails','kg',60,300],['Anchors & Rawl Plugs','Anchor','box',50,600],
  ['Washers & Rivets','Rivet','box',30,400],['Chains & Hooks','Chain','m',25,400],['Hinges','Hinge','pair',20,500],['Door Handles','Handle','pcs',80,2200],
  ['Locks & Padlocks','Lock','pcs',60,2500],['Door Closers','Closer','pcs',300,2500],['Drawer Channels','Channel','pair',60,600],['Cabinet Fittings','Fitting','pcs',20,500],
  ['Hand Tools','Tool','pcs',40,1200],['Spanners & Wrenches','Spanner','set',100,2500],['Pliers & Cutters','Plier','pcs',60,900],['Measuring Tapes','Tape','pcs',30,600],
  ['Drill Machines','Drill','pcs',1500,9000],['Grinders','Grinder','pcs',1800,7500],['Drill Bits','Drill Bit','set',40,1500],['Cutting Discs','Disc','pcs',25,300],
  ['Sandpaper','Sandpaper','pcs',5,60],['Welding Supplies','Welding Rod','box',150,1200],['Adhesives','Adhesive','pcs',20,700],['Sealants','Sealant','pcs',80,900],
  ['Tiles','Tile','box',300,2500],['Tile Adhesive','Tile Adhesive','bag',250,900],['Plywood','Plywood','sheet',600,3500],['Laminates','Laminate','sheet',500,2500],
  ['Safety Gear','Safety Item','pcs',30,1500],['Gloves','Gloves','pair',20,300],['Ladders','Ladder','pcs',1500,7500],['Garden Tools','Garden Tool','pcs',60,1500],
  ['Cleaning Supplies','Cleaner','pcs',20,500],['Hoses & Sprayers','Hose','m',30,200],['Tarpaulin & Sheets','Tarpaulin','pcs',200,3000],['Batteries & Torches','Torch','pcs',50,1200],
];
export const CATEGORIES = CATS.map((c) => c[0]);
const BRANDS = ['Prime', 'Apex', 'Zenith', 'Vertex', 'Orion', 'Nova'];
const SERIES = ['Std', 'Pro', 'Plus', 'Max'];
const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const FIRST = ['Imran','Arif','Salman','Faisal','Rahul','Suresh','Mahesh','Kiran','Naveen','Ravi','Zaheer','Irfan','Vijay','Anil','Sandeep','Mohsin','Asif','Prakash','Ramesh','Yusuf'];
const LAST = ['Khan','Reddy','Sharma','Rao','Ali','Syed','Naidu','Gupta','Patel','Hussain','Mehta','Shaikh','Verma','Qureshi','Goud'];

export function buildSeed(): Data {
  const r = rng(42);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const daysAgo = (n: number, h = 11) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, Math.floor(r() * 60), 0, 0); return d.toISOString(); };

  const products: Product[] = [];
  CATS.forEach((c, ci) => {
    for (let k = 0; k < 113; k++) {
      const size = Math.floor(k / 24) % 5;
      const base = (c[3] + r() * (c[4] - c[3])) * (1 + size * 0.1);
      const pp = Math.max(3, Math.round(base));
      const x = r();
      const q = () => Math.floor(r() * (r() < 0.12 ? 8 : 90));
      const stock = x < 0.3 ? [q(), 0, 0] : x < 0.55 ? [q(), q(), 0] : x < 0.75 ? [0, q(), q()] : x < 0.92 ? [q(), q(), q()] : [0, q(), 0];
      products.push({
        id: `NT-${pad(ci, 2)}-${pad(k, 3)}`, sku: `NT-${pad(ci, 2)}-${pad(k, 3)}`,
        name: `${BRANDS[k % 6]} ${c[1]} ${SERIES[Math.floor(k / 6) % 4]} ${SIZES[size]}`,
        brand: BRANDS[k % 6], model: `${c[1]} ${SIZES[size]}`, variant: SERIES[Math.floor(k / 6) % 4],
        cat: c[0], unit: c[2], pp, prices: [1.38, 1.28, 1.2, 1.12].map((m) => Math.round(pp * m)),
        stock, min: pp > 1500 ? 3 : r() < 0.5 ? 10 : 20, shopOnly: x < 0.3,
      });
    }
  });

  const staff: Staff[] = [
    { id: 'S0', name: 'Owner (Admin)', role: 'admin', phone: '9000000000', salary: 0 },
    ...['Imran', 'Salman', 'Naveen', 'Faisal', 'Kiran', 'Zaheer'].map((n, i) => ({ id: `S${i + 1}`, name: n, role: 'salesman' as const, phone: `90000000${pad(i + 1, 2)}`, salary: [20000, 16000, 15000, 15000, 13500, 12000][i], joined: dayKey(74) })),
  ];
  const salesmen = staff.filter((s) => s.role === 'salesman');

  const customers: Customer[] = [{ id: 'C0', phone: '9876500001', name: 'Demo Repeat Customer', tier: 1 }];
  for (let i = 1; i <= 140; i++) customers.push({ id: `C${i}`, phone: String(9100000000 + Math.floor(r() * 899999999)), name: `${pick(FIRST)} ${pick(LAST)}`, tier: Math.floor(r() * 4) });

  const vendors: Vendor[] = ['Metro Electricals','Sri Sai Pipes','Deccan Paints','Bharat Hardware','Al-Noor Traders','Hyderabad Tools','Vijaya Fasteners','Kohinoor Sanitary','Prime Cables','Star Tiles','Ganesh Plywood','Royal Locks','City Safety Mart','Apex Abrasives']
    .map((n, i) => ({ id: `V${i + 1}`, name: n, phone: `98480${pad(10000 + i * 37, 5)}`, gst: i % 3 === 0 ? '' : `36AAAC${pad(i * 91, 4)}P1Z${i % 9}`, terms: pick(['Net 15', 'Net 30', 'Advance', 'Net 45']), opening: i % 4 === 0 ? 25000 + i * 1000 : 0 }));

  let po = 0;
  const purchases: Purchase[] = [];
  for (let i = 0; i < 40; i++) {
    const lines = Array.from({ length: 3 + Math.floor(r() * 5) }, () => {
      const p = pick(products);
      return { pid: p.id, qty: [Math.floor(r() * 40), Math.floor(r() * 30), Math.floor(r() * 30)], price: p.pp };
    });
    po++;
    purchases.push({ id: `P${po}`, no: `PUR-${pad(po)}`, vendorId: pick(vendors).id, date: daysAgo(Math.floor(r() * 120)), billNo: `INV-${Math.floor(1000 + r() * 8999)}`,
      lines, total: lines.reduce((a, l) => a + l.price * l.qty.reduce((x, y) => x + y, 0), 0) });
  }
  const payments: VendorPayment[] = [];
  purchases.forEach((p, i) => { if (r() < 0.65) payments.push({ id: `VP${i}`, vendorId: p.vendorId, date: p.date, amount: Math.round(p.total * (r() < 0.7 ? 1 : 0.5)), mode: pick(['Cash', 'Online', 'Cheque']) }); });

  // Usual vendor per category, by index into the vendors list above (electrical, plumbing, paints, fasteners, locks, tools, tiles, safety, cleaning)
  const CAT_VENDOR = [0, 0, 8, 0, 0, 0, 0, 0, 1, 1, 1, 1, 7, 7, 7, 1, 2, 2, 2, 2, 2, 2, 2, 2, 6, 6, 6, 6, 6, 6, 3, 3, 11, 11, 3, 3, 5, 5, 5, 5, 5, 5, 13, 13, 13, 13, 3, 3, 9, 9, 10, 10, 12, 12, 12, 4, 4, 4, 4, 4];
  // Older, fully paid purchase history: each category has a usual vendor (separate random stream, so other demo data is unchanged)
  const r2 = rng(7);
  CATS.forEach((c, ci) => {
    const vendor = vendors[CAT_VENDOR[ci]]; const base = ci * 113;
    const lines = Array.from({ length: 30 }, () => { const p = products[base + Math.floor(r2() * 113)]; return { pid: p.id, qty: [Math.floor(r2() * 30), Math.floor(r2() * 30), 0], price: p.pp }; });
    const total = lines.reduce((a, l) => a + l.price * l.qty.reduce((x, y) => x + y, 0), 0);
    const date = new Date(Date.now() - (110 + Math.floor(r2() * 70)) * 86400000).toISOString();
    purchases.push({ id: `PH${ci}`, no: `PUR-H${pad(ci, 2)}`, vendorId: vendor.id, date, billNo: `OLD-${1000 + ci}`, lines, total });
    payments.push({ id: `VPH${ci}`, vendorId: vendor.id, date, amount: total, mode: 'Cheque' });
  });

  let q = 0, e = 0;
  const bills: Bill[] = [];
  const mkBill = (kind: 'quotation' | 'estimate', daysBack: number, cust: Customer, st: Staff, picks?: Product[]): Bill => {
    const ps = picks ?? Array.from({ length: 1 + Math.floor(r() * 5) }, () => pick(products));
    const lines = ps.map((p) => {
      const qty = 1 + Math.floor(r() * 8);
      const alloc = [0, 0, 0]; if (kind === 'quotation') { const li = p.stock.findIndex((s) => s > 0); alloc[li < 0 ? 0 : li] = qty; }
      return { pid: p.id, qty, price: p.prices[cust.tier], alloc };
    });
    const total = lines.reduce((a, l) => a + l.qty * l.price, 0);
    const date = daysAgo(daysBack, 10 + Math.floor(r() * 10));
    if (kind === 'quotation') {
      q++; const cash = r() < 0.5 ? total : r() < 0.5 ? 0 : Math.round(total / 2);
      return { id: `B${q}`, no: `QUO-${pad(q)}`, kind, code: Math.random().toString(36).slice(2, 18), date, staffId: st.id, customerId: cust.id, tier: cust.tier, lines, total, cash, online: total - cash, points: calcPoints(total, 10), status: 'paid' };
    }
    // some estimate prices are older than today's price list, so the owner sees changed prices when converting
    const el = lines.map((l) => (r() < 0.3 ? { ...l, price: Math.round(l.price * (r() < 0.5 ? 0.92 : 1.06)) } : l)); const et = el.reduce((a, l) => a + l.qty * l.price, 0);
    e++; return { id: `E${e}`, no: `EST-${pad(e)}`, kind, code: Math.random().toString(36).slice(2, 18), date, staffId: st.id, customerId: cust.id, tier: cust.tier, lines: el, total: et, cash: 0, online: 0, points: 0, status: 'open',
      validUntil: new Date(new Date(date).getTime() + 7 * 86400000).toISOString() };
  };
  for (let i = 0; i < 520; i++) bills.push(mkBill('quotation', Math.floor(Math.pow(r(), 1.3) * 90), pick(customers.slice(1)), pick(salesmen)));
  for (let i = 0; i < 50; i++) bills.push(mkBill('estimate', Math.floor(r() * 14), pick(customers.slice(1)), pick(salesmen)));
  // Demo scenario: the "Demo Repeat Customer" bought two specific products 3 days ago
  bills.push(mkBill('quotation', 3, customers[0], salesmen[0], [products[5], products[1200]]));
  bills.sort((a, b) => b.date.localeCompare(a.date));

  // Leaves: one waiting for a decision, one approved PAID, one approved UNPAID, one rejected. Attendance is skipped on approved leave days.
  const mkLeave = (id: string, staffId: string, from: number, to: number, type: string, reason: string, x: Partial<Leave>): Leave =>
    ({ id, staffId, from: dayKey(from), to: dayKey(to), type, reason, days: leaveDays(dayKey(from), dayKey(to), 0), requestedAt: new Date(Date.now() - (Math.max(from, to) + 4) * 86400000).toISOString(), status: 'approved', ...x });
  const leaves: Leave[] = [
    mkLeave('L1', 'S2', -2, -3, 'Casual', 'Family function in Warangal, need to travel the day before', { status: 'pending', requestedAt: new Date(Date.now() - 3600000 * 5).toISOString() }),
    mkLeave('L2', 'S1', 33, 32, 'Sick', 'Viral fever. Doctor advised two days of rest', { pay: 'paid', note: 'Get well soon. Medical leave is paid.', decidedAt: dayKey(34) }),
    mkLeave('L3', 'S3', 20, 18, 'Casual', "Cousin's wedding in Vijayawada", { pay: 'unpaid', note: 'Casual leave for the year already used, so this one is unpaid.', decidedAt: dayKey(24) }),
    mkLeave('L4', 'S4', 12, 12, 'Casual', 'Bike repair at the service centre', { status: 'rejected', note: 'Month-end stock counting that day, everyone is needed.', decidedAt: dayKey(14) }),
  ];
  const onLeave = (sid: string, key: string) => leaves.some((l) => l.staffId === sid && l.status === 'approved' && key >= l.from && key <= l.to);
  const attendance: Attendance[] = [];
  salesmen.forEach((s, si) => {
    for (let d = 0; d < 75; d++) {
      if (d > 0 && (new Date(Date.now() - d * 86400000).getDay() === 0 || r() < 0.06)) continue;
      const day = new Date(); day.setDate(day.getDate() - d);
      const inT = new Date(day); inT.setHours(9, 25 + Math.floor(r() * 70), 0, 0);
      const outT = new Date(day); outT.setHours(19, Math.floor(r() * 50), 0, 0);
      const bs = new Date(day); bs.setHours(13, Math.floor(r() * 30), 0, 0); const be = new Date(bs.getTime() + (25 + Math.floor(r() * 20)) * 60000);
      if (d === 0 && si > 3) continue;
      if (onLeave(s.id, dk(day))) continue;
      attendance.push({ id: `A${s.id}-${d}`, staffId: s.id, date: dk(day), in: inT.toISOString(), out: d === 0 ? undefined : outT.toISOString(), breaks: d === 0 ? [] : [{ s: bs.toISOString(), e: be.toISOString() }], gaps: [] });
    }
  });

  // Payroll: a bonus last month, an advance this month, and last month's salary already paid for the first three people.
  const prev = shiftMonth(mk(new Date()), -1);
  const payAdjusts: PayAdjust[] = [
    { id: 'PA1', staffId: 'S1', month: prev, kind: 'bonus', amount: 1000, note: 'Festival bonus', date: dayKey(25) },
    { id: 'PA2', staffId: 'S2', month: mk(new Date()), kind: 'advance', amount: 2000, note: 'Advance for medical expense', date: dayKey(8) },
  ];
  const payslips: Data['payslips'] = [];

  // Cost of some products has risen since their selling prices were set: sales of these look thin or below cost at the latest purchase price.
  products.forEach((p, i) => { if (i % 37 === 0) p.pp = Math.round(p.pp * 1.3); });

  const data: Data = {
    products, vendors, purchases, payments, staff, attendance, leaves, payAdjusts, payslips,
    customers, bills, returns: [], stockIns: [], transfers: [], adjustments: [],
    settings: { pointsPer1000: 10, repeatDays: 15, estimateDays: 7, linkDays: 60, lateAfter: '10:00', weeklyOff: 0 },
    counters: { est: e + 1, quo: q + 1, ret: 1, pur: po + 1, sin: 1, pay: 1 },
  };
  salesmen.slice(0, 3).forEach((st, i) => {
    const c = computePay(data, st, prev);
    payslips.push({ ...figuresOf(c), id: `PS${i + 1}`, no: `SLP-${pad(i + 1)}`, staffId: st.id, month: prev, paidOn: new Date(Date.now() - 18 * 86400000).toISOString(), mode: i === 1 ? 'Online' : 'Cash' });
  });
  data.counters.pay = payslips.length + 1;
  return data;
}
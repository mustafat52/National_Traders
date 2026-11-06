import { pricesFrom } from './pricing';
import { PREFIX } from './groups';
import { DEFAULT_LOCS, Data, Product, Staff } from './types';

/** Real starting data. No demo bills, vendors or customers: everything here is what the shop really has. */

/** Real people. Salary and joining date are filled in later from the Staff screen. */
const STAFF: Staff[] = [
  { id: 'S0', name: 'Owner (Admin)', role: 'admin', phone: '', salary: 0 },
  { id: 'S1', name: 'Juzer Ali Asger', role: 'salesman', phone: '8121875253', salary: 0 },
  { id: 'S2', name: 'Aarhan Khan', role: 'salesman', phone: '7799693352', salary: 0 },
  { id: 'S3', name: 'Nabeel', role: 'salesman', phone: '7702074015', salary: 0 },
  { id: 'S4', name: 'Huzaifa Abbas Hussain Kanchwala', role: 'salesman', phone: '9290169406', salary: 0 },
];

/** One sheet from the client: [product name, colour or finish, MRP, cost price]. MRP 0 means no price given yet. */
type Row = [string, string, number, number];
/** disc = discount % off MRP, in this order: Retail (A), Carpenter (B), Wholesale (C), Default. Each sheet from the client can have its own. */
interface Batch { cat: string; sub: string; disc: number[]; rows: Row[] }

const KEY_STAND: Row[] = [
  ['KEY STAND BIKE', 'BLACK+R/G', 600, 150], ['KEY STAND BIKE', 'R/G+BLACK', 600, 150], ['KEY STAND BIRDS', 'ACRYLIC', 924, 231], ['KEY STAND BUTTERFLY', 'ACRYLIC', 441, 110],
  ['KEY STAND CAR', 'ANTIK', 720, 180], ['KEY STAND CAR', 'R/G', 720, 180], ['KEY STAND CYCLE', 'ANTIK', 800, 200], ['KEY STAND CYCLE', 'R/G', 800, 200],
  ['KEY STAND DEER', 'ANTIK+BLACK', 2172, 543], ['KEY STAND DEER', 'GOLD+BLACK', 2172, 543], ['KEY STAND DEER', 'R/G+BLACK', 2172, 543], ['KEY STAND DEER', 'SATIN+BLACK', 2172, 543],
  ['KEY STAND FLUTE', 'ANTIK', 560, 126], ['KEY STAND GITAR', 'ACRYLIC', 380, 95], ['KEY STAND GITAR ZN', 'ANTIK', 380, 90], ['KEY STAND GITAR ZN', 'CP+WENGI', 380, 95],
  ['KEY STAND HELICOPTER', 'GOLD+BLACK', 2960, 740], ['KEY STAND HOME SS', 'ANTIK', 780, 195], ['KEY STAND HORSE', 'ACRYLIC', 930, 233], ['KEY STAND HOUSE', 'ACRYLIC', 1052, 263],
  ['KEY STAND JHUMAR 360°', 'ANTIK+BLACK', 1792, 448], ['KEY STAND JHUMAR 360°', 'GOLD+BLACK', 1792, 448], ['KEY STAND JHUMAR 360°', 'R/G+BLACK', 1792, 448], ['KEY STAND JHUMAR 360°', 'SATIN+BLACK', 1792, 448],
  ['KEY STAND PANDA', 'ACRYLIC', 760, 190], ['KEY STAND PLASTIC', '', 0, 0], ['KEY STAND ROYAL GUN ZN', 'ANTIK', 560, 100], ['KEY STAND SITAR ZN', 'ANTIK', 380, 92.5],
  ['KEY STAND SWEET HOME', 'ANTIK', 1028, 257], ['KEY STAND SWEET HOME', 'GOLD', 1028, 257], ['KEY STAND SWEET HOME', 'R/G', 1028, 257],
  ['KEY STAND UMBRELLA', 'CP+WENGI', 0, 0], ['KEY STAND WINTAGE CAR', 'R/G+BLACK', 720, 180],
];

const HOOKS: Row[] = [
  ['HOOK NTH-901', 'ANTIK', 120, 30], ['HOOK NTH-901', 'CP', 120, 30], ['HOOK NTH-901', 'GOLD', 120, 30], ['HOOK NTH-901', 'R/G', 120, 30],
  ['HOOK NTH-902', 'ANTIK', 148, 37], ['HOOK NTH-903', 'GLOSSY', 40, 9.81], ['HOOK NTH-904', 'GLOSSY', 68, 17], ['HOOK NTH-905', 'ANTIK', 232, 58],
  ['HOOK NTH-906', 'RED', 96, 24], ['HOOK NTH-906', 'WENGI', 96, 24], ['HOOK NTH-907', 'ANTIK', 350, 87.5], ['HOOK NTH-907', 'R/G', 350, 88], ['HOOK NTH-907', 'WHITE', 350, 87.5],
  ['HOOK NTH-908', 'GOLD', 120, 30], ['HOOK NTH-909', 'CP', 320, 80], ['HOOK NTH-910', 'CP+WENGI', 420, 105], ['HOOK NTH-911', 'CP+WENGI', 450, 112.5], ['HOOK NTH-912', 'WHITE', 108, 27],
  ['HOOK NTH-913', 'BLACK+CP', 520, 130], ['HOOK NTH-913', 'COPPER+CP', 520, 130],
  ['HOOK NTH-914', 'ANTIK+BLACK', 352, 72], ['HOOK NTH-914', 'BLACK+R/G', 352, 72], ['HOOK NTH-914', 'R/G+BLACK', 352, 72], ['HOOK NTH-914', 'SATIN+CP', 352, 72],
  ['HOOK NTH-915', 'ANTIK', 444, 111], ['HOOK NTH-916', 'ANTIK', 148, 37], ['HOOK NTH-917', 'ANTIK', 592, 148],
  ['HOOK NTH-918', 'ANTIK+WENGI', 340, 85], ['HOOK NTH-918', 'SATIN+WENGI', 340, 85],
  ['HOOK NTH-919', 'GLOSSY', 144, 36], ['HOOK NTH-920', 'GLOSSY', 480, 118.4], ['HOOK NTH-921', 'R/G', 260, 65], ['HOOK NTH-922', 'BLACK', 251, 62.6], ['HOOK NTH-923', 'ANTIK', 260, 65],
];

/** The sheets received so far, in the order they arrived (product codes run on from one to the next). */
const BATCHES: Batch[] = [
  { cat: 'HARDWARE', sub: 'KEY STAND', disc: [30, 55, 72, 45], rows: KEY_STAND },
  { cat: 'HARDWARE', sub: 'HOOKS', disc: [30, 50, 70, 45], rows: HOOKS },
];

function catalogue(): Product[] {
  const next = new Map<string, number>();
  return BATCHES.flatMap((b) => b.rows.map(([base, color, mrp, cost]) => {
    const pre = PREFIX[b.cat]; const n = (next.get(pre) ?? 0) + 1; next.set(pre, n); const sku = `${pre}-${String(n).padStart(5, '0')}`;
    return {
      id: 'NT-' + sku, sku, name: color ? `${base} (${color})` : base, cat: b.cat, sub: b.sub, unit: 'pcs', pp: cost, mrp: mrp > 0 ? mrp : undefined, disc: [...b.disc],
      prices: mrp > 0 ? pricesFrom(mrp, b.disc) : [0, 0, 0, 0], stock: DEFAULT_LOCS.map(() => 0), min: 0, model: base, variant: color, color: color || undefined, shopOnly: true,
    } as Product;
  }));
}

export function buildReal(): Data {
  return {
    products: catalogue(), vendors: [], purchases: [], payments: [], staff: STAFF, attendance: [], leaves: [], payAdjusts: [], payslips: [], carpenters: [], carpPayouts: [],
    customers: [], bills: [], returns: [], stockIns: [], transfers: [], adjustments: [],
    settings: { pointsPer1000: 10, repeatDays: 15, estimateDays: 7, linkDays: 60, lateAfter: '10:00', weeklyOff: 0, locations: [...DEFAULT_LOCS] },
    counters: { est: 1, quo: 1, ret: 1, pur: 1, sin: 1, pay: 1 },
  };
}
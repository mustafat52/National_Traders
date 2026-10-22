export const LOCS = ['Main Shop', 'Godown 1', 'Godown 2'];
export const TIER_NAMES = ['Category A', 'Category B', 'Category C', 'Category D'];

export interface Product {
  id: string; sku: string; name: string; cat: string; unit: string;
  pp: number;            // purchase price (ADMIN ONLY, never shown to salesmen)
  prices: number[];      // selling price per customer category (4)
  stock: number[];       // stock per location (3)
  min: number;           // low-stock threshold (total quantity)
  brand?: string;        // company, e.g. "Prime"
  model?: string;        // product within the company (size/model), e.g. "Switch XL"
  variant?: string;      // the sellable variant, e.g. "Pro" (each variant is one SKU)
  shopOnly?: boolean;    // arrives directly at the shop: stock-in / purchases always go to Main Shop, no location prompt
}
export interface Vendor { id: string; name: string; phone: string; gst: string; terms: string; opening: number; }
export interface PurchaseLine { pid: string; qty: number[]; price: number; }
export interface Purchase { id: string; no: string; vendorId: string; date: string; billNo: string; lines: PurchaseLine[]; total: number; }
export interface VendorPayment { id: string; vendorId: string; date: string; amount: number; mode: string; }
export interface Staff { id: string; name: string; role: 'admin' | 'salesman'; phone: string; }
export interface Gap { out: string; back?: string; }
export interface Attendance { id: string; staffId: string; date: string; in: string; out?: string; breaks: { s: string; e?: string }[]; gaps: Gap[]; }
export interface Leave { id: string; staffId: string; from: string; to: string; type: string; reason: string; status: 'pending' | 'approved' | 'rejected'; }
export interface Customer { id: string; phone: string; name: string; tier: number; }
export interface BillLine { pid: string; qty: number; price: number; alloc: number[]; }
export interface Bill {
  id: string; no: string; kind: 'estimate' | 'quotation'; code: string; date: string;
  staffId: string; customerId: string; tier: number; lines: BillLine[]; total: number;
  cash: number; online: number; points: number;
  status: 'open' | 'paid' | 'converted'; fromEstimate?: string; validUntil?: string;
}
export interface ReturnLine { pid: string; qty: number; amount: number; pp: number; loc: number; }
export interface ReturnRec {
  id: string; no: string; kind: 'sales' | 'damage'; billId: string; date: string; staffId: string;
  lines: ReturnLine[]; refundCash: number; refundOnline: number; pointsReversed: number;
}
/** purchaseId is set when the delivery came with a vendor bill (that bill is what adds to the vendor's payable). */
export interface StockIn { id: string; no: string; date: string; by: string; note: string; lines: { pid: string; qty: number[] }[]; purchaseId?: string; }
export interface Transfer { id: string; date: string; pid: string; from: number; to: number; qty: number; by: string; }
export interface Adjustment { id: string; date: string; pid: string; loc: number; from: number; to: number; reason: string; by: string; }
export interface Settings { pointsPer1000: number; repeatDays: number; estimateDays: number; linkDays: number; lateAfter: string; }
export interface Counters { est: number; quo: number; ret: number; pur: number; sin: number; }
export interface Data {
  products: Product[]; vendors: Vendor[]; purchases: Purchase[];payments: VendorPayment[];
  staff: Staff[]; attendance: Attendance[]; leaves: Leave[]; customers: Customer[]; bills: Bill[]; returns: ReturnRec[];
  stockIns: StockIn[]; transfers: Transfer[]; adjustments: Adjustment[]; settings: Settings; counters: Counters;
}
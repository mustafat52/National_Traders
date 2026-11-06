/** Prices come from MRP and a discount % per customer category. Lines keep their paise; only the bill total is rounded. */
export const DEFAULT_DISC = [30, 55, 72, 45]; // Retail (A), Carpenter (B), Wholesale (C), Default
export const priceFrom = (mrp: number, disc: number) => Math.round(mrp * (100 - disc)) / 100;
export const pricesFrom = (mrp: number, disc: number[]) => disc.map((d) => priceFrom(mrp, d));
/** Final bill amount: .50 and above goes up to the next whole rupee, below .50 goes down (1324.60 -> 1325, 1324.40 -> 1324). */
export const roundBill = (total: number) => Math.floor(Math.round(total * 100) / 100 + 0.5);
export const marginPct = (price: number, cost: number) => (cost > 0 ? Math.round(((price - cost) / cost) * 100) : null);
export const fmtPrice = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

import { fmtPrice } from './pricing';
import type { LabelContent, LabelSize, Product } from './types';

/** Sticker sizes offered until the owner adds his own. The owner can add, change and remove sizes on the Print Labels screen. */
export const DEFAULT_SIZES: LabelSize[] = [
  { id: 's-50x30', name: '50 × 30 mm', w: 50, h: 30 },
  { id: 's-38x25', name: '38 × 25 mm', w: 38, h: 25 },
  { id: 's-70x40', name: '70 × 40 mm', w: 70, h: 40 },
];
/** What a sticker shows unless the product says otherwise. */
export const DEFAULT_CONTENT: LabelContent = { qr: true, code: true, name: false, mrp: true };
export const contentOf = (p: Pick<Product, 'label'>): LabelContent => p.label ?? DEFAULT_CONTENT;
export const sameContent = (a: LabelContent, b: LabelContent) => a.qr === b.qr && a.code === b.code && a.name === b.name && a.mrp === b.mrp && !!a.desc === !!b.desc;
export const CONTENT_FIELDS: { k: keyof LabelContent; label: string }[] = [{ k: 'qr', label: 'QR' }, { k: 'code', label: 'Code' }, { k: 'name', label: 'Name' }, { k: 'mrp', label: 'MRP' }, { k: 'desc', label: 'Description' }];
/** Turns one field on or off. The last field cannot be switched off, and a QR always goes with the code under it. */
export function toggleContent(c: LabelContent, k: keyof LabelContent): LabelContent {
  const n = { ...c, [k]: !c[k] }; if (!n.qr && !n.code && !n.name && !n.mrp && !n.desc) return c; return n;
}
/** The MRP line printed on the label. */
export const mrpLine = (mrp?: number) => (mrp && mrp > 0 ? `MRP ₹${fmtPrice(mrp)}` : 'MRP not set');
export const hasMrp = (p: { mrp?: number }) => !!p.mrp && p.mrp > 0;
/** A label can print when it does not ask for an MRP, or the product has one. */
export const printable = (p: { mrp?: number }, c: LabelContent) => !c.mrp || hasMrp(p);
export const sizeName = (w: number, h: number) => `${+w.toFixed(1)} × ${+h.toFixed(1)} mm`;
export const MIN_MM = 15; export const MAX_MM = 200;
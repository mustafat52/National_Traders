import { fmtPrice } from './pricing';

/** Label (sticker) size in millimetres. PLACEHOLDER until the client confirms his real sticker size: change it here and the preview and printing follow. */
export const LABEL = { w: 50, h: 30 };
/** The MRP line printed on the label. */
export const mrpLine = (mrp?: number) => (mrp && mrp > 0 ? `MRP ₹${fmtPrice(mrp)}` : 'MRP not set');
export const hasMrp = (p: { mrp?: number }) => !!p.mrp && p.mrp > 0;
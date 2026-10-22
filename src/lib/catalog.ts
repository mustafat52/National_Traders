import { useMemo } from 'react';
import { Product } from './types';
import { isLow, stockTotal } from './rules';
import { slug } from './categories';
import { useStore } from './store';

/** Category -> Company -> Product (model/size) -> Variants (each variant is one sellable SKU). */
export interface ModelGroup { name: string; variants: Product[]; units: number }
export interface BrandNode { name: string; slug: string; models: ModelGroup[]; variants: number; units: number; low: number }
export interface CatNode { name: string; slug: string; brands: BrandNode[]; models: number; variants: number; units: number; low: number }

export function buildCatalog(products: Product[]): Map<string, CatNode> {
  const tree = new Map<string, Map<string, Map<string, Product[]>>>();
  for (const p of products) {
    const b = p.brand || 'Unbranded'; const m = p.model || p.name;
    let bm = tree.get(p.cat); if (!bm) { bm = new Map(); tree.set(p.cat, bm); }
    let mm = bm.get(b); if (!mm) { mm = new Map(); bm.set(b, mm); }
    let arr = mm.get(m); if (!arr) { arr = []; mm.set(m, arr); }
    arr.push(p);
  }
  const out = new Map<string, CatNode>();
  tree.forEach((bm, cat) => {
    const brands: BrandNode[] = []; let models = 0, variants = 0, units = 0, low = 0;
    bm.forEach((mm, brand) => {
      const ms: ModelGroup[] = []; let v = 0, u = 0, l = 0;
      mm.forEach((arr, name) => { const mu = arr.reduce((a, p) => a + stockTotal(p), 0); ms.push({ name, variants: arr, units: mu }); v += arr.length; u += mu; l += arr.filter(isLow).length; });
      brands.push({ name: brand, slug: slug(brand), models: ms, variants: v, units: u, low: l });
      models += ms.length; variants += v; units += u; low += l;
    });
    brands.sort((a, b) => a.name.localeCompare(b.name));
    out.set(cat, { name: cat, slug: slug(cat), brands, models, variants, units, low });
  });
  return out;
}
export const useCatalog = () => { const products = useStore((s) => s.products); return useMemo(() => buildCatalog(products), [products]); };
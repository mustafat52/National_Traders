'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { slug } from '@/lib/categories';

/** Old link: now a filter on the Products list. */
export default function BrandRedirect() {
  const { cat, brand } = useParams<{ cat: string; brand: string }>(); const router = useRouter(); const products = useStore((s) => s.products);
  useEffect(() => { const c = products.find((p) => slug(p.cat) === cat)?.cat; const b = products.find((p) => slug(p.cat) === cat && slug(p.brand || 'Unbranded') === brand)?.brand; router.replace('/admin/products' + (c ? `?cat=${encodeURIComponent(c)}${b ? `&brand=${encodeURIComponent(b)}` : ''}` : '')); }, [cat, brand, products, router]);
  return null;
}

'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { slug } from '@/lib/categories';

/** Old link: now a filter on the Products list. */
export default function CategoryRedirect() {
  const { cat } = useParams<{ cat: string }>(); const router = useRouter(); const products = useStore((s) => s.products);
  useEffect(() => { const name = products.find((p) => slug(p.cat) === cat)?.cat; router.replace('/admin/products' + (name ? `?cat=${encodeURIComponent(name)}` : '')); }, [cat, products, router]);
  return null;
}

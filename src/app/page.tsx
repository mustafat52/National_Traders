'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
export default function Home() {
  const s = useStore((x) => x.session); const r = useRouter();
  useEffect(() => { r.replace(s ? (s.role === 'admin' ? '/admin' : '/staff') : '/login'); }, [s, r]);
  return null;
}

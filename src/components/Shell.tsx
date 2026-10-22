'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';

/** Renders children only on the client (data lives in browser storage in this demo) and registers the PWA service worker. */
export function Gate({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false);
  useEffect(() => { setOk(true); if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {}); }, []);
  return ok ? <>{children}</> : <div className="p-8 text-sm text-slate-400">Loading…</div>;
}
export function useGuard(role: 'admin' | 'staff') {
  const session = useStore((s) => s.session); const router = useRouter();
  useEffect(() => { if (!session || session.role !== role) router.replace('/login'); }, [session, role, router]);
  return session && session.role === role ? session : null;
}

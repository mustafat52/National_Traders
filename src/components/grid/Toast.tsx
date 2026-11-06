'use client';
import { useEffect } from 'react';
import { create } from 'zustand';

interface T { msg: string; tone: 'ok' | 'bad'; n: number }
const useToast = create<{ t: T | null }>(() => ({ t: null }));
let count = 0;
/** One-line confirmation at the bottom of the screen. */
export const toast = (msg: string, tone: 'ok' | 'bad' = 'ok') => useToast.setState({ t: { msg, tone, n: ++count } });
export function Toaster() {
  const t = useToast((s) => s.t);
  useEffect(() => { if (!t) return; const h = setTimeout(() => useToast.setState({ t: null }), t.tone === 'bad' ? 5000 : 2800); return () => clearTimeout(h); }, [t]);
  if (!t) return null;
  return <div role="status" className={`no-print fixed bottom-12 left-1/2 z-[80] -translate-x-1/2 rounded-md px-4 py-2 text-[13px] font-medium shadow-lg ${t.tone === 'bad' ? 'bg-blush-fg text-white' : 'bg-ink text-white'}`}>{t.msg}</div>;
}

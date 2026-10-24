'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** The billing counter is now the staff home screen. This old address just forwards there. */
export default function BillRedirect() {
  const r = useRouter(); useEffect(() => { r.replace('/staff'); }, [r]);
  return null;
}

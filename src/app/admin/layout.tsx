'use client';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useGuard } from '@/components/Shell';
import { AppFrame } from '@/components/frame/AppFrame';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = useGuard('admin'); const router = useRouter(); const logout = useStore((s) => s.logout);
  const pendingLeaves = useStore((st) => st.leaves.filter((l) => l.status === 'pending').length);
  const openEst = useStore((st) => st.bills.filter((b) => b.kind === 'estimate' && b.status === 'open' && (!b.validUntil || new Date(b.validUntil).getTime() > Date.now())).length);
  const needCarp = useStore((st) => st.bills.filter((b) => b.needsCarpenter && !b.job).length);
  if (!session) return null;
  return <AppFrame badges={{ '/admin/estimates': openEst, '/admin/carpenters': needCarp, '/admin/leaves': pendingLeaves }} onLogout={() => { logout(); router.push('/login'); }}>{children}</AppFrame>;
}

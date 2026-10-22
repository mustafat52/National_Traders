import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Gate } from '@/components/Shell';

export const metadata: Metadata = {
  title: 'National Traders | Business System (Demo)', description: 'Inventory, billing, staff and reports',
  manifest: '/manifest.webmanifest', icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
};
export const viewport: Viewport = { themeColor: '#1F3A5F', width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Gate>{children}</Gate></body></html>;
}

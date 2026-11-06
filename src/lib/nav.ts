import { AlertTriangle, ArrowLeftRight, Boxes, CalendarDays, ClipboardCheck, ClipboardList, FileText, Hammer, LayoutDashboard, PackagePlus, QrCode, Settings, Tags, TrendingUp, Truck, Users, Wallet, Warehouse, type LucideIcon } from 'lucide-react';

export interface NavItem { href: string; title: string; group: string; g: string; icon: LucideIcon; words?: string }
/** Every screen in one place: the sidebar, the F2 search, the `g` shortcuts and the help list all read this. */
export const NAV: NavItem[] = [
  { href: '/admin', title: 'Dashboard', group: '', g: 'd', icon: LayoutDashboard, words: 'home' },
  { href: '/admin/business', title: 'Business', group: 'Sales', g: 'b', icon: TrendingUp, words: 'sales profit' },
  { href: '/admin/estimates', title: 'Estimates', group: 'Sales', g: 'e', icon: ClipboardCheck, words: 'quotation' },
  { href: '/admin/carpenters', title: 'Carpenters', group: 'Sales', g: 'c', icon: Hammer },
  { href: '/admin/products', title: 'Products', group: 'Stock', g: 'p', icon: Boxes, words: 'items catalogue company category' },
  { href: '/admin/prices', title: 'Price List', group: 'Stock', g: 'i', icon: Tags, words: 'rates purchase price selling' },
  { href: '/admin/stock', title: 'Stock Position', group: 'Stock', g: 'o', icon: Warehouse, words: 'quantity godown inventory' },
  { href: '/admin/stockin', title: 'Stock In', group: 'Stock', g: 's', icon: PackagePlus, words: 'incoming delivery purchase receive' },
  { href: '/admin/transfers', title: 'Stock Transfers', group: 'Stock', g: 't', icon: ArrowLeftRight, words: 'move godown' },
  { href: '/admin/stockcount', title: 'Stock Count', group: 'Stock', g: 'u', icon: ClipboardList, words: 'adjust correction physical' },
  { href: '/admin/labels', title: 'Print Labels', group: 'Stock', g: 'q', icon: QrCode, words: 'qr barcode' },
  { href: '/admin/lowstock', title: 'Low Stock', group: 'Stock', g: 'l', icon: AlertTriangle, words: 'reorder' },
  { href: '/admin/vendors', title: 'Vendors & Payables', group: 'Buying', g: 'v', icon: Truck, words: 'supplier' },
  { href: '/admin/staff', title: 'Staff & Attendance', group: 'Team and reports', g: 'f', icon: Users },
  { href: '/admin/leaves', title: 'Leave Requests', group: 'Team and reports', g: 'k', icon: CalendarDays },
  { href: '/admin/payroll', title: 'Salaries & Payroll', group: 'Team and reports', g: 'y', icon: Wallet, words: 'salary' },
  { href: '/admin/reports', title: 'Reports', group: 'Team and reports', g: 'r', icon: FileText },
  { href: '/admin/settings', title: 'Settings', group: 'Settings', g: 'x', icon: Settings, words: 'godown places' },
];
export const navByG = (g: string) => NAV.find((n) => n.g === g);

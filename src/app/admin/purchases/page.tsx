import { redirect } from 'next/navigation';
/** Purchases were merged into Stock In (vendor bill) and Vendors (bills and payments). Old links land on Vendors. */
export default function Purchases() { redirect('/admin/vendors'); }
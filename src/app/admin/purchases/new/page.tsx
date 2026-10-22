import { redirect } from 'next/navigation';
/** A new purchase is now a Stock In "From a vendor". */
export default function NewPurchase() { redirect('/admin/stockin'); }
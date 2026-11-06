'use client';
import { QRCodeSVG } from 'qrcode.react';
import { LABEL, mrpLine } from '@/lib/label';

/**
 * One product label: QR code, the product code under it, then the MRP. Sized in real millimetres (see LABEL),
 * so the preview on screen is exactly what prints. `scale` only enlarges the preview on screen.
 */
export function LabelCard({ code, mrp, scale = 1, border = false }: { code: string; mrp?: number; scale?: number; border?: boolean }) {
  const qr = LABEL.h - 12; const font = Math.max(2.6, Math.min(3.6, LABEL.h / 9));
  return (
    <div style={{ zoom: scale }}>
      <div className="flex flex-col items-center justify-center bg-white text-black" style={{ width: `${LABEL.w}mm`, height: `${LABEL.h}mm`, gap: '0.8mm', padding: '1.2mm', boxSizing: 'border-box', border: border ? '0.2mm solid #9a9a9a' : 'none', overflow: 'hidden' }}>
        {code
          ? <QRCodeSVG value={code} size={128} level="M" marginSize={0} style={{ width: `${qr}mm`, height: `${qr}mm` }} />
          : <div style={{ width: `${qr}mm`, height: `${qr}mm`, border: '0.2mm dashed #bbb', fontSize: '2.6mm' }} className="flex items-center justify-center text-center text-neutral-400">No code yet</div>}
        <div className="font-mono font-bold" style={{ fontSize: `${font}mm`, lineHeight: 1 }}>{code || '—'}</div>
        <div className="font-semibold" style={{ fontSize: `${font}mm`, lineHeight: 1 }}>{mrpLine(mrp)}</div>
      </div>
    </div>
  );
}
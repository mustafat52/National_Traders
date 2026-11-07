'use client';
import { QRCodeSVG } from 'qrcode.react';
import { DEFAULT_CONTENT, DEFAULT_SIZES, mrpLine } from '@/lib/label';
import type { LabelContent, LabelSize } from '@/lib/types';
import { useStore } from '@/lib/store';

/** The sticker size in use: the owner's choice from Settings, or the first standard size. */
export function useLabelSizes() {
  const list = useStore((s) => s.settings.labelSizes); const id = useStore((s) => s.settings.labelSizeId);
  const sizes = list && list.length ? list : DEFAULT_SIZES; const size = sizes.find((x) => x.id === id) ?? sizes[0];
  return { sizes, size };
}

/**
 * One sticker, drawn in real millimetres so the preview on screen is what prints. `content` says which parts to show (QR, code, name, MRP);
 * the QR and the text are sized from the sticker size. `scale` only enlarges the preview on screen.
 */
export function LabelCard({ code, name, desc, mrp, content = DEFAULT_CONTENT, size, scale = 1, border = false }: { code: string; name?: string; desc?: string; mrp?: number; content?: LabelContent; size: LabelSize; scale?: number; border?: boolean }) {
  const { w, h } = size; const pad = Math.max(0.8, Math.min(1.6, Math.min(w, h) / 22)); const gap = 0.7;
  const f = Math.max(2.2, Math.min(h / 8.5, w / 14));                      // base text size
  const showQr = content.qr && !!code;
  const lines = (content.name ? 1 : 0) + (content.desc ? 1 : 0) + (content.code ? 1 : 0) + (content.mrp ? 1 : 0);
  const nameF = f * (showQr ? 0.85 : 1.15), codeF = showQr ? f : f * 1.3, mrpF = showQr ? f : f * 1.3;
  const descF = f * 0.75; const descRows = showQr ? 2 : 3;
  const textH = (content.desc ? descF * 1.12 * descRows : 0) + (content.name ? nameF * 1.15 * (showQr ? 1 : 2) : 0) + (content.code ? codeF * 1.1 : 0) + (content.mrp ? mrpF * 1.1 : 0) + Math.max(0, lines - 1) * gap;
  const innerW = w - 2 * pad, innerH = h - 2 * pad;
  const stackQr = Math.min(innerW, innerH - textH - (lines ? gap : 0));
  const side = showQr && lines > 0 && w >= h * 1.3 && stackQr < 0.5 * Math.min(w, h);   // too cramped on top: put the QR on the left
  const fit = (v: number) => Math.max(5, Math.min(v, innerW, innerH));
  const qr = !showQr ? 0 : side ? fit(Math.min(innerH, innerW * 0.46)) : fit(lines ? stackQr : Math.min(innerW, innerH));
  const qrMm = showQr && size.qr ? fit(size.qr) : qr;
  const text = (
    <div className="flex min-w-0 flex-col items-center justify-center text-center" style={{ gap: `${gap}mm`, flex: side ? 1 : undefined }}>
      {content.name && <div className="font-semibold" style={{ fontSize: `${nameF}mm`, lineHeight: 1.12, display: '-webkit-box', WebkitLineClamp: side ? 3 : showQr ? 1 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: '100%', wordBreak: 'break-word' }}>{name || 'Item name'}</div>}
      {content.desc && <div style={{ fontSize: `${descF}mm`, lineHeight: 1.12, display: '-webkit-box', WebkitLineClamp: side ? 3 : descRows, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: '100%', wordBreak: 'break-word' }}>{desc || 'Item description'}</div>}
      {content.code && <div className="font-mono font-bold" style={{ fontSize: `${codeF}mm`, lineHeight: 1.05 }}>{code || '—'}</div>}
      {content.mrp && <div className="font-semibold" style={{ fontSize: `${mrpF}mm`, lineHeight: 1.05 }}>{mrpLine(mrp)}</div>}
    </div>);
  const qrEl = content.qr ? (code
    ? <QRCodeSVG value={code} size={128} level="M" marginSize={0} style={{ width: `${qrMm}mm`, height: `${qrMm}mm`, flex: 'none' }} />
    : <div className="flex items-center justify-center text-center text-neutral-400" style={{ width: `${qrMm || 10}mm`, height: `${qrMm || 10}mm`, border: '0.2mm dashed #bbb', fontSize: '2.4mm', flex: 'none' }}>No code</div>) : null;
  return (
    <div style={{ zoom: scale }}>
      <div className={`flex items-center justify-center bg-white text-black ${side ? 'flex-row' : 'flex-col'}`} style={{ width: `${w}mm`, height: `${h}mm`, gap: `${gap + 0.3}mm`, padding: `${pad}mm`, boxSizing: 'border-box', border: border ? '0.2mm solid #9a9a9a' : 'none', overflow: 'hidden' }}>
        {qrEl}{lines > 0 && text}
      </div>
    </div>
  );
}
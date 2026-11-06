'use client';
import { useKeys, type KeyAction } from '@/lib/hotkeys';

/** Bottom bar: the keys that work on this screen right now, then the global ones. Click any item to run it. */
export function KeyBar({ globals, pending }: { globals: KeyAction[]; pending: boolean }) {
  const layers = useKeys((s) => s.layers);
  const screen: KeyAction[] = []; for (let i = layers.length - 1; i >= 0; i--) { screen.push(...layers[i].actions); if (layers[i].modal) break; }
  const seen = new Set<string>(); const chip = (a: KeyAction) => { if (a.hidden || !a.label || seen.has(a.key)) return null; seen.add(a.key); return (
    <button key={a.key} onClick={a.run} className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded px-1.5 py-0.5 text-[12px] hover:bg-white/10"><kbd className="rounded bg-white/15 px-1 text-[10.5px] font-semibold text-gold-light">{a.key}</kbd><span className="text-white/80">{a.label}</span></button>); };
  const modal = layers.length > 0 && layers[layers.length - 1].modal;
  return (
    <div className="no-print fixed bottom-0 left-0 right-0 z-40 flex items-center gap-1 overflow-x-auto bg-black px-3 py-1.5 md:left-64 no-scrollbar" role="toolbar" aria-label="Keyboard shortcuts">
      {pending && <span className="mr-2 rounded bg-gold-light px-2 py-0.5 text-[12px] font-semibold text-black">g… press a letter</span>}
      {screen.map(chip)}
      {!modal && <><span className="mx-1 h-4 w-px bg-white/20" />{globals.map(chip)}</>}
    </div>
  );
}

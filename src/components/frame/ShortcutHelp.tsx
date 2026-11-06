'use client';
import { useKeys, type KeyAction } from '@/lib/hotkeys';
import { NAV } from '@/lib/nav';
import { Dialog } from '@/components/grid/Dialog';

const GENERIC: [string, string][] = [['↑ ↓', 'Move between rows'], ['Enter', 'Open the row, or go to the next field in a form'], ['Esc', 'Close or go back'], ['Ctrl+S', 'Save'], ['Ctrl+Enter', 'Save and add another'], ['/', 'Go to the search box'], ['Ctrl+E', 'Export the list']];
export function ShortcutHelp({ globals, onClose }: { globals: KeyAction[]; onClose: () => void }) {
  const layers = useKeys((s) => s.layers.filter((l) => !l.actions.some((a) => a.key === 'Esc' && a.label === 'Close')));
  const screen = layers.flatMap((l) => l.actions).filter((a) => a.label && !a.hidden);
  const row = (k: string, l: string) => <div key={k + l} className="flex items-center gap-3 py-0.5"><kbd className="w-24 shrink-0 rounded border border-line bg-paper px-1.5 py-0.5 text-center text-[11.5px] font-semibold">{k}</kbd><span className="text-[13px]">{l}</span></div>;
  return (
    <Dialog title="Keyboard shortcuts" onClose={onClose} width="max-w-3xl">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-steel">On this screen</h3>
          {screen.length ? screen.map((a) => row(a.key, a.label)) : <p className="text-[13px] text-steel">No special keys here.</p>}
          <h3 className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wide text-steel">Everywhere</h3>
          {globals.filter((a) => a.label).map((a) => row(a.key, a.label))}
          {GENERIC.map(([k, l]) => row(k, l))}
          <p className="mt-3 text-[12px] text-steel">On a laptop the F keys may need the Fn key held down (Fn + F2). Every action also has a button on screen.</p>
        </div>
        <div>
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-steel">Go to a screen: press g, then</h3>
          <div className="columns-2 gap-4">{NAV.map((n) => <div key={n.href} className="flex items-center gap-2 py-0.5 text-[13px]"><kbd className="w-6 rounded border border-line bg-paper text-center text-[11.5px] font-semibold uppercase">{n.g}</kbd>{n.title}</div>)}</div>
        </div>
      </div>
    </Dialog>
  );
}

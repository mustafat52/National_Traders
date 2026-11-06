'use client';
import { useEffect, useRef } from 'react';
import { create } from 'zustand';

/** One keyboard action. `key` looks like "F9", "Ctrl+S", "Esc", "N", "/", "Ctrl+Enter". */
export interface KeyAction { key: string; label: string; run: () => void; hidden?: boolean; typing?: boolean }
interface Layer { id: number; actions: KeyAction[]; modal: boolean }
interface KeyState { layers: Layer[]; help: boolean; palette: boolean }
export const useKeys = create<KeyState>(() => ({ layers: [], help: false, palette: false }));
let seq = 0;

/** Is the user typing in a text box right now? Letter shortcuts must stay quiet then. */
export function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null; if (!el || !el.tagName) return false;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  if (el.tagName === 'INPUT') return !['checkbox', 'radio', 'button', 'submit'].includes((el as HTMLInputElement).type);
  return el.isContentEditable;
}

const NAMES: Record<string, string> = { Esc: 'Escape', Up: 'ArrowUp', Down: 'ArrowDown', PgUp: 'PageUp', PgDn: 'PageDown', Del: 'Delete' };
export function matches(e: KeyboardEvent, spec: string): boolean {
  const parts = spec.split('+'); const k = parts.pop() ?? '';
  if (parts.includes('Ctrl') !== (e.ctrlKey || e.metaKey)) return false;
  if (parts.includes('Shift') !== e.shiftKey) return false;
  if (e.altKey) return false;
  const want = NAMES[k] ?? k;
  return e.key.length === 1 ? e.key.toLowerCase() === want.toLowerCase() : e.key === want;
}
const allowedWhileTyping = (a: KeyAction) => !!a.typing || a.key === 'Esc' || a.key.startsWith('Ctrl+') || /^F\d+$/.test(a.key);

/** Runs the first matching action: topmost screen layer first, then the global ones. A modal layer blocks everything under it. */
export function handleKey(e: KeyboardEvent, globals: KeyAction[]): boolean {
  const typing = isTyping(e.target);
  const { layers } = useKeys.getState();
  const order: KeyAction[][] = []; let blocked = false;
  for (let i = layers.length - 1; i >= 0; i--) { order.push(layers[i].actions); if (layers[i].modal) { blocked = true; break; } }
  if (!blocked) order.push(globals);
  for (const list of order) for (const a of list) {
    if (!matches(e, a.key)) continue;
    if (typing && !allowedWhileTyping(a)) continue;
    e.preventDefault(); a.run(); return true;
  }
  return false;
}

/** Register this screen's keys while it is open. A dialog passes `modal: true` so its keys win and the page below goes quiet. */
export function useScreenKeys(actions: KeyAction[], modal = false) {
  const latest = useRef(actions); latest.current = actions;
  const sig = actions.map((a) => `${a.key}|${a.label}|${a.hidden ? 1 : 0}|${a.typing ? 1 : 0}`).join(',');
  useEffect(() => {
    const id = ++seq;
    const wrapped = latest.current.map((a, i) => ({ ...a, run: () => latest.current[i]?.run() }));
    useKeys.setState((s) => ({ layers: [...s.layers, { id, actions: wrapped, modal }] }));
    return () => useKeys.setState((s) => ({ layers: s.layers.filter((l) => l.id !== id) }));
  }, [sig, modal]);
}

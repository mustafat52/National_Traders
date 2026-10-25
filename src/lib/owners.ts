/** The two owners who share the owner panel. Add or rename people here. */
export interface Owner { key: string; first: string; full: string; initial: string; }
export const OWNERS: Owner[] = [
  { key: 'M', first: 'Murtuza', full: 'Murtuza Bhai Bandeali', initial: 'M' },
  { key: 'B', first: 'Burhanuddin', full: 'Burhanuddin Bhai Bandeali', initial: 'B' },
];
export const ownerOf = (key?: string): Owner => OWNERS.find((o) => o.key === key) ?? OWNERS[0];
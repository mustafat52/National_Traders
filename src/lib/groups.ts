/** The client's real category list (spellings exactly as supplied) and the code prefix for each. */
export const GROUPS: Record<string, string[]> = {
  'ACRYLIC PRODUCTS': [], 'ADHESIVES': ['FEVICOL', 'LOCTITE', 'SILICON'], 'BATHROOM ACCESORIES': ['GLASS SHELF', 'SOAP DISPENCER'], 'BEEDING': [], 'BLOCK BOARD': [], 'CHANNELS & PATTI': [], 'CHOWKHAT': [], 'DOORS': [],
  'FIBRE SHEET & NALI SHEET': [], 'GENERAL': ['LADDER', 'TAPE'], 'GLASS HARDWARE': ['F BRACKET'], 'HAND TOOLS': [],
  'HARDWARE': ['ALDROP', 'BOX HINGES', 'BRACKETS AND L ANGLES', 'CONCEALED HANDLE', 'CURTAIN BRACKET', 'CURTAIN BRACKET SUPPORT', 'DOOR CLOSER', 'DOOR HANDLE', 'DOOR KIT', 'DOOR STOPPER', 'FOLDING HANDLE', 'HINGES', 'HOOKS', 'JALI BRACKET', 'KEY STAND', 'KHUNTI', 'KNOB', 'MAIN DOOR HANDLE', 'SCREW', 'SOFALEG', 'TELESCOPE CHANNEL', 'TOWERBOLT', 'WARDROBE HANDLE', 'WHEEL'],
  'JALI': [], 'LAMINATES': [], 'LOCK': ['DRAWER & CUPBOARD LOCK', 'EUROPA', 'HANDLE LOCK', 'MAIN DOOR LOCKS', 'TUBULAR LOCK'], 'MDF': [], 'NAILS': [], 'PAINT': [], 'PIPE': [], 'PLYWOOD': [], 'POWER TOOLS': [], 'PVC SHEET': [],
  'RAFTER': ['CHARCOLE SHEET'], 'SANITARY': [], 'WPC': ['WPC CHOWKHAT'], 'WPC DOOR': ['WPC DOOR BROWN', 'WPC DOOR IVORY', 'WPC TEXTURE BROWN', 'WPC TEXTURE TEAK'],
};
export const PREFIX: Record<string, string> = {
  'ACRYLIC PRODUCTS': 'AC', 'ADHESIVES': 'AD', 'BATHROOM ACCESORIES': 'BA', 'BEEDING': 'BE', 'BLOCK BOARD': 'BB', 'CHANNELS & PATTI': 'CP', 'CHOWKHAT': 'CH', 'DOORS': 'DR', 'FIBRE SHEET & NALI SHEET': 'FS', 'GENERAL': 'GN',
  'GLASS HARDWARE': 'GH', 'HAND TOOLS': 'HT', 'HARDWARE': 'HW', 'JALI': 'JL', 'LAMINATES': 'LM', 'LOCK': 'LK', 'MDF': 'MD', 'NAILS': 'NL', 'PAINT': 'PT', 'PIPE': 'PP', 'PLYWOOD': 'PW', 'POWER TOOLS': 'PO', 'PVC SHEET': 'PV',
  'RAFTER': 'RF', 'SANITARY': 'SN', 'WPC': 'WP', 'WPC DOOR': 'WD',
};
/** Next product code for a category: 2-letter prefix and a running 5-digit number, e.g. HW-00001. Numbers are never reused. */
export function nextCode(cat: string, existing: string[]): string {
  const prefix = PREFIX[cat] ?? (cat.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'XX');
  let max = 0; const re = new RegExp(`^${prefix}-(\\d+)$`);
  for (const c of existing) { const m = c.match(re); if (m) max = Math.max(max, +m[1]); }
  return `${prefix}-${String(max + 1).padStart(5, '0')}`;
}
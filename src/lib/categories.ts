/** Emoji, grouping and URL slugs for the 60 product categories. */
export const CATEGORY_EMOJI: Record<string, string> = {
  'Modular Switches': '🔘', 'Sockets & Plugs': '🔌', 'Wires & Cables': '➰', 'MCB & Distribution': '🎛️', 'LED Lighting': '💡', 'Ceiling Fans': '🌀', 'Conduit Pipes': '〰️', 'Extension Boards': '⚡',
  'PVC Pipes': '🚰', 'CPVC Fittings': '🧩', 'GI Fittings': '🔗', 'Water Tanks': '🛢️', 'Taps & Faucets': '💧', 'Showers': '🚿', 'Sanitaryware': '🚽', 'Pumps & Motors': '🌊',
  'Interior Paints': '🎨', 'Exterior Paints': '🏠', 'Primers & Putty': '🧱', 'Enamels & Thinners': '🧪', 'Paint Brushes': '🖌️', 'Rollers & Trays': '🧻', 'Wood Polish': '✨', 'Waterproofing': '☔',
  'Nuts & Bolts': '🔩', 'Screws': '📍', 'Nails & Staples': '📌', 'Anchors & Rawl Plugs': '⚓', 'Washers & Rivets': '⭕', 'Chains & Hooks': '⛓️',
  'Hinges': '📖', 'Door Handles': '🗝️', 'Locks & Padlocks': '🔒', 'Door Closers': '🚪', 'Drawer Channels': '🗃️', 'Cabinet Fittings': '🗄️',
  'Hand Tools': '🔨', 'Spanners & Wrenches': '🛠️', 'Pliers & Cutters': '✂️', 'Measuring Tapes': '📏', 'Drill Machines': '⛏️', 'Grinders': '⚙️', 'Drill Bits': '🎯', 'Cutting Discs': '💿',
  'Sandpaper': '📜', 'Welding Supplies': '🔥', 'Adhesives': '🧴', 'Sealants': '💦',
  'Tiles': '🔳', 'Tile Adhesive': '🏗️', 'Plywood': '🌲', 'Laminates': '📑',
  'Safety Gear': '⛑️', 'Gloves': '🧤', 'Ladders': '🧗', 'Garden Tools': '🌱', 'Cleaning Supplies': '🧹', 'Hoses & Sprayers': '🧯', 'Tarpaulin & Sheets': '⛺', 'Batteries & Torches': '🔦',
};
export const emojiFor = (c: string) => CATEGORY_EMOJI[c] ?? '📦';

export const SECTIONS: { title: string; cats: string[] }[] = [
  { title: 'Electrical', cats: ['Modular Switches', 'Sockets & Plugs', 'Wires & Cables', 'MCB & Distribution', 'LED Lighting', 'Ceiling Fans', 'Conduit Pipes', 'Extension Boards'] },
  { title: 'Plumbing and water', cats: ['PVC Pipes', 'CPVC Fittings', 'GI Fittings', 'Water Tanks', 'Taps & Faucets', 'Showers', 'Sanitaryware', 'Pumps & Motors'] },
  { title: 'Paints and coatings', cats: ['Interior Paints', 'Exterior Paints', 'Primers & Putty', 'Enamels & Thinners', 'Paint Brushes', 'Rollers & Trays', 'Wood Polish', 'Waterproofing'] },
  { title: 'Fasteners', cats: ['Nuts & Bolts', 'Screws', 'Nails & Staples', 'Anchors & Rawl Plugs', 'Washers & Rivets', 'Chains & Hooks'] },
  { title: 'Doors and cabinets', cats: ['Hinges', 'Door Handles', 'Locks & Padlocks', 'Door Closers', 'Drawer Channels', 'Cabinet Fittings'] },
  { title: 'Tools', cats: ['Hand Tools', 'Spanners & Wrenches', 'Pliers & Cutters', 'Measuring Tapes', 'Drill Machines', 'Grinders', 'Drill Bits', 'Cutting Discs'] },
  { title: 'Workshop supplies', cats: ['Sandpaper', 'Welding Supplies', 'Adhesives', 'Sealants'] },
  { title: 'Building materials', cats: ['Tiles', 'Tile Adhesive', 'Plywood', 'Laminates'] },
  { title: 'Safety, garden and general', cats: ['Safety Gear', 'Gloves', 'Ladders', 'Garden Tools', 'Cleaning Supplies', 'Hoses & Sprayers', 'Tarpaulin & Sheets', 'Batteries & Torches'] },
];
/** Soft paint-chip tints, cycled so neighbouring tiles differ. */
export const TINTS = [
  { bg: '#F3E7C6', fg: '#5B430E' }, { bg: '#F8D9B0', fg: '#86440A' }, { bg: '#E1E7EE', fg: '#33506B' },
  { bg: '#E8E3EC', fg: '#574767' }, { bg: '#F6DDD7', fg: '#9A3524' }, { bg: '#EFE6CF', fg: '#6B5314' },
];
export const slug = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
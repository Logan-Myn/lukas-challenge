// Minimal line icons drawn for the recreated Blender / Claude chrome.
const svg = (d, size = 18, extra = '') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;

export const icon = {
  chevronDown: svg('<path d="M6 9l6 6 6-6"/>', 12),
  chevronRight: svg('<path d="M9 6l6 6-6 6"/>', 12),
  eye: svg('<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/>', 15),
  camera: svg('<path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.4"/>', 15),
  cube: svg('<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 12l9-5M12 12v10M12 12L3 7"/>', 15),
  light: svg('<circle cx="12" cy="10" r="5"/><path d="M9 17h6M10 21h4"/>', 15),
  collection: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/>', 15),
  select: svg('<rect x="4" y="4" width="16" height="16" rx="1" stroke-dasharray="3 3"/><path d="M10 10l8 3-3.5 1.5L13 18z" fill="currentColor"/>', 20),
  cursor: svg('<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>', 20),
  move: svg('<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>', 20),
  rotate: svg('<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v4h-4"/>', 20),
  scale: svg('<rect x="4" y="10" width="10" height="10"/><path d="M10 4h10v10M14 10l6-6"/>', 20),
  annotate: svg('<path d="M4 20l4-1 11-11-3-3L5 16z"/>', 20),
  measure: svg('<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>', 20),
  addCube: svg('<path d="M12 4l7 4v8l-7 4-7-4V8z"/><path d="M19 3v4M17 5h4"/>', 20),
  zoom: svg('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5M11 8v6M8 11h6"/>', 18),
  hand: svg('<path d="M8 13V6a1.5 1.5 0 0 1 3 0v5M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 7-6 7s-5-2-7-6l-1-2a1.5 1.5 0 0 1 2.6-1.4L8 13"/>', 18),
  grid: svg('<path d="M4 4h16v16H4zM4 12h16M12 4v16"/>', 18),
  send: svg('<path d="M12 19V5M5 12l7-7 7 7"/>', 20, 'stroke-width="2.4"'),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 18),
  plug: svg('<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/>', 16),
  check: svg('<path d="M5 12l5 5L20 7"/>', 14, 'stroke-width="2.4"'),
  play: svg('<path d="M7 5l12 7-12 7z" fill="currentColor"/>', 13),
};

export const shadingIcon = kind => {
  const fills = {
    wire: '<circle cx="12" cy="12" r="8" fill="none"/><ellipse cx="12" cy="12" rx="8" ry="3" fill="none"/><path d="M12 4v16"/>',
    solid: '<circle cx="12" cy="12" r="8" fill="currentColor"/>',
    material: '<circle cx="12" cy="12" r="8" fill="none"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',
    rendered: '<circle cx="12" cy="12" r="8" fill="none"/><circle cx="9" cy="9" r="3" fill="currentColor"/>',
  };
  return svg(fills[kind], 16, 'stroke-width="1.6"');
};

// Co-located window metadata — the ONLY place this window declares itself.
// `npm run window:sync` reads this file and wires the window into the central
// manifest + registry automatically. No central file is hand-edited.
//
// Code in 3D is a DISPLAY SINK, not a file opener. You spawn it, then drag a
// wire from any other window into it (the canvas's existing link mechanic) and
// it renders that window's live contents as GPU-instanced 3D text via glyph3d
// (the same WebGPU/TSL stack behind glyph3d.dev). The wire IS the "open in 3D".
export const windowMeta = {
  kind: 'code3d',
  label: 'Code in 3D',
  componentName: 'Code3dWindow',
  componentPath: 'src/components/windows/code3d/index.jsx',
  defaultSize: { w: 680, h: 540 },
  launcher: { show: true, order: 55, icon: 'Code', label: 'Code in 3D', hint: 'wire a window in → 3D' },
  lab: { title: 'Code in 3D' },
};

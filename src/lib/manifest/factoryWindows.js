// Factory-registered window manifests. `npm run window:sync` and
// `npm run window:scaffold` insert NEW windows into this file (above the
// sync anchor) so adding a window never grows a hand-curated file. When this
// file approaches its size budget, graduate stable entries into a category
// file under src/lib/manifest/ — the composed WINDOW_MANIFESTS is order-safe.
// Pure data: no logic lives here.

export const FACTORY_WINDOW_MANIFESTS = [
  {
    kind: 'helloFactory',
    canvasType: 'helloFactory',
    label: 'Hello Factory',
    componentName: 'HelloFactoryWindow',
    componentPath: 'src/components/windows/helloFactory/index.jsx',
    defaultSize: { w: 440, h: 300 },
    lab: {"title":"Hello Factory","props":{"note":"This window was added by creating one folder and running window:sync."}},
  },
  {
    kind: 'code3d',
    canvasType: 'code3d',
    label: 'Code in 3D',
    componentName: 'Code3dWindow',
    componentPath: 'src/components/windows/code3d/index.jsx',
    defaultSize: { w: 680, h: 540 },
    lab: {"title":"Code in 3D"},
    launcher: {"show":true,"order":55,"icon":"Code","label":"Code in 3D","hint":"wire a window in → 3D"},
  },
  // window:sync inserts new windows above this line — do not remove.
];

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
    moduleMenu: { show: false, status: 'coming-soon' },
    lab: {"title":"Hello Factory","props":{"note":"This window was added by creating one folder and running window:sync."}},
  },
  {
    kind: 'policyDashboard',
    canvasType: 'policyDashboard',
    label: 'policy-dashboard',
    componentName: 'PolicyDashboardWindow',
    componentPath: 'src/components/PolicyDashboardWindow.jsx',
    defaultSize: { w: 520, h: 360 },
    moduleMenu: { show: false, status: 'coming-soon' },
    lab: { title: 'policy-dashboard' },
  },
  {
    kind: 'governance',
    canvasType: 'governance',
    label: 'Governance',
    componentName: 'GovernanceWindow',
    componentPath: 'src/components/GovernanceWindow.jsx',
    defaultSize: { w: 900, h: 600 },
    moduleMenu: { show: false, status: 'coming-soon' },
    lab: { title: 'Governance' },
  },
  // window:sync inserts new windows above this line — do not remove.
];

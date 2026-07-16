// Factory-registered window manifests. `npm run window:sync` and
// `npm run window:scaffold` insert NEW windows into this file (above the
// sync anchor) so adding a window never grows a hand-curated file. When this
// file approaches its size budget, graduate stable entries into a category
// file under src/lib/manifest/ — the composed WINDOW_MANIFESTS is order-safe.
// Pure data: no logic lives here.

export const FACTORY_WINDOW_MANIFESTS = [
  {
    kind: 'marketplace',
    canvasType: 'marketplace',
    label: 'Marketplace',
    componentName: 'MarketplaceWindow',
    componentPath: 'src/components/MarketplaceWindow.jsx',
    defaultSize: { w: 720, h: 520 },
    moduleMenu: { show: true, order: 5, icon: 'ShoppingBag', label: 'Marketplace', hint: 'Toggle which windows appear on your canvas' },
  },
  {
    kind: 'registry',
    canvasType: 'registry',
    label: 'Agent Registry',
    componentName: 'RegistryWindow',
    componentPath: 'src/components/RegistryWindow.jsx',
    defaultSize: { w: 800, h: 560 },
    moduleMenu: { show: true, order: 10, icon: 'Plug', label: 'Agent Registry', hint: 'Browse, install, publish agents' },
  },
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
  {
    kind: 'reliability',
    canvasType: 'reliability',
    label: 'Reliability',
    componentName: 'ReliabilityWindow',
    componentPath: 'src/components/ReliabilityWindow.jsx',
    defaultSize: { w: 800, h: 600 },
    moduleMenu: { show: true, order: 15, icon: 'Shield', label: 'Reliability', hint: 'AI Code Reliability Dashboard' },
    lab: { title: 'Reliability' },
  },
  // window:sync inserts new windows above this line — do not remove.
];

// Provider-integration window manifests (`type: 'integration'`). Pure data:
// no logic lives here. Composed into WINDOW_MANIFESTS by
// src/lib/windowManifest.js. See docs/WINDOW_INTEGRATION_SPEC.md.

export const INTEGRATION_WINDOW_MANIFEST_DATA = [
  {
    kind: 'providerConnect',
    type: 'integration',
    canvasType: 'providerConnect',
    label: 'Provider Connect',
    componentName: 'ProviderConnectWindow',
    componentPath: 'src/components/ProviderConnectWindow.jsx',
    defaultSize: { w: 460, h: 540 },
    // Reference integration window. It is fully metadata-driven: the component
    // renders entirely from the `integration` block below, proving a new
    // provider window needs no app-level branching. See docs/WINDOW_INTEGRATION_SPEC.md.
    integration: {
      provider: {
        id: 'demo-provider',
        name: 'Demo Provider',
        category: 'developer-tools',
        docsUrl: 'https://example.com/docs',
      },
      authMode: 'apiKey',
      capabilities: ['read', 'write', 'sync', 'agentTools'],
      embedMode: 'native',
      dangerLevel: 'low',
      defaultPermissions: ['read', 'write'],
      statusLabels: {
        disconnected: 'Not connected to Demo Provider',
        connecting: 'Authorizing...',
        connected: 'Connected to Demo Provider',
      },
    },
    lab: { title: 'Provider Connect' },
  },
  {
    kind: 'linear',
    type: 'integration',
    canvasType: 'linear',
    label: 'Linear',
    componentName: 'ProviderConnectWindow',
    componentPath: 'src/components/ProviderConnectWindow.jsx',
    defaultSize: { w: 460, h: 540 },
    integration: {
      provider: { id: 'linear', name: 'Linear', category: 'productivity', docsUrl: 'https://developers.linear.app/docs' },
      authMode: 'apiKey',
      capabilities: ['read', 'write', 'search', 'agentTools'],
      embedMode: 'native',
      dangerLevel: 'low',
      defaultPermissions: ['read', 'write'],
      statusLabels: { connected: 'Connected to Linear' },
    },
  },
  {
    kind: 'sheets',
    type: 'integration',
    canvasType: 'sheets',
    label: 'Spreadsheet',
    componentName: 'SheetsWindow',
    componentPath: 'src/components/SheetsWindow.jsx',
    defaultSize: { w: 720, h: 520 },
    integration: {
      provider: { id: 'google-sheets', name: 'Google Sheets', category: 'productivity' },
      authMode: 'oauth2',
      capabilities: ['read', 'write'],
      embedMode: 'native',
      dangerLevel: 'low',
      defaultPermissions: ['read', 'write'],
    },
    launcher: { show: true, order: 160, icon: 'List', label: 'Spreadsheet', hint: 'Google Sheets grid' },
  },
];

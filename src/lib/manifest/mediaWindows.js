// Media, preview, and embedded-service window manifests. Pure data: no logic
// lives here. Composed into WINDOW_MANIFESTS by src/lib/windowManifest.js.

export const MEDIA_WINDOW_MANIFESTS = [
  {
    kind: 'genImage',
    canvasType: 'genImage',
    label: 'Image Generator',
    componentName: 'GenImageWindow',
    componentPath: 'src/components/GenImage.jsx',
    defaultSize: { w: 460, h: 380 },
  },
  {
    kind: 'browser',
    canvasType: 'browser',
    label: 'Browser',
    componentName: 'BrowserWindow',
    componentPath: 'src/components/BrowserWindow.jsx',
    defaultSize: { w: 520, h: 420 },
  },
  {
    kind: 'music',
    canvasType: 'music',
    label: 'Music Player',
    componentName: 'MusicWindow',
    componentPath: 'src/components/MusicWindow.jsx',
    defaultSize: { w: 320, h: 380 },
    launcher: { show: true, order: 100, icon: 'Music', label: 'Music Player', hint: 'Lofi & Spotify' },
  },
  {
    kind: 'stream',
    canvasType: 'stream',
    label: 'Stream Viewer',
    componentName: 'StreamWindow',
    componentPath: 'src/components/StreamWindow.jsx',
    defaultSize: { w: 480, h: 320 },
    launcher: { show: true, order: 110, icon: 'Video', label: 'Stream Viewer', hint: 'Twitch & YT' },
  },
  {
    kind: 'htmlPreview',
    canvasType: 'htmlPreview',
    label: 'HTML Preview',
    componentName: 'HtmlPreviewWindow',
    componentPath: 'src/components/HtmlPreviewWindow.jsx',
    defaultSize: { w: 720, h: 520 },
    launcher: { show: true, order: 70, icon: 'Eye', label: 'HTML preview', hint: 'render HTML', props: { title: 'HTML Preview', fileName: 'preview.html' } },
    // Renderable in 3D: the window streams its live DOM into `domSnapshot` (see
    // HtmlPreviewWindow.jsx); fall back to the raw `html` before the first snapshot.
    glyphSource: { fields: ['domSnapshot', 'html'], format: 'text', filename: 'live-dom.html' },
    lab: {
      title: 'HTML Preview',
      props: {
        fileName: 'preview.html',
        html: '<!doctype html><html><body style="font-family: system-ui; padding: 32px;"><h1>Window Lab</h1><p>Preview HTML here before adding it to the canvas.</p></body></html>',
      },
    },
  },
  {
    kind: 'analyticsBoard',
    canvasType: 'analyticsBoard',
    label: 'Analytics Board',
    componentName: 'AnalyticsBoardWindow',
    componentPath: 'src/components/AnalyticsBoardWindow.jsx',
    defaultSize: { w: 420, h: 360 },
  },
  {
    kind: 'mailcow',
    canvasType: 'mailcow',
    label: 'Mailcow',
    componentName: 'MailcowWindow',
    componentPath: 'src/components/MailcowWindow.jsx',
    defaultSize: { w: 720, h: 500 },
  },
  {
    kind: 'n8n',
    canvasType: 'n8n',
    label: 'n8n',
    componentName: 'N8nWindow',
    componentPath: 'src/components/N8nWindow.jsx',
    defaultSize: { w: 900, h: 640 },
    launcher: { show: true, order: 140, icon: 'NewWorkflow', label: 'n8n', hint: 'workflow automation' },
  },
  {
    kind: 'spotify',
    canvasType: 'spotify',
    label: 'Spotify',
    componentName: 'SpotifyWindow',
    componentPath: 'src/components/SpotifyWindow.jsx',
    defaultSize: { w: 400, h: 560 },
    launcher: { show: true, order: 200, icon: 'Music', label: 'Spotify', hint: 'embedded player' },
  },
];

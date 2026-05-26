import fs from 'node:fs';
import path from 'node:path';

import { MindmapData } from './MindmapData';
import { escapeHtml } from './escapeHtml';
import { mindmapToMarkmapTree } from './mindmapToMarkmapTree';

let d3BundleCache: string | null = null;
let markmapViewBundleCache: string | null = null;

function readD3Bundle(): string {
  if (d3BundleCache == null) {
    const d3Root = path.resolve(path.dirname(require.resolve('d3')), '..');
    d3BundleCache = fs.readFileSync(path.join(d3Root, 'dist', 'd3.min.js'), 'utf-8');
  }
  return d3BundleCache;
}

function readMarkmapViewBundle(): string {
  if (markmapViewBundleCache == null) {
    const markmapBrowser = require.resolve('markmap-view/dist/browser/index.js');
    markmapViewBundleCache = fs.readFileSync(markmapBrowser, 'utf-8');
  }
  return markmapViewBundleCache;
}

export function mindmapToMarkmapHtml(
  data: MindmapData,
  title: string,
  filenameMap: Record<string, string> = {}
): string {
  const tree = mindmapToMarkmapTree(data, filenameMap);

  const d3Bundle = readD3Bundle();
  const markmapBundle = readMarkmapViewBundle();

  const treeJson = tree != null ? JSON.stringify(tree) : 'null';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: transparent; color: inherit; }
svg#mindmap { width: 100%; height: 100%; display: block; color: inherit; }
svg#mindmap text { fill: currentColor; }
svg#mindmap path.markmap-link { stroke: currentColor; opacity: 0.6; }
.night_mode svg#mindmap text { fill: #e9e9eb; }
.night_mode svg#mindmap path.markmap-link { stroke: #9ba3af; opacity: 0.8; }
</style>
</head>
<body>
<svg id="mindmap"></svg>
<script>${d3Bundle}</script>
<script>${markmapBundle}</script>
<script>
(function () {
  var data = ${treeJson};
  if (!data) {
    document.body.innerHTML = '<p style="font-family:sans-serif;padding:1rem;color:inherit;opacity:0.7">Empty mind map</p>';
    return;
  }
  var mm = markmap.Markmap.create(document.getElementById('mindmap'), {}, data);
  mm.fit();
})();
</script>
</body>
</html>`;
}

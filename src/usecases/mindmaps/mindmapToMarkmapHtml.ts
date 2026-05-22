import fs from 'node:fs';
import path from 'node:path';

import { MindmapData } from './MindmapData';
import { mindmapToMarkmapTree } from './mindmapToMarkmapTree';

function findPackageRoot(startFile: string): string {
  let dir = path.dirname(startFile);
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error(`Cannot find package root for ${startFile}`);
}

function readD3Bundle(): string {
  const d3Main = require.resolve('d3');
  const d3Root = findPackageRoot(d3Main);
  return fs.readFileSync(path.join(d3Root, 'dist', 'd3.min.js'), 'utf-8');
}

function readMarkmapViewBundle(): string {
  const markmapBrowser = require.resolve('markmap-view/dist/browser/index.js');
  return fs.readFileSync(markmapBrowser, 'utf-8');
}

export function mindmapToMarkmapHtml(data: MindmapData, title: string): string {
  const tree = mindmapToMarkmapTree(data);

  const d3Bundle = readD3Bundle();
  const markmapBundle = readMarkmapViewBundle();

  const treeJson = tree != null ? JSON.stringify(tree) : 'null';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
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

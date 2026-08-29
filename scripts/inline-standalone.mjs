/**
 * Inlines the standalone build into a single .html file.
 * Run via `npm run build:standalone`.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist-standalone';
const OUT = join(DIST, 'costing-pricing-model.html');

const css = readFileSync(join(DIST, 'app.css'), 'utf8');
// A closing tag inside a JS string would end the <script> element early.
const js = readFileSync(join(DIST, 'app.js'), 'utf8').replaceAll('</script', '<\\/script');
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Costing &amp; Pricing Model v${version}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <style>
${css}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
${js}
    </script>
  </body>
</html>
`;

mkdirSync(DIST, { recursive: true });
writeFileSync(OUT, html);
console.log(`Standalone app written to ${OUT} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);

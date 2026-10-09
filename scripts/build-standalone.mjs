import { build } from 'vite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
// Build the entire application, including lazy document parsers, in memory.
const result = await build({
  root,
  base: './',
  build: {
    write: false,
    cssCodeSplit: false,
    assetsInlineLimit: () => true,
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
const outputs = (Array.isArray(result) ? result : [result]).flatMap(r => r.output);
const chunks = outputs.filter(o => o.type === 'chunk');
if (chunks.length !== 1) throw new Error(`Expected one JS bundle, got ${chunks.length}`);
const css = outputs.filter(o => o.type === 'asset' && o.fileName.endsWith('.css')).map(o => o.source).join('\n');
const unexpected = outputs.filter(o => o.type === 'asset' && !/\.(css|html)$/.test(o.fileName));
if (unexpected.length) throw new Error(`Unembedded assets: ${unexpected.map(o => o.fileName)}`);
let html = await readFile(resolve(root, 'index.html'), 'utf8');
const favicon = await readFile(resolve(root, 'public/favicon.svg'));
html = html.replace(/<link[^>]*rel="icon"[^>]*>/g, () => `<link rel="icon" href="data:image/svg+xml;base64,${favicon.toString('base64')}">`)
  .replace(/<script\b[^>]*src="[^"]*"[^>]*><\/script>/g, '')
  .replace('</head>', () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style></head>`)
  .replace('</body>', () => `<script type="module">${chunks[0].code.replace(/<\/script/gi, '<\\/script')}</script></body>`);
await mkdir(resolve(root, '../outputs'), { recursive: true });
const output = resolve(root, '../outputs/Comac-Claw-standalone.html');
await writeFile(output, html);
console.log(`Standalone: ${output} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`);

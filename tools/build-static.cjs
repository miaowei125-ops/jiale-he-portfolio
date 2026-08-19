const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const htmlPath = path.join(root, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

const rootFiles = ['index.html', 'styles.css', 'script.js'];
const assetPattern = /(?:src|href|data-preview-src)="([^"]+)"/g;
const referencedAssets = new Set();

for (const match of html.matchAll(assetPattern)) {
  const reference = match[1];
  if (/^(?:https?:|mailto:|#)/.test(reference)) continue;
  referencedAssets.add(reference);
}

for (const match of css.matchAll(/url\(\s*(['"]?)([^'"\)]+)\1\s*\)/g)) {
  const reference = match[2];
  if (/^(?:https?:|data:|#)/.test(reference)) continue;
  referencedAssets.add(reference);
}

const files = [...new Set([...rootFiles, ...referencedAssets])];
const missing = files.filter((file) => !fs.existsSync(path.join(root, file)));

if (missing.length) {
  console.error(`Build failed. Missing files:\n${missing.map((file) => `- ${file}`).join('\n')}`);
  process.exit(1);
}

fs.rmSync(output, { recursive: true, force: true });

for (const file of files) {
  const source = path.join(root, file);
  const destination = path.join(output, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

fs.writeFileSync(path.join(output, '.nojekyll'), '');

const builtHtml = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
if (/\b(?:src|href|data-preview-src)="\//.test(builtHtml)) {
  console.error('Build failed. Root-absolute paths are incompatible with repository GitHub Pages.');
  process.exit(1);
}

const totalBytes = files.reduce((sum, file) => sum + fs.statSync(path.join(root, file)).size, 0);
console.log(`Static production build complete: ${files.length} files, ${totalBytes} bytes.`);

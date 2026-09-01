/* Inlines the app into one self-contained HTML fragment, for pasting into a
   host that wants a single file (the Claude Artifact preview, an email, a
   USB stick). The real site is the plain files at the repo root — this is
   only a convenience.

   Usage:  node tools/bundle.js  ->  dist/preview.html                       */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const html = read('index.html');
const css = read('styles.css');
const js = read('data.js') + '\n' + read('app.js');

const body = html
  .slice(html.indexOf('<body>') + '<body>'.length, html.indexOf('</body>'))
  .replace(/<script src="[^"]+"><\/script>\s*/g, '')
  .trim();

const out = [
  '<title>Food Poker</title>',
  '<style>',
  css.trim(),
  '</style>',
  body,
  '<script>',
  js.trim(),
  '<' + '/script>',
  ''
].join('\n');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'preview.html'), out);
console.log('dist/preview.html  ' + (out.length / 1024).toFixed(1) + ' KB');

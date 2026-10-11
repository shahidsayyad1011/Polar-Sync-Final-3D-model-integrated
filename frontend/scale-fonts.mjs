import fs from 'node:fs';

const FILE = new URL('./src/index.css', import.meta.url);
const MARK = '/* fonts-scaled-v1 */';
const FACTOR = 1.2;
const MIN_PX = 11;

let css = fs.readFileSync(FILE, 'utf8');
if (css.includes(MARK)) {
  console.log('Already scaled - nothing to do.');
  process.exit(0);
}

let count = 0;
css = css.replace(/font-size:\s*([\d.]+)px/g, (_m, n) => {
  const next = Math.max(MIN_PX, Math.round(parseFloat(n) * FACTOR * 2) / 2);
  count++;
  return `font-size: ${next}px`;
});

fs.writeFileSync(FILE, `${MARK}\n${css}`);
console.log(`Scaled ${count} font-size values.`);
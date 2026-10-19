import { mkdir, cp, copyFile } from 'node:fs/promises';

const out = new URL('../www/', import.meta.url);
await mkdir(out, { recursive: true });
await Promise.all([
  copyFile(new URL('../index.html', import.meta.url), new URL('../www/index.html', import.meta.url)),
  copyFile(new URL('../styles.css', import.meta.url), new URL('../www/styles.css', import.meta.url)),
  copyFile(new URL('../app.js', import.meta.url), new URL('../www/app.js', import.meta.url)),
  cp(new URL('../js/', import.meta.url), new URL('../www/js/'), { recursive: true }),
]);
console.log('EarthMonitor web bundle staged in www/ (HTML, CSS, app runtime, tactical module).');

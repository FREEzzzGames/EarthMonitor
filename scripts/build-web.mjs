import { mkdir, copyFile } from 'node:fs/promises';

await mkdir(new URL('../www/', import.meta.url), { recursive: true });
await Promise.all([
  copyFile(new URL('../index.html', import.meta.url), new URL('../www/index.html', import.meta.url)),
  copyFile(new URL('../styles.css', import.meta.url), new URL('../www/styles.css', import.meta.url)),
  copyFile(new URL('../app.js', import.meta.url), new URL('../www/app.js', import.meta.url)),
]);
console.log('EarthMonitor web bundle staged in www/.');

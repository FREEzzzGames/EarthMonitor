import { mkdir, copyFile } from 'node:fs/promises';

await mkdir(new URL('../www/', import.meta.url), { recursive: true });
await copyFile(new URL('../index.html', import.meta.url), new URL('../www/index.html', import.meta.url));
console.log('EarthMonitor web bundle staged in www/.');

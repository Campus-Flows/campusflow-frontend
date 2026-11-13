import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 4187);
const assets = new Map([
  ['/', ['index.html', 'text/html']],
  ['/index.html', ['index.html', 'text/html']],
  ['/styles.css', ['styles.css', 'text/css']],
  ['/app.js', ['app.js', 'text/javascript']],
  ['/demo-data.js', ['demo-data.js', 'text/javascript']],
  ['/schedule.js', ['schedule.js', 'text/javascript']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
]);

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const asset = assets.get(pathname);
  if (!asset) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  try {
    const content = await readFile(path.join(root, asset[0]));
    response.writeHead(200, { 'Content-Type': `${asset[1]}; charset=utf-8`, 'Cache-Control': 'no-store' });
    response.end(content);
  } catch {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Unable to read the requested file');
  }
});

server.listen(port, '127.0.0.1', () => console.log(`Campus Flow: http://127.0.0.1:${port}/`));
server.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});

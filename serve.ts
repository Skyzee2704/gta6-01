import { createReadStream, realpathSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('./game', import.meta.url)));
const args = process.argv.slice(2);
const flag = args.indexOf('--port');
const requested = flag < 0 ? 8080 : Number(args[flag + 1]);
const port = Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : 8080;
const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream', '.wasm': 'application/wasm',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
};
const inside = (path: string) => path === root || path.startsWith(root + sep);

createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  let pathname: string;
  try {
    pathname = decodeURIComponent((request.url ?? '/').split('?')[0]);
    if (pathname.includes('\0')) throw new Error('invalid path');
  } catch {
    response.writeHead(400).end('Invalid request path');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  let file = resolve(root, '.' + pathname);
  if (!inside(file)) {
    response.writeHead(403).end('Path outside game directory');
    return;
  }
  let size: number;
  try {
    file = realpathSync(file);
    if (!inside(file)) {
      response.writeHead(403).end('Path outside game directory');
      return;
    }
    const info = statSync(file);
    if (!info.isFile()) throw new Error('not a file');
    size = info.size;
  } catch {
    response.writeHead(404).end('File not found');
    return;
  }
  response.writeHead(200, {
    'Content-Type': mime[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': size,
  });
  if (request.method === 'HEAD') { response.end(); return; }
  const stream = createReadStream(file);
  stream.on('error', () => response.destroy());
  stream.pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`SOLMAR is available at http://localhost:${port}`);
});

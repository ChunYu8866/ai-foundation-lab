import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
http.createServer(async (req,res) => {
  try {
    const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let target = path.resolve(root, '.' + relative);
    if (target !== root && !target.startsWith(root + path.sep)) {res.writeHead(403); return res.end();}
    if ((await stat(target)).isDirectory()) target = path.join(target,'index.html');
    const body = await readFile(target);
    res.writeHead(200, {'Content-Type':types[path.extname(target)] || 'application/octet-stream','Cache-Control':'no-cache'});
    res.end(body);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));

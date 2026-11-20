import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createContextClient, verifyAuth } from '@supabase/server/core';

const port = 3000;
const playgroundPage = readFileSync(new URL('./index.html', import.meta.url));

// Serve supabase-js UMD from node_modules (avoid CDN dependency)
const supabaseUmd = readFileSync(
  new URL('../node_modules/@supabase/supabase-js/dist/umd/supabase.js', import.meta.url),
);

function sendJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

createServer(async (request, response) => {
  // ─── Playground page ───
  if (request.method === 'GET' && request.url === '/') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(playgroundPage);
    return;
  }

  // ─── Serve supabase-js SDK locally ───
  if (request.method === 'GET' && request.url === '/supabase.js') {
    response.writeHead(200, {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    });
    response.end(supabaseUmd);
    return;
  }

  // ─── Config endpoint ───
  if (request.method === 'GET' && request.url === '/config') {
    sendJson(response, 200, {
      supabaseUrl: process.env.SUPABASE_PUBLIC_URL,
      anonKey: process.env.ANON_KEY,
    });
    return;
  }

  // ─── Verify authenticated user ───
  if (request.method === 'GET' && request.url === '/api/me') {
    const headers = new Headers();
    for (const name of ['authorization', 'apikey']) {
      const value = request.headers[name];
      if (typeof value === 'string') headers.set(name, value);
    }

    const webRequest = new Request('http://localhost/api/me', { headers });
    const { data: auth, error } = await verifyAuth(webRequest, { auth: 'user' });
    if (error) {
      sendJson(response, error.status, { message: error.message, code: error.code });
      return;
    }

    const supabase = createContextClient({
      auth: { token: auth.token, keyName: auth.keyName },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      sendJson(response, 401, { message: userError.message });
      return;
    }

    sendJson(response, 200, { id: user.id, email: user.email });
    return;
  }

  sendJson(response, 404, { message: 'Not found' });
}).listen(port, '0.0.0.0', () => {
  console.log(`⚡ Playground listening on http://localhost:${port}`);
});

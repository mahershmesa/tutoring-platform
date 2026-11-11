// بوابة تحاكي عنوان Supabase محلياً: /rest/v1 → PostgREST، /auth/v1 → مصادقة مبسّطة، /storage/v1 → روابط وهمية
const http = require('http'); const crypto = require('crypto');
const SECRET = process.env.JWT_SECRET; const PGRST = 3301; const PORT = 3300;
const USERS = {
  'p9647700000001@dalili.app': ['71000000-0000-0000-0000-000000000000', 'T1 Math'],
  'p9647700000002@dalili.app': ['72000000-0000-0000-0000-000000000000', 'T2 Phys'],
  'p9647800000001@dalili.app': ['51000000-0000-0000-0000-000000000000', 'S1'],
  'p9647800000002@dalili.app': ['52000000-0000-0000-0000-000000000000', 'S2'],
};
const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
function sign(payload) { const h = b64({ alg: 'HS256', typ: 'JWT' }), p = b64(payload);
  return `${h}.${p}.${crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url')}`; }
function decode(tok) { try { return JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString()); } catch { return null; } }
function userObj(email) { const [id, name] = USERS[email];
  return { id, aud: 'authenticated', role: 'authenticated', email, user_metadata: { full_name: name }, app_metadata: {}, created_at: new Date().toISOString() }; }
function session(email) { const u = userObj(email); const exp = Math.floor(Date.now() / 1000) + 3600;
  return { access_token: sign({ sub: u.id, role: 'authenticated', email, aud: 'authenticated', exp }), token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'r-' + email, user: u }; }
if (process.argv[2] === 'keys') { console.log(sign({ role: 'anon', exp: 4102444800 })); console.log(sign({ role: 'service_role', exp: 4102444800 })); process.exit(0); }
http.createServer((req, res) => {
  const cors = { 'access-control-allow-origin': req.headers.origin || '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*', 'access-control-allow-credentials': 'true' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => {
    const body = Buffer.concat(chunks); const url = new URL(req.url, 'http://x');
    const json = (code, o) => { res.writeHead(code, { ...cors, 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (url.pathname.startsWith('/rest/v1')) {
      const headers = { ...req.headers, host: 'localhost' }; delete headers['content-length'];
      const p = http.request({ port: PGRST, path: req.url.replace('/rest/v1', '') || '/', method: req.method, headers: { ...headers, 'content-length': body.length } }, (r) => {
        res.writeHead(r.statusCode, { ...r.headers, ...cors }); r.pipe(res); });
      p.on('error', (e) => json(502, { message: String(e) })); return p.end(body);
    }
    if (url.pathname === '/auth/v1/token') {
      const b = JSON.parse(body.toString() || '{}');
      const email = b.email || (b.refresh_token || '').replace(/^r-/, '');
      return USERS[email] ? json(200, session(email)) : json(400, { error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' });
    }
    if (url.pathname === '/auth/v1/user') {
      const c = decode((req.headers.authorization || '').replace('Bearer ', ''));
      return c && c.email && USERS[c.email] ? json(200, userObj(c.email)) : json(401, { msg: 'invalid token' });
    }
    if (url.pathname === '/auth/v1/logout') return json(204, {});
    if (url.pathname.startsWith('/storage/v1/object/sign')) return json(200, { signedURL: '/object/sign/mock?token=x' });
    json(404, { message: 'not mocked: ' + url.pathname });
  });
}).listen(PORT, () => console.log('gateway on', PORT));

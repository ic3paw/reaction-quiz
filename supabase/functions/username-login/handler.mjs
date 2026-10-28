const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const invalid = 'Invalid username or password. Confirm your email before signing in.';
const unavailable = 'Sign-in is temporarily unavailable. Please try again later.';
const reply = (status, body) => new Response(JSON.stringify(body), {status, headers});

// Dependencies are injected so tests never need real accounts or credentials.
export function createLoginHandler({url, serviceKey, publicKey, request = fetch}) {
  return async req => {
    if (req.method === 'OPTIONS') return new Response(null, {status: 204, headers});
    if (req.method !== 'POST') return reply(405, {error: 'Use POST.'});
    if (!url || !serviceKey || !publicKey) return reply(503, {error: unavailable});
    if (!(req.headers.get('content-type') || '').startsWith('application/json')) return reply(415, {error: 'Send JSON.'});
    // Stream with a hard limit, including when Content-Length is absent or false.
    const reader = req.body?.getReader();
    if (!reader) return reply(400, {error: invalid});
    let text = '', size = 0;
    const decoder = new TextDecoder();
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) { await reader.cancel(); return reply(413, {error: 'Request too large.'}); }
        text += decoder.decode(value, {stream: true});
      }
      text += decoder.decode();
      const body = JSON.parse(text);
      const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : '';
      const password = body?.password;
      if (!/^[a-z0-9_]{3,24}$/.test(username) || typeof password !== 'string' || !password.length || password.length > 256) {
        return reply(400, {error: invalid});
      }
      const resolved = await request(`${url}/rest/v1/rpc/resolve_username_for_login`, {
        method: 'POST', headers: {apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({p_username: username}), signal: AbortSignal.timeout(10000),
      });
      if (!resolved.ok) return reply(503, {error: unavailable});
      const identity = await resolved.json();
      if (identity.allowed !== true) return reply(429, {error: 'Too many sign-in attempts. Try again in 15 minutes.'});
      // Unknown and unconfirmed names take the same Auth path and return the same
      // error as a wrong password. Never return a username-to-email lookup.
      const email = identity.email || `${crypto.randomUUID()}@invalid.example`;
      const signedIn = await request(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST', headers: {apikey: publicKey, 'Content-Type': 'application/json'},
        body: JSON.stringify({email, password}), signal: AbortSignal.timeout(10000),
      });
      if (signedIn.status === 429) return reply(429, {error: 'Too many sign-in attempts. Try again later.'});
      if (signedIn.status >= 500) return reply(503, {error: unavailable});
      if (!signedIn.ok || !identity.email) return reply(401, {error: invalid});
      const session = await signedIn.json();
      if (!session.access_token || !session.refresh_token) return reply(503, {error: unavailable});
      return reply(200, {access_token: session.access_token, refresh_token: session.refresh_token});
    } catch (error) {
      // Do not log request bodies, passwords, tokens or resolved email addresses.
      return reply(error instanceof SyntaxError ? 400 : 503, {error: error instanceof SyntaxError ? invalid : unavailable});
    } finally { reader.releaseLock(); }
  };
}

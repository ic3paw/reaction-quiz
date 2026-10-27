const results = [];
window.backendTestResults = {done: false, results};
const assert = (condition, message = 'Assertion failed') => { if (!condition) throw new Error(message); };
async function rejects(fn, pattern) {
  try { await fn(); } catch (error) { assert(pattern.test(error.message), error.message); return; }
  throw new Error('Expected rejection');
}
async function test(name, fn) {
  try { await fn(); results.push({name, passed: true}); }
  catch (error) { results.push({name, passed: false, error: error.message}); }
  document.querySelector('#results').textContent = results.map(r => `${r.passed ? 'PASS' : 'FAIL'} ${r.name}${r.error ? ': ' + r.error : ''}`).join('\n');
}
const config = {url: 'https://example.supabase.co', publishableKey: 'sb_publishable_test'};
function fixture() {
  let authListener, resolveRead;
  const calls = [];
  const api = {
    auth: {
      getSession: async () => ({data: {session: {user: {id: 'user-a', email: 'a@example.test'}}}, error: null}),
      onAuthStateChange(listener) { authListener = listener; },
      signInWithOtp: async options => { calls.push(options); return {error: null}; },
      signOut: async options => { calls.push(options); return {error: null}; },
      stopAutoRefresh() {},
    },
    from(table) { calls.push(table); return {
      select(columns) { calls.push(columns); return this; },
      eq(key, id) { calls.push({key, id}); return this; },
      maybeSingle: () => new Promise(resolve => { resolveRead = resolve; }),
    }; },
    rpc: async (name, args) => { calls.push({name, args}); return {data: [], error: null}; },
  };
  return {api, calls, change: user => authListener('SIGNED_IN', user ? {user} : null), finishRead: data => resolveRead({data, error: null})};
}
const catalog = {reactions: ['aldol'], categories: ['addition', 'mundy-additions'], books: ['all', 'li']};
const payload = {saved: ['aldol'], attempts: [{id: 'aldol', correct: true, at: '2026-10-27T12:00:00Z'}], sessions: [{title: 'Practice', total: 1, correct: 1, seconds: 2, at: '2026-10-27T12:00:00Z'}]};

await test('Empty configuration makes no SDK request', async () => {
  let loads = 0;
  const backend = createQuizBackend({}, async () => { loads++; });
  assert(!backend.configured);
  await rejects(() => backend.connect(), /not connected/);
  assert(loads === 0);
});
await test('Reject secret keys and insecure remote URLs before loading SDK', async () => {
  const load = () => { throw new Error('SDK should not load'); };
  await rejects(() => createQuizBackend({...config, publishableKey: 'sb_secret_bad'}, load).connect(), /never a server secret/);
  await rejects(() => createQuizBackend({...config, publishableKey: `e30.${btoa('{"role":"service_role"}')}.signature`}, load).connect(), /never a server secret/);
  await rejects(() => createQuizBackend({...config, url: 'http://example.com'}, load).connect(), /HTTPS/);
});
await test('Concurrent connections share one client, with PKCE enabled', async () => {
  const f = fixture(); let loads = 0;
  const backend = createQuizBackend(config, async () => { loads++; return (_url, _key, options) => { assert(options.auth.flowType === 'pkce'); return f.api; }; });
  await Promise.all([backend.connect(), backend.connect()]);
  assert(loads === 1 && backend.user.id === 'user-a');
  await backend.sendSignInLink('a@example.test');
  const request = f.calls.at(-1);
  assert(request.email === 'a@example.test' && request.options.emailRedirectTo.endsWith('#account'));
  await backend.signOut();
  assert(backend.user === null && f.calls.at(-1).scope === 'local');
});
await test('Failed connection can retry', async () => {
  let loads = 0; const f = fixture();
  const backend = createQuizBackend(config, async () => { if (++loads === 1) throw new Error('Offline'); return () => f.api; });
  await rejects(() => backend.connect(), /Offline/);
  await backend.connect(); assert(backend.user.id === 'user-a');
});
await test('Account switch rejects an in-flight read', async () => {
  const f = fixture(); const backend = createQuizBackend(config, async () => () => f.api);
  await backend.connect(); const read = backend.readBackup();
  await Promise.resolve(); f.change({id: 'user-b'}); f.finishRead({payload});
  await rejects(() => read, /account changed/);
  assert(f.calls.some(call => call?.key === 'user_id' && call.id === 'user-a'));
});
await test('Account switch rejects an in-flight save response', async () => {
  const f = fixture(); let finish;
  f.api.rpc = () => new Promise(resolve => { finish = resolve; });
  const backend = createQuizBackend(config, async () => () => f.api);
  await backend.connect(); const save = backend.saveBackup(payload, 0);
  await Promise.resolve(); f.change(null); finish({data: [{revision: 1}], error: null});
  await rejects(() => save, /account changed/);
});
await test('Conflicts and signed-out writes are rejected', async () => {
  const f = fixture(); const backend = createQuizBackend(config, async () => () => f.api);
  await backend.connect();
  await rejects(() => backend.saveBackup(payload, 7), /newer cloud backup/);
  assert(f.calls.at(-1).args.p_expected_revision === 7);
  await backend.signOut();
  await rejects(() => backend.saveBackup(payload, 0), /Sign in/);
});
await test('Valid snapshots preserve study data and normalize older preferences', () => {
  const output = validateStudyBackup({schema_version: 1, payload: {...payload, saved: ['aldol', 'aldol', 'unknown'], selectedCategories: ['addition'], categoryVersion: 2, flashcardMode: 'outline', extra: 'discard'}}, catalog);
  assert(output.saved.length === 1 && output.attempts[0].correct && output.sessions[0].total === 1);
  assert(output.selectedCategories.includes('mundy-additions') && output.flashcardMode === 'reaction');
  assert(!('extra' in output));
});
await test('Malformed and future snapshots cannot be restored', async () => {
  for (const snapshot of [
    {schema_version: 2, payload}, {schema_version: 1, payload: {}},
    {schema_version: 1, payload: {...payload, attempts: [{id: 'aldol', correct: 'true', at: 'bad'}]}},
    {schema_version: 1, payload: {...payload, sessions: [{...payload.sessions[0], correct: 2}]}},
    {schema_version: 1, payload: {...payload, flashcardReviews: {aldol: {rating: 'invalid', at: '2026-10-27'}}}},
    {schema_version: 1, payload: {...payload, extra: 'x'.repeat(2000001)}},
  ]) await rejects(() => validateStudyBackup(snapshot, catalog), /invalid or.*unsupported/);
});
await test('PostgreSQL migration: RLS, concurrent revisions, payload checks, cascade', async () => {
  const {PGlite} = await import('https://esm.sh/@electric-sql/pglite@0.3.14');
  // Supply binary assets explicitly: esm.sh rewrites module-relative URLs.
  const assetBase = 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.3.14/dist/';
  const [fsBundle, wasmModule] = await Promise.all([
    fetch(assetBase + 'pglite.data').then(response => response.blob()),
    WebAssembly.compileStreaming(fetch(assetBase + 'pglite.wasm')),
  ]);
  const db = new PGlite({fsBundle, wasmModule});
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');`);
    const migration = await fetch('../supabase/migrations/202610270001_accounts_and_backups.sql').then(response => response.text());
    await db.exec(migration);
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';`);
    const save = revision => db.query('select * from public.save_study_backup($1::jsonb, $2::bigint)', [JSON.stringify(payload), revision]);
    assert((await save(0)).rows[0].revision === 1);
    assert((await save(0)).rows.length === 0, 'Stale create must fail');
    assert((await save(1)).rows[0].revision === 2);
    assert((await save(1)).rows.length === 0, 'Stale update must fail');
    await rejects(() => db.query("select * from public.save_study_backup('{}'::jsonb, 2)"), /check constraint/);
    await db.exec(`set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';`);
    assert((await db.query('select * from public.study_backups')).rows.length === 0, 'Cross-user reads must be empty');
    assert((await save(2)).rows.length === 0, 'RPC must not update another user');
    assert((await db.query('update public.study_backups set revision = 99 returning *')).rows.length === 0, 'Cross-user updates must be empty');
    await rejects(() => db.query('insert into public.study_backups(user_id,payload) values ($1,$2)', ['00000000-0000-0000-0000-000000000001', JSON.stringify(payload)]), /row-level security/);
    await db.exec('reset role; set role anon;');
    await rejects(() => db.query('select * from public.study_backups'), /permission denied/);
    await rejects(() => save(0), /permission denied/);
    await db.exec(`reset role; delete from auth.users where id = '00000000-0000-0000-0000-000000000001';`);
    assert((await db.query('select * from public.study_backups')).rows.length === 0, 'Deleted users must lose backups');
  } finally { await db.close(); }
});
window.backendTestResults.done = true;
document.title = results.every(r => r.passed) ? 'Backend tests passed' : 'Backend tests failed';

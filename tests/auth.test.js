const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');
const source = readFileSync(join(__dirname, '../assets/backend.js'), 'utf8');
const config = {url:'https://example.supabase.co', publishableKey:'sb_publishable_test'};
const password = 'a-long-test-password';
function fixture({recovery = false} = {}) {
  let listener, session = null;
  const calls = [];
  const context = vm.createContext({URL, AbortSignal, location:{href:'https://quiz.example/index.html#account', protocol:'https:'}});
  vm.runInContext('const window = globalThis;', context);
  vm.runInContext(source, context);
  const user = {id:'user-a', email:'private@example.test'};
  const api = {auth:{
    onAuthStateChange(fn) { listener=fn; return {data:{subscription:{unsubscribe(){}}}}; },
    async getSession() {
      if (recovery) { session={user}; listener('PASSWORD_RECOVERY', session); }
      return {data:{session}, error:null};
    },
    async signUp(input) { calls.push({method:'signUp', input}); return {data:{session:null}, error:null}; },
    async setSession(input) { calls.push({method:'setSession', input}); session={user}; listener('SIGNED_IN',session); return {data:{session},error:null}; },
    async signInWithOtp(input) { calls.push({method:'otp',input}); return {error:null}; },
    async resetPasswordForEmail(email,input) { calls.push({method:'reset',email,input}); return {error:null}; },
    async resend(input) { calls.push({method:'resend',input}); return {error:null}; },
    async updateUser(input) { calls.push({method:'update',input}); listener('USER_UPDATED',{user}); return {error:null}; },
    async signOut() { session=null; listener('SIGNED_OUT',null); return {error:null}; },
  }, from(table) { return {select(){return this;}, eq(key,id){calls.push({table,key,id});return this;}, async maybeSingle(){return {data:{username:'chemist'},error:null};}}; },
  async rpc(name,input) {calls.push({method:name,input});return {data:input.p_username,error:null};}};
  const request = async (url, options) => {calls.push({method:'fetch',url,options});return new Response(JSON.stringify({access_token:'access', refresh_token:'refresh'}));};
  const create = (fetcher=request) => context.createQuizBackend(config,async()=>()=>api,fetcher);
  return {calls,api,user,create, change(next) {session=next?{user:next}:null;listener('SIGNED_IN',session);}};
}

test('registration normalizes username, preserves password, and requests email confirmation', async () => {
  const f=fixture(), backend=f.create();
  assert.equal(await backend.signUp(' Chemist_1 ','person@example.test',password),false);
  const input=f.calls[0].input;
  assert.equal(input.options.data.username,'chemist_1');
  assert.equal(input.password,password);
  assert.equal(input.options.emailRedirectTo,'https://quiz.example/index.html#account');
  await assert.rejects(()=>backend.signUp('bad name','x@y.test',password),/3–24/);
  await assert.rejects(()=>backend.signUp('valid','x@y.test','short'),/12/);
  assert.equal(f.calls.length,1);
});

test('username sign-in sends no email lookup to browser and installs session through Auth SDK', async () => {
  const f=fixture(), backend=f.create();
  await backend.signIn(' CHEMIST ',password);
  const request=f.calls.find(c=>c.method==='fetch');
  assert.equal(request.url,'https://example.supabase.co/functions/v1/username-login');
  assert.deepEqual(JSON.parse(request.options.body),{username:'chemist',password});
  assert.equal(request.options.credentials,'omit');
  assert.equal(backend.user.id,'user-a');
  assert.equal(f.calls.find(c=>c.method==='setSession').input.refresh_token,'refresh');
  assert.equal((await backend.readProfile()).username,'chemist');
  assert.equal((await backend.claimUsername(' CHEMIST ')).username,'chemist');
});

test('login errors do not install sessions or expose server response details', async () => {
  for (const status of [400,401,429,404,500]) {
    const f=fixture(), backend=f.create(async()=>new Response('private@example.test',{status}));
    await assert.rejects(()=>backend.signIn('chemist',password),error=>!error.message.includes('private@'));
    assert.equal(backend.user,null);
    assert(!f.calls.some(c=>c.method==='setSession'));
  }
});

test('in-flight sign-in cannot replace a newly switched account', async () => {
  let finish;
  const f=fixture(), backend=f.create(()=>new Promise(resolve=>{finish=resolve;}));
  const login=backend.signIn('chemist',password);
  while (!finish) await new Promise(resolve=>setImmediate(resolve));
  f.change({id:'user-b'});finish(new Response(JSON.stringify({access_token:'a',refresh_token:'r'})));
  await assert.rejects(()=>login,/account changed/);
  assert.equal(backend.user.id,'user-b');
  assert(!f.calls.some(c=>c.method==='setSession'));
});

test('recovery events survive initialization, reset redirect persists, and password update clears recovery', async () => {
  const f=fixture({recovery:true}), backend=f.create();
  await backend.connect();assert.equal(backend.recovering,true);
  await backend.resetPassword(' person@example.test ');
  assert.equal(f.calls.at(-1).input.redirectTo,'https://quiz.example/index.html?recovery=1#account');
  await backend.updatePassword(password);assert.equal(backend.recovering,false);
  assert.equal(f.calls.at(-1).input.password,password);
  await backend.signOut();
  await assert.rejects(()=>backend.updatePassword(password),/Sign in/);
});

test('legacy email links cannot silently create another account; confirmation resend remains supported', async () => {
  const f=fixture(), backend=f.create();
  await backend.sendSignInLink('person@example.test');
  assert.equal(f.calls.at(-1).input.options.shouldCreateUser,false);
  await backend.resendConfirmation('person@example.test');
  assert.equal(f.calls.at(-1).input.type,'signup');
});

async function edgeFixture({email='private@example.test', allowed=true, authStatus=200, lookupStatus=200}={}) {
  const {createLoginHandler}=await import('../supabase/functions/username-login/handler.mjs');
  const calls=[];
  const handler=createLoginHandler({url:config.url,serviceKey:'server-secret',publicKey:'public-key',request:async(url,options)=>{
    calls.push({url,options});
    if (url.includes('/rpc/'))return new Response(JSON.stringify({allowed,email}),{status:lookupStatus});
    return new Response(JSON.stringify({access_token:'access',refresh_token:'refresh',user:{email}}),{status:authStatus});
  }});
  const req=(body={username:' CHEMIST ',password},method='POST')=>new Request('https://quiz.example/functions/v1/username-login',{method,headers:{'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})});
  return {handler,calls,req};
}

test('edge verifies credentials with public Auth key, then returns only session tokens', async () => {
  const f=await edgeFixture(), response=await f.handler(f.req());
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(await response.json(),{access_token:'access',refresh_token:'refresh'});
  assert.equal(f.calls[0].options.headers.apikey,'server-secret');
  assert.deepEqual(JSON.parse(f.calls[0].options.body),{p_username:'chemist'});
  assert.equal(f.calls[1].options.headers.apikey,'public-key');
  assert.equal(f.calls[1].options.headers.Authorization,undefined);
  assert.deepEqual(JSON.parse(f.calls[1].options.body),{email:'private@example.test',password});
});

test('unknown, unconfirmed and wrong-password attempts all follow Auth path with identical errors', async () => {
  const responses=[];
  for (const email of [null,'private@example.test']) {
    const f=await edgeFixture({email,authStatus:400}), response=await f.handler(f.req());
    assert.equal(f.calls.length,2); assert.equal(response.status,401);
    responses.push(await response.text());
  }
  assert.equal(responses[0],responses[1]);
  assert(!responses[0].includes('private@'));
});

test('edge rejects throttled, unavailable, malformed and oversized requests without leaking upstream data', async () => {
  for (const [options,status,count] of [[{allowed:false},429,1],[{lookupStatus:500},503,1],[{authStatus:500},503,2],[{authStatus:429},429,2]]) {
    const f=await edgeFixture(options), response=await f.handler(f.req());
    assert.equal(response.status,status);assert.equal(f.calls.length,count);
    assert(!(await response.text()).includes('private@'));
  }
  const f=await edgeFixture();
  assert.equal((await f.handler(f.req({username:'bad name',password}))).status,400);
  assert.equal((await f.handler(f.req({username:'chemist',password:'x'.repeat(5000)}))).status,413);
  assert.equal((await f.handler(f.req({},'OPTIONS'))).status,204);
  assert.equal((await f.handler(f.req({},'GET'))).status,405);
  assert.equal(f.calls.length,0);
});

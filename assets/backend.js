'use strict';

// No SDK download or network traffic until an account connection is requested.
window.createQuizBackend = function createQuizBackend(config, loadClient = async () => {
  const {createClient} = await import('https://esm.sh/@supabase/supabase-js@2.57.4');
  return createClient;
}, request = (...args) => fetch(...args)) {
  let client, pending, user = null, generation = 0, recovering = false;
  const listeners = new Set();
  const configured = Boolean(config?.url && config?.publishableKey);
  function notify(session, event) {
    const next = session?.user || null;
    if (next?.id !== user?.id) { generation++; recovering = false; }
    if (event === 'PASSWORD_RECOVERY') recovering = true;
    if (!next) recovering = false;
    user = next;
    listeners.forEach(listener => listener(user, {recovering}));
  }
  async function connect() {
    if (client) return client;
    if (!configured) throw new Error('Accounts are not connected yet. You can keep studying in this browser.');
    if (!pending) pending = (async () => {
      const url = new URL(config.url);
      if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
        throw new Error('The account server must use HTTPS.');
      }
      if (location.protocol === 'file:') throw new Error('Open the app through a web server to use accounts.');
      const key = config.publishableKey;
      let role;
      if (key.split('.').length === 3) {
        try { role = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role; } catch { /* Server validates invalid keys. */ }
      }
      if (key.startsWith('sb_secret_') || role === 'service_role') throw new Error('Use a public Supabase publishable key, never a server secret.');
      const createClient = await loadClient();
      const candidate = createClient(url.href, key, {auth: {
        flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true,
      }});
      // Subscribe before initialization finishes so recovery callbacks are not lost.
      const subscription = candidate.auth.onAuthStateChange((event, session) => notify(session, event));
      const {data, error} = await candidate.auth.getSession();
      if (error) {
        subscription?.data?.subscription?.unsubscribe();
        candidate.auth.stopAutoRefresh();
        throw error;
      }
      client = candidate;
      notify(data.session);
      return client;
    })().catch(error => { pending = null; throw error; });
    return pending;
  }
  function identity() {
    if (!user) throw new Error('Sign in before using cloud backups.');
    return {id: user.id, generation};
  }
  function checkIdentity(start) {
    if (start.generation !== generation || start.id !== user?.id) throw new Error('Your account changed. Please try again.');
  }
  function callbackURL(recovery = false) {
    const redirect = new URL(location.href);
    redirect.search = ''; redirect.hash = 'account';
    if (recovery) redirect.searchParams.set('recovery', '1');
    return redirect.href;
  }
  function usernameValue(value) {
    const username = value.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(username)) throw new Error('Use 3–24 letters, numbers, or underscores for your username.');
    return username;
  }
  function checkPassword(password) {
    if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw new Error('Use a password between 12 and 256 characters.');
  }
  return {
    configured,
    get user() { return user; },
    get recovering() { return recovering; },
    connect,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async sendSignInLink(email) {
      const api = await connect();
      const {error} = await api.auth.signInWithOtp({email, options: {emailRedirectTo: callbackURL(), shouldCreateUser: false}});
      if (error) throw error;
    },
    async signUp(username, email, password) {
      username = usernameValue(username); checkPassword(password);
      const api = await connect();
      const {data, error} = await api.auth.signUp({email: email.trim(), password,
        options: {data: {username}, emailRedirectTo: callbackURL()}});
      if (error) throw new Error('Could not create this account. Try another username, or recover your existing account. ' + (error.code === 'weak_password' ? 'Choose a stronger password.' : ''));
      if (data.session) notify(data.session);
      return Boolean(data.session);
    },
    async signIn(username, password) {
      username = usernameValue(username);
      if (typeof password !== 'string' || !password.length || password.length > 256) throw new Error('Enter your password.');
      const api = await connect();
      const startGeneration = generation;
      const response = await request(new URL('functions/v1/username-login', config.url.replace(/\/?$/, '/')).href, {
        method: 'POST', credentials: 'omit', cache: 'no-store',
        headers: {'Content-Type': 'application/json', apikey: config.publishableKey},
        body: JSON.stringify({username, password}), signal: AbortSignal.timeout(30000),
      });
      if (response.status === 429) throw new Error('Too many sign-in attempts. Please try again in 15 minutes.');
      if ([400, 401].includes(response.status)) throw new Error('Invalid username or password. Confirm your email before signing in.');
      if (!response.ok) throw new Error('Username sign-in is temporarily unavailable. Please try again later.');
      const tokens = await response.json();
      if (generation !== startGeneration) throw new Error('Your account changed. Please try again.');
      if (typeof tokens.access_token !== 'string' || typeof tokens.refresh_token !== 'string') throw new Error('The sign-in response was incomplete. Please try again.');
      const {data, error} = await api.auth.setSession({access_token: tokens.access_token, refresh_token: tokens.refresh_token});
      if (error) throw error;
      notify(data.session);
    },
    async resetPassword(email) {
      const api = await connect();
      const {error} = await api.auth.resetPasswordForEmail(email.trim(), {redirectTo: callbackURL(true)});
      if (error) throw error;
    },
    async resendConfirmation(email) {
      const api = await connect();
      const {error} = await api.auth.resend({type: 'signup', email: email.trim(), options: {emailRedirectTo: callbackURL()}});
      if (error) throw error;
    },
    async updatePassword(password) {
      checkPassword(password);
      const api = await connect(); const start = identity();
      const {error} = await api.auth.updateUser({password});
      checkIdentity(start);
      if (error) throw error;
      recovering = false;
    },
    async readProfile() {
      const api = await connect(); const start = identity();
      const {data, error} = await api.from('account_profiles').select('username').eq('user_id', start.id).maybeSingle();
      checkIdentity(start);
      if (error) throw new Error('Username settings are temporarily unavailable. Your study backups are still available.');
      return data;
    },
    async claimUsername(username) {
      username = usernameValue(username);
      const api = await connect(); const start = identity();
      const {data, error} = await api.rpc('claim_username', {p_username: username});
      checkIdentity(start);
      if (error) throw new Error('Could not claim this username. Try another name or reload your account settings.');
      return {username: data};
    },
    async signOut() {
      const api = await connect();
      const {error} = await api.auth.signOut({scope: 'local'});
      if (error) throw error;
      notify(null);
    },
    async readBackup() {
      const api = await connect();
      const start = identity();
      const {data, error} = await api.from('study_backups')
        .select('payload, schema_version, revision, updated_at').eq('user_id', start.id).maybeSingle();
      checkIdentity(start);
      if (error) throw error;
      return data;
    },
    async saveBackup(payload, expectedRevision) {
      const api = await connect();
      const start = identity();
      const {data, error} = await api.rpc('save_study_backup', {
        p_payload: payload, p_expected_revision: expectedRevision,
      });
      checkIdentity(start);
      if (error) throw error;
      const row = data?.[0];
      if (!row) throw new Error('A newer cloud backup exists. Refresh the backup details before trying again.');
      return row;
    },
  };
};

// Cloud data is untrusted input. Whitelist fields and reject unsupported snapshots.
window.validateStudyBackup = function validateStudyBackup(snapshot, catalog) {
  const fail = () => { throw new Error('This backup is invalid or uses an unsupported format. Browser progress has not changed.'); };
  if (!snapshot || snapshot.schema_version !== 1) return fail();
  let data = snapshot.payload;
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
  const integer = value => Number.isSafeInteger(value) && value >= 0;
  if (!object(data) || new TextEncoder().encode(JSON.stringify(data)).length > 2000000) return fail();
  if (!['saved', 'attempts', 'sessions'].every(key => Array.isArray(data[key]))) return fail();
  if (!data.saved.every(id => typeof id === 'string') || !data.attempts.every(a => object(a) && typeof a.id === 'string' && typeof a.correct === 'boolean' && date(a.at))) return fail();
  if (data.savedFolders !== undefined && (!Array.isArray(data.savedFolders) || !data.savedFolders.every(f =>
    object(f) && typeof f.id === 'string' && /^folder-[a-z0-9-]+$/.test(f.id) &&
    typeof f.name === 'string' && f.name.trim().length > 0 && f.name.length <= 80 &&
    Array.isArray(f.reactionIds) && f.reactionIds.every(id => typeof id === 'string')))) return fail();
  if (!data.sessions.every(s => object(s) && typeof s.title === 'string' && s.title.length <= 1000 && integer(s.total) && integer(s.correct) && s.correct <= s.total && Number.isFinite(s.seconds) && s.seconds >= 0 && date(s.at))) return fail();
  if (data.selectedCategories !== undefined && (!Array.isArray(data.selectedCategories) || !data.selectedCategories.every(id => typeof id === 'string'))) return fail();
  if (data.flashcardReviews !== undefined && (!object(data.flashcardReviews) || !Object.values(data.flashcardReviews).every(r => object(r) && ['known', 'again'].includes(r.rating) && date(r.at)))) return fail();
  data = migrateStudyProgress(data, catalog);
  const ids = new Set(catalog.reactions);
  return {
    saved: [...new Set(data.saved.filter(id => ids.has(id)))],
    savedFolders: data.savedFolders,
    attempts: data.attempts.filter(a => ids.has(a.id)).map(({id, correct, at}) => ({id, correct, at})),
    sessions: data.sessions.map(({title, total, correct, seconds, at}) => ({title, total, correct, seconds, at})),
    selectedCategories: data.selectedCategories, categoryVersion: data.categoryVersion,
    libraryView: data.libraryView === 'expanded' ? 'expanded' : 'condensed',
    bookFilter: catalog.books.includes(data.bookFilter) ? data.bookFilter : 'all',
    flashcardMode: ['name', 'reaction', 'mechanism'].includes(data.flashcardMode) ? data.flashcardMode : data.flashcardMode === 'outline' ? 'reaction' : 'name',
    flashcardViewVersion: 3,
    flashcardReviews: Object.fromEntries(Object.entries(data.flashcardReviews || {}).filter(([id]) => ids.has(id)).map(([id, {rating, at}]) => [id, {rating, at}])),
  };
};

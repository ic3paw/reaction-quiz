'use strict';

// No SDK download or network traffic until an account connection is requested.
window.createQuizBackend = function createQuizBackend(config, loadClient = async () => {
  const {createClient} = await import('https://esm.sh/@supabase/supabase-js@2.57.4');
  return createClient;
}) {
  let client, pending, user = null, generation = 0;
  const listeners = new Set();
  const configured = Boolean(config?.url && config?.publishableKey);
  function notify(session) {
    const next = session?.user || null;
    if (next?.id !== user?.id) generation++;
    user = next;
    listeners.forEach(listener => listener(user));
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
      const {data, error} = await candidate.auth.getSession();
      if (error) {
        candidate.auth.stopAutoRefresh();
        throw error;
      }
      client = candidate;
      client.auth.onAuthStateChange((_event, session) => notify(session));
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
  return {
    configured,
    get user() { return user; },
    connect,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async sendSignInLink(email) {
      const api = await connect();
      const redirect = new URL(location.href);
      redirect.search = ''; redirect.hash = 'account';
      const {error} = await api.auth.signInWithOtp({email, options: {emailRedirectTo: redirect.href}});
      if (error) throw error;
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
  const data = snapshot.payload;
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
  const integer = value => Number.isSafeInteger(value) && value >= 0;
  if (!object(data) || new TextEncoder().encode(JSON.stringify(data)).length > 2000000) return fail();
  if (!['saved', 'attempts', 'sessions'].every(key => Array.isArray(data[key]))) return fail();
  if (!data.saved.every(id => typeof id === 'string') || !data.attempts.every(a => object(a) && typeof a.id === 'string' && typeof a.correct === 'boolean' && date(a.at))) return fail();
  if (!data.sessions.every(s => object(s) && typeof s.title === 'string' && s.title.length <= 1000 && integer(s.total) && integer(s.correct) && s.correct <= s.total && Number.isFinite(s.seconds) && s.seconds >= 0 && date(s.at))) return fail();
  if (data.selectedCategories !== undefined && (!Array.isArray(data.selectedCategories) || !data.selectedCategories.every(id => typeof id === 'string'))) return fail();
  if (data.flashcardReviews !== undefined && (!object(data.flashcardReviews) || !Object.values(data.flashcardReviews).every(r => object(r) && ['known', 'again'].includes(r.rating) && date(r.at)))) return fail();
  const ids = new Set(catalog.reactions);
  let selected = data.selectedCategories || catalog.categories;
  if (!data.categoryVersion || data.categoryVersion < 2) selected = catalog.categories;
  if (data.categoryVersion === 2 && catalog.categories.filter(id => id !== 'mundy-additions').every(id => selected.includes(id))) selected = catalog.categories;
  return {
    saved: [...new Set(data.saved.filter(id => ids.has(id)))],
    attempts: data.attempts.filter(a => ids.has(a.id)).map(({id, correct, at}) => ({id, correct, at})),
    sessions: data.sessions.map(({title, total, correct, seconds, at}) => ({title, total, correct, seconds, at})),
    selectedCategories: catalog.categories.filter(id => selected.includes(id)), categoryVersion: 3,
    libraryView: data.libraryView === 'expanded' ? 'expanded' : 'condensed',
    bookFilter: catalog.books.includes(data.bookFilter) ? data.bookFilter : 'all',
    flashcardMode: ['name', 'reaction', 'mechanism'].includes(data.flashcardMode) ? data.flashcardMode : data.flashcardMode === 'outline' ? 'reaction' : 'name',
    flashcardViewVersion: 3,
    flashcardReviews: Object.fromEntries(Object.entries(data.flashcardReviews || {}).filter(([id]) => ids.has(id)).map(([id, {rating, at}]) => [id, {rating, at}])),
  };
};

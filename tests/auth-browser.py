"""Exercise the real account UI against a fake SDK; never contacts Supabase.
Serve the repository at http://127.0.0.1:8765 and run with Python + Playwright.
"""
from playwright.sync_api import sync_playwright, expect

SDK = r'''
export function createClient() {
  let listener;
  const user = {id:'test-user',email:'private@example.test'};
  const log = (method, args) => window.authCalls.push({method,args});
  const save = session => {sessionStorage.setItem('test-session',JSON.stringify(session)); listener?.(session ? 'SIGNED_IN' : 'SIGNED_OUT',session);};
  const api = {
    auth: {
      onAuthStateChange(fn) { listener=fn; window.testAuthEvent=fn; return {data:{subscription:{unsubscribe(){}}}}; },
      async getSession() {
        if (new URLSearchParams(location.search).has('code')) {
          const session={user};sessionStorage.setItem('test-session',JSON.stringify(session));
          const recovery=new URLSearchParams(location.search).has('recovery');
          listener?.(recovery ? 'PASSWORD_RECOVERY' : 'SIGNED_IN',session);
          const clean=new URL(location.href);clean.searchParams.delete('code');history.replaceState(null,'',clean);
        }
        return {data:{session:JSON.parse(sessionStorage.getItem('test-session') || 'null')},error:null};
      },
      async signUp(args) {log('signUp',args);sessionStorage.setItem('test-profile',args.options.data.username);return {data:{session:null},error:null};},
      async setSession(args) {log('setSession',args);save({user});return {data:{session:{user}},error:null};},
      async signInWithOtp(args) {log('otp',args);return {error:null};},
      async resetPasswordForEmail(email,args) {log('reset',{email,...args});return {error:null};},
      async resend(args) {log('resend',args);return {error:null};},
      async updateUser(args) {log('update',args);listener?.('USER_UPDATED',{user});return {error:null};},
      async signOut() {save(null);return {error:null};},
      stopAutoRefresh(){},
    },
    from(table) {return {select(){return this;},eq(){return this;},async maybeSingle(){
      return {data:table==='account_profiles' && sessionStorage.getItem('test-profile') ? {username:sessionStorage.getItem('test-profile')} : null,error:null};
    }};},
    async rpc(name,args) {log(name,args);sessionStorage.setItem('test-profile',args.p_username);return {data:args.p_username,error:null};},
  };
  return api;
}
'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1100, "height": 900})
    page = context.new_page()
    errors, logins = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    context.add_init_script('window.authCalls = [];')
    context.route('https://esm.sh/@supabase/supabase-js@*', lambda route: route.fulfill(
        status=200, content_type='application/javascript', body=SDK, headers={'Access-Control-Allow-Origin':'*'}))

    def fake_server(route):
        if route.request.method == 'OPTIONS':
            route.fulfill(status=204, headers={'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'content-type,apikey'})
            return
        assert route.request.url.endswith('/functions/v1/username-login'), 'Unexpected real backend request'
        body = route.request.post_data_json
        logins.append(body)
        route.fulfill(status=401 if body['password'] == 'wrong-password' else 200,
                      content_type='application/json', body='{"access_token":"test-access","refresh_token":"test-refresh"}',
                      headers={'Access-Control-Allow-Origin':'*'})

    context.route('https://*.supabase.co/**', fake_server)
    base = 'http://127.0.0.1:8765/'
    page.goto(base + '#account')
    page.get_by_role('button', name='Connect', exact=True).click()
    expect(page.get_by_label('Username', exact=True)).to_be_visible()
    page.get_by_role('button', name='Create account', exact=True).click()
    page.get_by_label('Username', exact=True).fill('CHEMIST_1')
    page.get_by_label('Email address', exact=True).fill('private@example.test')
    page.get_by_label('New password', exact=True).fill('test-password-123')
    page.get_by_label('Confirm password', exact=True).fill('different-password')
    page.get_by_role('button', name='Create account', exact=True).click()
    assert not page.evaluate('authCalls.length'), 'Mismatch must not reach Auth'
    page.get_by_label('Confirm password', exact=True).fill('test-password-123')
    page.get_by_role('button', name='Create account', exact=True).click()
    expect(page.locator('#account-message')).to_contain_text('Check your email')
    assert page.evaluate('authCalls[0].args.options.data.username') == 'chemist_1'
    assert page.get_by_label('New password', exact=True).input_value() == ''
    page.get_by_role('button', name='Resend confirmation', exact=True).click()
    page.get_by_role('button', name='Resend confirmation', exact=True).click()
    expect(page.locator('#account-message')).to_contain_text('new link')
    assert page.evaluate('authCalls.at(-1).args.type') == 'signup'
    page.get_by_role('button', name='Sign in', exact=True).click()
    page.get_by_label('Username', exact=True).fill('CHEMIST_1')
    page.get_by_label('Password', exact=True).fill('wrong-password')
    page.get_by_role('button', name='Sign in', exact=True).click()
    expect(page.locator('#account-message')).to_contain_text('Invalid username or password')
    assert page.get_by_label('Password', exact=True).input_value() == ''
    assert page.get_by_label('Username', exact=True).input_value() == 'CHEMIST_1'
    page.get_by_label('Password', exact=True).fill('test-password-123')
    original_progress = page.evaluate("localStorage.getItem('catalyst-progress-v1')")
    page.get_by_role('button', name='Sign in', exact=True).click()
    expect(page.get_by_role('heading', name='Signed in', exact=True)).to_be_visible()
    assert logins[-1]['username'] == 'chemist_1'
    assert page.evaluate("localStorage.getItem('catalyst-progress-v1')") == original_progress
    page.get_by_role('button', name='Refresh cloud details', exact=True).click()
    expect(page.locator('#account-message')).to_contain_text('refreshed')
    page.reload()
    page.get_by_role('button', name='Connect', exact=True).click()
    expect(page.get_by_role('heading', name='Signed in', exact=True)).to_be_visible()
    page.get_by_role('button', name='Sign out on this device', exact=True).click()
    page.get_by_role('button', name='Forgot password?', exact=True).click()
    page.get_by_label('Email address', exact=True).fill('private@example.test')
    page.get_by_role('button', name='Send reset link', exact=True).click()
    expect(page.locator('#account-message')).to_contain_text('reset link will arrive')
    assert page.evaluate('authCalls.at(-1).args.redirectTo').endswith('?recovery=1#account')
    page.goto(base + '?recovery=1&code=test-recovery#account')
    expect(page.get_by_role('heading', name='Set a new password', exact=True)).to_be_visible()
    page.reload()
    expect(page.get_by_role('heading', name='Set a new password', exact=True)).to_be_visible()
    page.get_by_label('New password', exact=True).fill('changed-password-123')
    page.get_by_label('Confirm password', exact=True).fill('changed-password-123')
    page.get_by_role('button', name='Save password', exact=True).click()
    expect(page.locator('#account-message')).to_contain_text('Password saved')
    assert 'recovery=' not in page.url
    assert page.evaluate('authCalls.at(-1).method') == 'update'
    # Legacy email-link account claims a username without changing identity/progress.
    page.get_by_role('button', name='Sign out on this device', exact=True).click()
    page.evaluate("sessionStorage.removeItem('test-profile')")
    page.get_by_role('button', name='Use an email link', exact=True).click()
    page.get_by_label('Email address', exact=True).fill('private@example.test')
    page.get_by_role('button', name='Email me a sign-in link', exact=True).click()
    expect(page.locator('#account-message')).to_contain_text('sign-in link will arrive')
    assert page.evaluate('authCalls.at(-1).args.options.shouldCreateUser') is False
    page.goto(base + '?code=existing-user#account')
    expect(page.get_by_role('button', name='Claim username', exact=True)).to_be_visible()
    page.get_by_label('Username', exact=True).fill('Existing_User')
    page.get_by_role('button', name='Claim username', exact=True).click()
    expect(page.locator('#account-message')).to_contain_text('Username saved')
    assert page.evaluate("sessionStorage.getItem('test-profile')") == 'existing_user'
    assert page.evaluate('quizBackend.user.id') == 'test-user'
    # Invalid/expired callbacks and cross-tab signout do not leave a password-only UI.
    page.evaluate("testAuthEvent('SIGNED_OUT', null)")
    expect(page.get_by_label('Username', exact=True)).to_be_visible()
    page.goto(base + '?error_description=expired&code=invalid#account')
    expect(page.locator('#account-message')).to_contain_text('could not be used')
    assert 'code=' not in page.url and 'error_description=' not in page.url
    assert not errors, errors
    print('PASS: registration, confirmation resend, validation, username sign-in/errors, session reload, recovery/reload, password update, legacy migration, callback errors, and unchanged study progress; no real Auth requests.')
    browser.close()

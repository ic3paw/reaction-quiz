'use strict';

const quizBackend = window.createQuizBackend(window.REACTION_QUIZ_SUPABASE);
let accountBusy = false, accountConnected = false, accountMessage = '', accountError = false;
let cloudBackup = null, cloudLoaded = false, restorePreview = null, accountUserId = null;
let accountMode = 'signin', accountProfile = null, profileLoaded = false, profileError = '';
let accountUsername = '', accountEmail = '', recoveryActive = false;

quizBackend.subscribe((user, {recovering} = {}) => {
  const changed = user?.id !== accountUserId;
  const recoveryChanged = Boolean(recovering) !== recoveryActive;
  recoveryActive = Boolean(recovering);
  if (changed) {
    accountUserId = user?.id;
    cloudBackup = null; cloudLoaded = false; restorePreview = null; accountMessage = '';
    accountProfile = null; profileLoaded = false; profileError = '';
    if (!user) accountMode = 'signin';
    // Auth callbacks stay synchronous; SDK calls here can deadlock its session lock.
    if (user && accountConnected && !accountBusy) setTimeout(() => {
      if (quizBackend.user?.id === user.id) runAccountTask(loadAccountProfile);
    }, 0);
  }
  if (recovering) accountMode = 'password';
  if (page === 'account' && (changed || recoveryChanged)) renderAccount();
});

async function loadAccountProfile() {
  profileError = '';
  try { accountProfile = await quizBackend.readProfile(); profileLoaded = true; }
  catch (error) { profileError = error.message; }
}

function usernameInput(disabled) {
  return `<label for="account-username">Username</label>
    <input id="account-username" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_]{3,24}" aria-describedby="username-help" value="${escapeHTML(accountUsername)}" ${disabled}>
    <small id="username-help">3–24 letters, numbers, or underscores. Usernames are not case-sensitive.</small>`;
}
function emailInput(disabled) {
  return `<label for="account-email">Email address</label><input id="account-email" name="email" type="email" autocomplete="email" required maxlength="254" value="${escapeHTML(accountEmail)}" ${disabled}>`;
}
function passwordInputs(disabled, isNew = false) {
  return `<label for="account-password">${isNew ? 'New password' : 'Password'}</label>
    <input id="account-password" name="password" type="password" autocomplete="${isNew ? 'new-password' : 'current-password'}" required ${isNew ? 'minlength="12"' : ''} maxlength="256" ${disabled}>
    ${isNew ? `<small>Use at least 12 characters.</small><label for="account-password-confirm">Confirm password</label>
    <input id="account-password-confirm" name="confirm" type="password" autocomplete="new-password" required minlength="12" maxlength="256" ${disabled}>` : ''}`;
}
function signedOutForm(disabled) {
  const modes = {signin:'Sign in', signup:'Create account', recover:'Forgot password?', link:'Use an email link', confirm:'Resend confirmation'};
  const intro = {
    signin:'Sign in with your username and password.',
    signup:'Choose a username and password. Your email is used for confirmation and account recovery.',
    recover:'Enter your account email to receive a password reset link. Open it in this browser.',
    link:'Existing email-link account? Sign in with your email, then choose a username and set a password.',
    confirm:'Enter your email to request another confirmation link. Open it in this browser.',
  };
  const labels = {signin:'Sign in', signup:'Create account', recover:'Send reset link', link:'Email me a sign-in link', confirm:'Resend confirmation'};
  return `<h2>${modes[accountMode]}</h2><p>${intro[accountMode]}</p>
    <form id="account-auth-form" class="account-form" data-mode="${accountMode}">
    ${['signin','signup'].includes(accountMode) ? usernameInput(disabled) : ''}
    ${accountMode !== 'signin' ? emailInput(disabled) : ''}
    ${['signin','signup'].includes(accountMode) ? passwordInputs(disabled, accountMode === 'signup') : ''}
    <button class="button primary" ${disabled}>${labels[accountMode]}</button></form>
    <div class="actions account-auth-options">${Object.entries(modes).filter(([mode]) => mode !== accountMode).map(([mode,label]) => `<button class="text-button" data-account-mode="${mode}" ${disabled}>${label}</button>`).join('')}</div>`;
}
function accountCredentials(disabled) {
  const recovery = recoveryActive || accountMode === 'password';
  return `<section class="account-backup"><h2>${recovery ? 'Set a new password' : 'Username and password'}</h2>
    ${profileError ? `<p class="account-error">${escapeHTML(profileError)}</p><button class="text-button" data-account-action="profile" ${disabled}>Reload username settings</button>` : !profileLoaded ? '<p>Loading username…</p>' : accountProfile ? `<p>Your username: <strong>${escapeHTML(accountProfile.username)}</strong></p>` : `
      <p>Choose a username for this account, then set a password below. Your saved backups stay with this account.</p>
      <form id="account-username-form" class="account-form">${usernameInput(disabled)}<button class="button secondary" ${disabled}>Claim username</button></form>`}
    ${recovery ? '<p>Enter your new password below to finish resetting it.</p>' : '<p>Set or change your password.</p>'}
    <form id="account-password-form" class="account-form">${passwordInputs(disabled, true)}<button class="button primary" ${disabled}>Save password</button></form>
    </section>`;
}

function backupCatalog() {
  return {reactions: reactions.map(r => r.id), categories: categories.map(c => c.id),
    mundyCategories: [...new Set(mundyCatalog.flatMap(r => r.categories))], books: ['all', ...Object.keys(sourceBooks)]};
}

function renderAccount() {
  const user = quizBackend.user;
  const disabled = accountBusy ? 'disabled' : '';
  main.innerHTML = heading('Account') + `<div class="account-panel">
    <p class="intro">Keep a private cloud backup of your saved reactions, quiz history, flashcard reviews, and study preferences.</p>
    <p class="account-notice">Studying always saves to this browser. Cloud backups are manual: back up after studying, then restore on another device. Signing in or out does not change browser progress. On a shared device, that progress remains visible to other people.</p>
    ${!quizBackend.configured ? '<h2>Accounts are coming soon</h2><p>This site’s account service has not been connected yet. Your library, quizzes, and browser progress are ready to use.</p><a class="button secondary" href="#dashboard">Continue studying</a>' : !accountConnected ? `
      <h2>Connect your account</h2><p>Sign in to save and restore your study progress across devices.</p>
      <button class="button primary" data-account-action="connect" ${disabled}>${accountBusy ? 'Connecting…' : 'Connect'}</button>` : !user ? signedOutForm(disabled) : `
      <div class="section-heading"><h2>Signed in</h2><button class="text-button" data-account-action="sign-out" ${disabled}>Sign out on this device</button></div>
      <p class="account-email">${escapeHTML(user.email || 'Your account')}</p>
      ${accountCredentials(disabled)}
      <section class="account-backup"><h2>Study backup</h2>
      <p>This browser: ${state.saved.length} saved reactions · ${state.attempts.length} quiz answers · ${state.sessions.length} completed quizzes.</p>
      <p>${!cloudLoaded ? 'Refresh to check for an existing cloud backup.' : cloudBackup ? `Cloud backup: ${escapeHTML(new Date(cloudBackup.updated_at).toLocaleString())} · revision ${escapeHTML(cloudBackup.revision)}.` : 'No cloud backup yet.'}</p>
      <p class="muted">Backing up replaces this account’s cloud copy with the progress currently in this browser. Restoring replaces browser progress with the cloud copy; histories are not merged.</p>
      <div class="actions"><button class="button secondary" data-account-action="refresh" ${disabled}>Refresh cloud details</button>
      <button class="button primary" data-account-action="save" ${disabled} ${!cloudLoaded ? 'disabled' : ''}>Back up this browser</button>
      <button class="button secondary" data-account-action="preview" ${disabled} ${!cloudLoaded || !cloudBackup ? 'disabled' : ''}>Restore cloud backup</button></div>
      ${restorePreview ? `<div class="account-notice"><h3>Replace browser progress?</h3><p>The cloud copy contains ${restorePreview.state.saved.length} saved reactions, ${restorePreview.state.attempts.length} quiz answers, and ${restorePreview.state.sessions.length} completed quizzes. Current browser progress will be kept in a local recovery copy.</p><div class="actions"><button class="button primary" data-account-action="restore" ${disabled}>Replace browser progress</button><button class="button secondary" data-account-action="cancel" ${disabled}>Cancel</button></div></div>` : ''}</section>`}
    <p id="account-message" role="status" aria-live="polite" class="account-message ${accountError ? 'account-error' : ''}">${escapeHTML(accountBusy ? 'Working…' : accountMessage)}</p>
    </div>`;
  main.querySelectorAll('[data-account-mode]').forEach(button => button.addEventListener('click', () => {
    if (accountBusy) return;
    accountMode = button.dataset.accountMode; accountMessage = ''; accountError = false; renderAccount();
  }));
  main.querySelectorAll('.account-form').forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    const fields = new FormData(form);
    const password = fields.get('password');
    if (fields.has('username')) accountUsername = fields.get('username').trim();
    if (fields.has('email')) accountEmail = fields.get('email').trim();
    if (fields.has('confirm') && password !== fields.get('confirm')) {
      const confirm = form.querySelector('[name="confirm"]');
      confirm.setCustomValidity('Passwords must match.'); confirm.reportValidity();
      confirm.addEventListener('input', () => confirm.setCustomValidity(''), {once:true});
      form.querySelector('[name="password"]').addEventListener('input', () => confirm.setCustomValidity(''), {once:true});
      return;
    }
    const formId = form.id, mode = form.dataset.mode;
    runAccountTask(async () => {
      if (formId === 'account-username-form') {
        accountProfile = await quizBackend.claimUsername(accountUsername); profileLoaded = true;
        accountMessage = 'Username saved. Set a password below to use username sign-in.';
      } else if (formId === 'account-password-form') {
        await quizBackend.updatePassword(password);
        recoveryActive = false; accountMode = 'signin';
        const clean = new URL(location.href); clean.searchParams.delete('recovery'); history.replaceState(null, '', clean);
        accountMessage = accountProfile ? 'Password saved. You can now sign in with your username and password.' : 'Password saved. Choose a username above to enable username sign-in.';
      } else if (mode === 'signin') {
        await quizBackend.signIn(accountUsername, password);
        await loadAccountProfile();
        accountMessage = 'Signed in. Your browser progress has not changed.';
      } else if (mode === 'signup') {
        const signedIn = await quizBackend.signUp(accountUsername, accountEmail, password);
        if (signedIn) await loadAccountProfile();
        accountMessage = signedIn ? 'Account created. Your browser progress is ready to back up.' : 'Check your email to confirm your account. Open the link in this browser. If you already have an account, sign in or reset its password.';
      } else if (mode === 'recover') {
        await quizBackend.resetPassword(accountEmail);
        accountMessage = 'If this email belongs to an eligible account, a reset link will arrive shortly. Open it in this browser.';
      } else if (mode === 'confirm') {
        await quizBackend.resendConfirmation(accountEmail);
        accountMessage = 'If this account needs confirmation, a new link will arrive shortly. Open it in this browser.';
      } else {
        await quizBackend.sendSignInLink(accountEmail);
        accountMessage = 'If this email belongs to an eligible account, a sign-in link will arrive shortly. Open it in this browser.';
      }
    });
  }));
  main.querySelectorAll('[data-account-action]').forEach(button => button.addEventListener('click', () => accountAction(button.dataset.accountAction)));
}

async function runAccountTask(task) {
  if (accountBusy) return;
  accountBusy = true; accountError = false; accountMessage = '';
  if (page === 'account') renderAccount();
  try { await task(); }
  catch (error) { accountError = true; accountMessage = error.message || 'The account service could not be reached. Please try again.'; }
  finally { accountBusy = false; if (page === 'account') renderAccount(); }
}

async function refreshCloudBackup() {
  cloudLoaded = false; restorePreview = null;
  cloudBackup = await quizBackend.readBackup();
  cloudLoaded = true;
}

function accountAction(action) {
  if (action === 'cancel') { restorePreview = null; renderAccount(); return; }
  return runAccountTask(async () => {
    if (action === 'connect') {
      await quizBackend.connect(); accountConnected = true;
      if (quizBackend.user) {
        await loadAccountProfile();
        if (quizBackend.recovering || new URLSearchParams(location.search).get('recovery') === '1') accountMode = 'password';
      } else if (new URLSearchParams(location.search).get('recovery') === '1') {
        accountMode = 'recover'; accountMessage = 'Request a new reset link and open it in this browser.';
      }
    } else if (action === 'profile') {
      await loadAccountProfile();
    } else if (action === 'sign-out') {
      await quizBackend.signOut(); accountMode = 'signin';
      const clean = new URL(location.href); clean.searchParams.delete('recovery'); history.replaceState(null, '', clean);
      accountMessage = 'Signed out on this device. Browser progress is still available here.';
    } else if (action === 'refresh') {
      await refreshCloudBackup(); accountMessage = 'Cloud backup details refreshed.';
    } else if (action === 'save') {
      if (!cloudLoaded) throw new Error('Refresh cloud details before backing up.');
      restorePreview = null;
      const payload = window.validateStudyBackup({schema_version: 1, payload: state}, backupCatalog());
      try { cloudBackup = await quizBackend.saveBackup(payload, cloudBackup?.revision || 0); }
      catch (error) { cloudLoaded = false; throw error; }
      accountMessage = 'Cloud backup saved. Future study changes stay in this browser until you back up again.';
    } else if (action === 'preview') {
      await refreshCloudBackup();
      if (!cloudBackup) throw new Error('There is no cloud backup to restore.');
      restorePreview = {userId: quizBackend.user.id, state: window.validateStudyBackup(cloudBackup, backupCatalog())};
    } else if (action === 'restore') {
      if (!restorePreview || restorePreview.userId !== quizBackend.user?.id) throw new Error('Your account changed. Preview the backup again.');
      // Both writes must succeed before changing the live app. Storage failures abort restore.
      try {
        localStorage.setItem(`${storageKey}-before-restore`, JSON.stringify(state));
        localStorage.setItem(storageKey, JSON.stringify(restorePreview.state));
      } catch { throw new Error('Browser storage is unavailable or full. Restore was cancelled; current progress has not changed.'); }
      state = restorePreview.state; restorePreview = null; storageAvailable = true;
      document.querySelector('.local-status').textContent = 'Progress saved in this browser.';
      document.querySelector('#book-filter').value = state.bookFilter;
      syncCategories();
      accountMessage = 'Cloud backup restored to this browser.';
    }
  });
}

function initializeAccountCallback() {
  const params = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.slice(1));
  if (!params.has('code') && !params.has('error_description') && !hashParams.has('error_description') && !params.has('recovery')) return;
  const authError = params.get('error_description') || hashParams.get('error_description');
  location.hash = 'account';
  if (authError) {
    const clean = new URL(location.href);
    ['code', 'error', 'error_code', 'error_description', 'recovery'].forEach(key => clean.searchParams.delete(key));
    history.replaceState(null, '', clean);
    accountError = true; accountMessage = 'This account link could not be used. Connect and request a new sign-in, confirmation, or reset link.';
    renderAccount();
  } else {
    accountAction('connect');
  }
}

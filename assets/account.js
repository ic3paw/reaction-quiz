'use strict';

const quizBackend = window.createQuizBackend(window.REACTION_QUIZ_SUPABASE);
let accountBusy = false, accountConnected = false, accountMessage = '', accountError = false;
let cloudBackup = null, cloudLoaded = false, restorePreview = null, accountUserId = null;

quizBackend.subscribe(user => {
  if (user?.id !== accountUserId) {
    accountUserId = user?.id;
    cloudBackup = null; cloudLoaded = false; restorePreview = null; accountMessage = '';
  }
  if (page === 'account') renderAccount();
});

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
      <button class="button primary" data-account-action="connect" ${disabled}>${accountBusy ? 'Connecting…' : 'Connect'}</button>` : !user ? `
      <h2>Sign in or create an account</h2><p>We’ll email you a secure sign-in link. Open it in this same browser to finish signing in.</p>
      <form id="account-sign-in" class="account-form"><label for="account-email">Email address</label>
      <input id="account-email" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="you@example.com" ${disabled}>
      <button class="button primary" ${disabled}>${accountBusy ? 'Sending…' : 'Email me a sign-in link'}</button></form>` : `
      <div class="section-heading"><h2>Signed in</h2><button class="text-button" data-account-action="sign-out" ${disabled}>Sign out on this device</button></div>
      <p class="account-email">${escapeHTML(user.email || 'Your account')}</p>
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
  main.querySelector('#account-sign-in')?.addEventListener('submit', event => {
    event.preventDefault();
    const email = new FormData(event.target).get('email').trim();
    runAccountTask(async () => {
      await quizBackend.sendSignInLink(email);
      accountMessage = 'Check your email for a sign-in link. If it is eligible for sign-in, a link will arrive shortly. Open it in this browser.';
    });
  });
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
      if (quizBackend.user) await refreshCloudBackup();
    } else if (action === 'sign-out') {
      await quizBackend.signOut();
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
  if (!params.has('code') && !params.has('error_description') && !hashParams.has('error_description')) return;
  const authError = params.get('error_description') || hashParams.get('error_description');
  location.hash = 'account';
  if (authError) {
    const clean = new URL(location.href);
    ['error', 'error_code', 'error_description'].forEach(key => clean.searchParams.delete(key));
    history.replaceState(null, '', clean);
    accountError = true; accountMessage = 'This sign-in link could not be used. Connect and request a new link.';
    renderAccount();
  } else {
    accountAction('connect');
  }
}

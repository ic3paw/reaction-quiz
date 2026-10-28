# Supabase accounts and backend foundation

Accounts support username/password registration and sign-in, email confirmation, password recovery, and private manual study backups. Existing users without a username can follow a password recovery link, claim a username, and set a password without changing their Auth user ID or backups. The static reaction and reagent catalog stays in the site assets. Guests can keep studying without a connection, and the Supabase SDK loads when someone opens Account or returns through an account link.

## Connect a project

1. Create a Supabase project. Apply [the migration](../supabase/migrations/202610270001_accounts_and_backups.sql) once using the Supabase SQL editor or your Supabase CLI migration workflow. It creates the backup table, row-level security policies, and atomic save function.
2. Enable the Email authentication provider and allow new signups. Keep email confirmation enabled, set the minimum password length to 12, and retain the confirmation, recovery, and magic-link email templates. Configure an SMTP provider for production email delivery; Supabase's built-in mail service has restrictions and rate limits.
3. Set Authentication → URL Configuration → Site URL to the deployed app URL. Add each exact callback URL to the redirect allowlist, including its path and `#account`, for example `https://your-site.example/index.html#account` and `http://localhost:8765/index.html#account`. If people visit `/` as well as `/index.html`, allow both. Avoid broad production wildcards.
4. Set `url` and `publishableKey` in [the browser configuration](../assets/supabase-config.js). Use the project URL and an `sb_publishable_…` key (a legacy `anon` key also works). Both values are public. Never put an `sb_secret_…` key, service-role key, database password, or SMTP credential in frontend assets.
5. Serve the site over HTTPS in production. For local development, run `python3 -m http.server 8765` and open `http://localhost:8765/index.html#account`. Accounts require an HTTP origin; opening the HTML file directly still supports guest study.
6. Complete the username/password deployment below, then select Account → Create account. Choose a username and password and supply a recovery email. Open the confirmation link in the same browser profile that requested it. PKCE uses a browser-local verifier. For existing accounts without a username, use Forgot password, open the recovery link, then claim a username and set a password.

No project is provisioned, migration applied, or email sent by this repository change. Empty configuration leaves accounts unavailable and makes no external requests. A configured account flow downloads the pinned Supabase JavaScript SDK from esm.sh and calls your Supabase project. Deployments with a Content Security Policy must permit those resources, or vendor the SDK and update the loader in [the backend adapter](../assets/backend.js).

## Activate username/password on the hosted project

The implementation is included in the repository, but the new migration and Edge Function must be deployed before username registration and login work. The browser's public key cannot apply migrations or deploy functions. Existing email-link sign-in and backup operations continue to work before deployment; username settings report unavailable until the migration is installed.

1. Apply [the username migration](../supabase/migrations/202610280001_username_password.sql) **after** the original backup migration, through the SQL editor or your authenticated migration workflow. It adds private profile access, atomic username claims, the signup trigger, and server-only lookup/throttling. It does not rewrite existing users or backups.
2. Deploy a function named exactly `username-login`. For a **Dashboard-only deployment**, select Edge Functions → Deploy a new function → Via Editor. Replace all starter `index.ts` code with the entire [single-file dashboard entrypoint](../supabase/dashboard/username-login.ts), then deploy. It includes the handler and has no local imports, avoiding the Dashboard bundler's reported missing `handler.mjs` error. After deployment, disable **Verify JWT** in the function settings and save. No second file or Terminal command is needed for this method.

   The single-file entrypoint is generated from the original function files. Maintainers must regenerate it with `python3 scripts/build-username-login.py` after changing either source file; do not edit the generated copy independently.

   Alternatively, deploy the original [username-login](../supabase/functions/username-login/index.ts) and [handler module](../supabase/functions/username-login/handler.mjs) together from an authenticated Supabase CLI in the repository:

   ```sh
   supabase functions deploy username-login --project-ref kjabiqcemysvbavapaqo --no-verify-jwt
   ```

   The public endpoint must be callable before a user has a session; [function configuration](../supabase/config.toml) sets `verify_jwt = false`. The handler verifies credentials with Supabase Auth before returning tokens. Hosted Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; keep the service-role key exclusively on the server. For projects with legacy keys disabled, adapt these environment bindings to the project's public and secret keys before deploying.
3. In Authentication → URL Configuration, allow the normal account callback and the recovery callback for each site path you serve. For example, allow `https://your-site.example/index.html#account` and `https://your-site.example/index.html?recovery=1#account`; also add the `/` equivalents if used. Use the same URLs for local tests, replacing the origin with `http://localhost:8765`. The recovery flag selects the password form; it does not grant a session or authorize a password change.
4. In Authentication → Email, enable signups and email confirmations. Set the project password minimum to 12 characters so direct API callers follow the same minimum as the UI. Configure production SMTP and test both confirmation and password recovery email delivery.
5. Publish the updated static assets after the migration and function are deployed. Test a new account and an existing email-link account, reload/session persistence, sign-out, reset/confirmation link expiry, and access to an existing backup. These live deployment checks require your project access; local tests use fake Auth responses and an isolated database.

The Account page opens directly to username/password sign-in, with a smaller Create account button and a Forgot password link. Session restoration is automatic. Password recovery still uses Supabase email delivery; removing email confirmation does not enable reset email delivery. Configure SMTP for public recovery emails.

### Username and password behavior

- Usernames contain 3–24 ASCII letters, digits, or underscores. Input is trimmed and lowercased, so names are unique without regard to case. New signups reserve the username in the Auth-user creation transaction. A duplicate or invalid username rolls back that signup; no orphan Auth account is created.
- Existing users claim a username once while signed in. Claims are idempotent for the same name. Usernames cannot be changed through profile writes or editable Auth metadata. Profile reads expose only the caller's own username; email lookup is granted only to `service_role`.
- Login submits the username and password over HTTPS to the Edge Function. It resolves the current confirmed email internally, verifies the password through Supabase Auth using a public key, and returns only session tokens. The browser installs those tokens with `auth.setSession`. Passwords are never added to profiles, study backups, or application storage, and the endpoint does not log credentials.
- Unknown names, unconfirmed accounts, and incorrect passwords return the same error. The endpoint also verifies unknown-name attempts through Auth with a random nonexistent email. Database-backed limits allow 10 attempts per normalized username and 1,000 total endpoint attempts per fixed 15-minute window; both successful and failed attempts count. The global cap bounds work and counter growth from random names. Review these limits for your traffic before a larger launch. Supabase Auth's own limits also apply. Counters older than one day are removed during subsequent requests.
- Signups and email recovery use Supabase's native endpoints and limits. Registration still needs an email address for confirmation/recovery. The email-link fallback sets `shouldCreateUser: false`, so it cannot accidentally create a second account.
- Password recovery opens the password form only after establishing a session. The recovery marker survives reload until a password is saved or the user signs out. Users who already have a session can also set/change their password from Account. Expired links report an error and allow a fresh request.
- The application retains email and username inputs in memory on form errors, clears password inputs after submission, and leaves existing browser progress untouched by account operations.


## Data and access model

Supabase Auth owns users and sessions. `public.study_backups` contains one row per `auth.users.id`, deleted automatically if that Auth user is deleted:

| Field | Purpose |
| --- | --- |
| `user_id` | Primary key and owner; foreign key to Supabase Auth |
| `schema_version` | Snapshot format, currently `1` |
| `payload` | Saved reaction IDs, quiz attempts/sessions, flashcard reviews, and study preferences |
| `revision` | Increasing revision used to reject stale saves |
| `updated_at` | Server timestamp shown on the Account page |

Anonymous users have no table access. Authenticated users can select, insert, or update only their own row. The `save_study_backup` function runs with the caller's permissions, derives the owner from `auth.uid()`, and requires the expected revision. A save with revision `0` creates a row only if none exists; other revisions update only a matching existing row. A conflict forces the user to refresh before deciding to overwrite the cloud copy. Direct writes are also protected by RLS; revision conflict handling is the supported adapter's protocol, not an authorization boundary against an owner modifying their own data.

The database checks the payload envelope and a roughly 2 MB size limit. The client additionally validates individual fields, rejects unsupported schema versions, strips unknown fields, and normalizes catalog IDs before saving or restoring. Existing local progress keeps its current storage key. Backup timestamps come from the server; individual study timestamps still come from the browser and should not be trusted for competitive scoring.

## Backup behavior

- Sign-in does not upload guest data or replace browser progress. Users explicitly choose Back up this browser or Restore cloud backup.
- Backups replace the entire cloud snapshot. Restores preview counts and require a second action before replacing browser progress. There is no automatic merge or background sync.
- Restores first save the current local state under `catalyst-progress-v1-before-restore`. If either browser storage write fails, the live state is left unchanged. The recovery slot is overwritten by the next restore. To recover manually, copy that local-storage value to `catalyst-progress-v1` through browser developer tools, then reload.
- A failed network request leaves local progress intact. Refresh cloud details after an uncertain save outcome, then retry. Buttons stay disabled while a request is in flight. Account changes invalidate loaded backup metadata and in-flight responses.
- Signing out ends this device's Supabase session. Study data stays in this browser and is visible to subsequent users of the same browser profile. There are no per-account local caches yet; explicitly choosing Back up this browser can upload that browser's progress to the current account.
- Restores filter IDs absent from the current catalog. Use the same site release across devices. Large histories that exceed the snapshot limit need a future normalized data model.

## Verification

Serve the repository and open [the backend test runner](../tests/backend.html). It tests the adapter with a fake Supabase client, including sign-in options, account changes during requests, failed initialization/retry, and snapshot validation. It also executes the migration against an in-memory PostgreSQL runtime (PGlite, downloaded for tests only), with a small Auth schema fixture, and checks RLS, revision conflicts, and cascading deletion. The suite also verifies username reservation and rollback, RLS, one-time claims, metadata independence, lookup permissions, throttling, and cascade deletion. This is not a substitute for a live Supabase integration test.

Before enabling production accounts, test with two real users: email-link creation and expiry, persistence after reload, sign-out, private backups, conflicting saves from two browsers, restoring all study preferences, and network/storage failures. Confirm one user's JWT cannot read or update the other user's backup through REST or RPC. Real Auth email delivery and a deployed database are not exercised by local tests.

## Next backend capabilities

This foundation deliberately uses the app's existing progress model. Next steps are per-account local storage, explicit guest-progress import, and append-only practice events with client-generated IDs for automatic sync and deterministic merging. Bookmarks need deletion tombstones; preferences and flashcard ratings need a documented conflict rule. Derive progress summaries from events rather than trusting client-supplied scores. Username profiles remain separate from the study snapshot.

Keep privileged operations (account deletion, administrative catalog changes, private file access, or trusted scoring) in authenticated Edge Functions or another server. Validate the JWT and authorization on the server, and keep secret/service-role credentials there. The public catalog does not need to move into Postgres to support accounts.

Username API, Edge Function, recovery, and catalog regression tests (Node.js 22+):

```sh
node --test tests/auth.test.js tests/catalog.test.js
```

Browser authentication flows use an isolated browser and a fake Supabase SDK; no real user is created and no email is sent:

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
python3 -m http.server 8765
# In another terminal:
python3 tests/auth-browser.py
```

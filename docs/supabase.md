# Supabase accounts and backend foundation

The first backend feature is email-link accounts with private, manual study backups. The static reaction and reagent catalog stays in the site assets. Guests can keep studying without a connection, and the Supabase SDK loads only when someone connects an account or returns through a sign-in link.

## Connect a project

1. Create a Supabase project. Apply [the migration](../supabase/migrations/202610270001_accounts_and_backups.sql) once using the Supabase SQL editor or your Supabase CLI migration workflow. It creates the backup table, row-level security policies, and atomic save function.
2. Enable the Email authentication provider and allow new signups. Keep the default magic-link email template. Configure an SMTP provider for production email delivery; Supabase's built-in mail service has restrictions and rate limits.
3. Set Authentication → URL Configuration → Site URL to the deployed app URL. Add each exact callback URL to the redirect allowlist, including its path and `#account`, for example `https://your-site.example/index.html#account` and `http://localhost:8765/index.html#account`. If people visit `/` as well as `/index.html`, allow both. Avoid broad production wildcards.
4. Set `url` and `publishableKey` in [the browser configuration](../assets/supabase-config.js). Use the project URL and an `sb_publishable_…` key (a legacy `anon` key also works). Both values are public. Never put an `sb_secret_…` key, service-role key, database password, or SMTP credential in frontend assets.
5. Serve the site over HTTPS in production. For local development, run `python3 -m http.server 8765` and open `http://localhost:8765/index.html#account`. Accounts require an HTTP origin; opening the HTML file directly still supports guest study.
6. Select Account → Connect, request a sign-in link, and open it in the same browser profile that requested it. PKCE uses a browser-local verifier. On another device, request a separate link there.

No project is provisioned, migration applied, or email sent by this repository change. Empty configuration leaves accounts unavailable and makes no external requests. A configured account flow downloads the pinned Supabase JavaScript SDK from esm.sh and calls your Supabase project. Deployments with a Content Security Policy must permit those resources, or vendor the SDK and update the loader in [the backend adapter](../assets/backend.js).

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

Serve the repository and open [the backend test runner](../tests/backend.html). It tests the adapter with a fake Supabase client, including sign-in options, account changes during requests, failed initialization/retry, and snapshot validation. It also executes the migration against an in-memory PostgreSQL runtime (PGlite, downloaded for tests only), with a small Auth schema fixture, and checks RLS, revision conflicts, and cascading deletion. This is not a substitute for a live Supabase integration test.

Before enabling production accounts, test with two real users: email-link creation and expiry, persistence after reload, sign-out, private backups, conflicting saves from two browsers, restoring all study preferences, and network/storage failures. Confirm one user's JWT cannot read or update the other user's backup through REST or RPC. Real Auth email delivery and a deployed database are not exercised by local tests.

## Next backend capabilities

This foundation deliberately uses the app's existing progress model. Next steps are per-account local storage, explicit guest-progress import, and append-only practice events with client-generated IDs for automatic sync and deterministic merging. Bookmarks need deletion tombstones; preferences and flashcard ratings need a documented conflict rule. Derive progress summaries from events rather than trusting client-supplied scores. Add profiles only when there is a product need for names or preferences beyond the snapshot.

Keep privileged operations (account deletion, administrative catalog changes, private file access, or trusted scoring) in authenticated Edge Functions or another server. Validate the JWT and authorization on the server, and keep secret/service-role credentials there. The public catalog does not need to move into Postgres to support accounts.

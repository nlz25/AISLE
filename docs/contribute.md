# Contribute

GitHub Pages hosts the public Contribute page. The contributor and administrator
workspaces run on the Cloudflare Worker, which also serves their API. D1 stores
contributor profiles, sessions, task metadata and review history. Supabase Auth
handles GitHub sign-in and administrator authenticator codes. A private
Supabase Storage bucket holds the original Wet Lab ZIP archives.

New contributors use their verified contact email from GitHub and provide
their name and organization. Dry Lab contributors attach a GitHub pull request
URL. Wet Lab contributors upload a single non-empty ZIP, up to 25 MiB. The
Worker checks the ZIP envelope and stores it under a quarantine prefix. Task
ownership governs uploads and downloads. The scheduled job clears expired
sessions and OAuth attempts and removes abandoned or replaced packages.

The administrator workspace is at /contribute-admin.html. Reviewers sign in
with GitHub, then verify a six-digit code from an authenticator app. The Worker
requires an approved Supabase user ID and recent MFA verification for every
admin API call. Administrators can review submissions, download ZIPs, and
disable or enable contributor accounts. Account and review actions are audited.

## Local verification

From the repository root:

    make check
    npm ci --prefix services/contribute
    npm test --prefix services/contribute

The service test runs with local D1 and simulated Supabase Auth and Storage. It
covers OAuth callback binding and replay, account ownership, private ZIP
access, and administrator MFA.

## Production setup

1. In Cloudflare, create the production D1 database aisle-contribute. The
   deployment workflow applies migrations. For the standalone workspace, use
   the HTTPS origin https://aisle-contribute.<account-subdomain>.workers.dev.
   For the same-domain deployment, use the existing aisle.science API route
   behind Cloudflare and use https://aisle.science as the workspace origin.
2. Create a dedicated Supabase Free project. Under Storage, create a private
   bucket named aisle-contribute-private. Set its maximum object size to
   25 MiB (26,214,400 bytes) and allow application/zip. Keep the bucket private
   and leave client access policies empty. The Worker accesses it with a
   server-only Supabase secret key.
3. In GitHub Developer Settings, create an OAuth App. Its authorization
   callback URL is https://<project-ref>.supabase.co/auth/v1/callback.
   Enter that app's client ID and secret in the GitHub provider settings in
   Supabase Authentication. Enable GitHub as the project's only sign-in
   provider. Disable the Email provider and manual identity linking. Enable
   authenticator app MFA and use an asymmetric JWT signing key (ES256 or
   RS256) so the Worker can validate tokens via JWKS.
4. In Supabase Authentication URL Configuration, set the Site URL to the
   workspace origin and allow the exact <workspace-origin>/api/contribute/auth/callback
   redirect URL. The GitHub App callback in step 3 and the workspace callback
   here are separate URLs.
5. Create the GitHub Actions environment contribute-production and restrict
   deployment to main. Add a required reviewer if the repository supports
   that rule. Add these environment variables and secrets.

| GitHub environment variable | Value |
| --- | --- |
| CLOUDFLARE_ACCOUNT_ID | Project Cloudflare account ID |
| CLOUDFLARE_D1_DATABASE_ID | Production D1 database ID |
| CLOUDFLARE_WORKSPACE_ORIGIN | Standalone workers.dev origin, without a trailing slash. Leave empty for the aisle.science API route. |
| SUPABASE_URL | Project URL, https://<project-ref>.supabase.co |
| SUPABASE_PUBLISHABLE_KEY | Supabase sb_publishable_ key |
| ADMIN_USER_IDS | Comma-separated Supabase user UUIDs. An empty list keeps admin access closed during initial setup. |

| GitHub environment secret | Value |
| --- | --- |
| CLOUDFLARE_API_TOKEN | Project-scoped token for deploying the Worker and running D1 migrations. The same-domain option also needs Workers Routes Write in the aisle.science zone. |
| SUPABASE_STORAGE_SECRET | Supabase sb_secret_ key for the dedicated project |
| SESSION_ENCRYPTION_KEY | 32 random bytes encoded as 64 lowercase hexadecimal characters. Generate once with openssl rand -hex 32. |

Run **Deploy Contribute API** from main. On the workspace URL, verify GitHub
sign-in, profile completion and a harmless ZIP upload. Each reviewer signs in
with GitHub once. The Supabase project owner then confirms the corresponding
user in Authentication > Users and adds that user's ID to ADMIN_USER_IDS.
Redeploy, open the review workspace and complete authenticator enrollment.
Confirm that a normal account and an approved account before MFA are both
denied access to review data.

For a standalone deployment, set the repository Actions variable
CONTRIBUTE_WORKSPACE_ORIGIN to the verified workers.dev origin and run
**Build and deploy AISLE** from main. This switches the public contribution
links to the standalone workspace.

If upgrading a live email-login deployment, sign-in sessions are reissued
with GitHub. Link previously verified users to their Supabase IDs explicitly
before granting them access to existing tasks. A matching email alone does not
link an account. Copy any existing R2 objects into the new private bucket with
their keys preserved before deploying the new storage integration.

Supabase Free includes 1 GB file storage and a 50 MB upload limit. A free
project can pause after a week of inactivity.

[GitHub OAuth app creation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app) ·
[Supabase GitHub sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-github) ·
[Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa) ·
[Supabase private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals) ·
[Supabase pricing](https://supabase.com/pricing) ·
[Cloudflare CI deployment](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)

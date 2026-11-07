# Contribute

GitHub Pages hosts the public Contribute page. The contributor and administrator
workspaces can run directly on the Contribute Worker's workers.dev address.
Both workspaces call the API on their own origin. D1 holds verified contributor profiles, hashed login and
session tokens, task metadata and review history. A private R2 bucket holds the
original Wet Lab ZIP archives. The counter uses its existing independent Worker.

Contributors register with a contact email, name and organization. The Worker
checks Turnstile and sends a single-use link that expires after 15 minutes.
Redeeming it creates an eight-hour session. Returning users can request a link
with their email alone. Dry Lab contributors reference their task ID in a
GitHub pull request and attach its URL in the workspace. Wet Lab contributors
upload a single non-empty ZIP, up to 25 MiB. The archive is checked at the ZIP
envelope and stored under a quarantine prefix for later processing. Account and
task checks apply to uploads and downloads. The scheduled job clears expired
credentials and removes abandoned or replaced objects.

The review workspace is at /contribute-admin.html. It lists contributor profiles,
tasks and ZIP downloads. Reviewers can change submission status and disable or
enable accounts. Disabling an account revokes its active sessions and pending
sign-in links. The API checks the contributor session, the explicit reviewer
email list and the signed Cloudflare Access assertion for the same email. It
audits review status changes, user management and private downloads.

## Local verification

From the repository root:

    make check
    npm ci --prefix services/contribute
    npm test --prefix services/contribute

The service test runs the Worker with local D1 and R2. It substitutes external
mail delivery, the Turnstile verification response and Access signing keys so
that test credentials and archives stay local.

## Production setup

1. In the project Cloudflare account, create a production D1 database named
   aisle-contribute and a private R2 bucket named aisle-contribute-private.
   Keep R2 public access disabled. The deployment workflow applies migrations.
2. For the standalone workspace, use the account's workers.dev subdomain.
   The origin has the form https://aisle-contribute.<account-subdomain>.workers.dev.
   For the same-domain deployment, proxy aisle.science through the project's
   Cloudflare zone with valid GitHub Pages origin TLS and use the
   aisle.science/api/contribute/* Worker route.
3. Create a Turnstile widget for the chosen workspace hostname. Use an existing
   verified Resend sender or verify a sending domain and use a sender from it.
   Disable click tracking for the sending domain so the sign-in URL stays direct.
4. In Cloudflare Access, create one self-hosted application covering both
   /contribute-admin.html and /api/contribute/admin/* on the chosen workspace hostname.
   Allow the named reviewer emails and require independent MFA with WebAuthn
   security keys or passkeys. Use short Access sessions and limit application
   policies to the reviewers. Record the application's AUD and team domain.
5. Create the GitHub Actions environment contribute-production. Add a required
   reviewer and limit deployment to the main branch. Add the values below.

| GitHub environment variables | Value |
| --- | --- |
| CLOUDFLARE_ACCOUNT_ID | Project Cloudflare account ID |
| CLOUDFLARE_D1_DATABASE_ID | Production D1 database ID |
| CLOUDFLARE_WORKSPACE_ORIGIN | HTTPS workers.dev origin for the standalone workspace, with no trailing slash. Leave empty for the aisle.science API route. |
| ACCESS_TEAM_DOMAIN | Access team hostname, e.g. project.cloudflareaccess.com |
| ACCESS_AUD | AUD from the self-hosted Access application |
| ADMIN_EMAILS | Comma-separated reviewer emails matching the Access policy |
| MAIL_FROM | Verified sender, e.g. AISLE <login@notify.aisle.science> |
| TURNSTILE_SITE_KEY | Public site key for the widget |

| GitHub environment secrets | Value |
| --- | --- |
| CLOUDFLARE_API_TOKEN | Token scoped to the project account, with permission to create or edit the Worker and run D1 migrations. The same-domain option also needs Workers Routes Write in the aisle.science zone. |
| RESEND_API_KEY | Send-only key scoped to the sending domain |
| TURNSTILE_SECRET | Secret for the configured widget |

Run **Deploy Contribute API** from main once configuration is complete. The
workflow validates its settings, runs service tests, applies D1 migrations and
deploys the Worker. For a standalone deployment, it also packages the two
workspace pages with the Worker. The production smoke check is to request a real link, register
and submit a harmless ZIP, then open the reviewer workspace with the configured
MFA and verify that an unapproved account is denied.

After the standalone workspace passes the smoke check, set the **repository**
Actions variable CONTRIBUTE_WORKSPACE_ORIGIN to the same origin and run
**Build and deploy AISLE** from main. This switches the public contribution
links to the standalone workspace. Pages can then be rebuilt independently
of the Worker.

Cloudflare setup references:
[GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/),
[Workers static assets](https://developers.cloudflare.com/workers/static-assets/),
[Access for Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/),
[Worker routes](https://developers.cloudflare.com/workers/configuration/routing/routes/),
[Access application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/),
[Access MFA](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/mfa-requirements/).

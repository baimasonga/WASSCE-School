# Deploying the website to Cloudflare

The site is one Cloudflare Worker: it serves the React app as static assets and the `/api` routes, with a D1 database for progress and question packs. Sign-in uses the existing Supabase project (`wassce-lab`), which the Chemistry lab's class features already use. Cloudflare's free plan is enough to start.

You need a Cloudflare account and a computer with Node.js 22 or newer. Run every command inside the `web/` folder.

## 1. One-time setup

```sh
npm ci
npx wrangler login
npx wrangler d1 create wassce-school
```

`d1 create` prints a `database_id`. Paste it into `wrangler.jsonc`, replacing `00000000-0000-0000-0000-000000000000`, and commit that change (the id isn't secret).

In `wrangler.jsonc`, set `ADMIN_EMAILS` to the email address(es) of the accounts that may publish question packs, comma-separated, for example `"you@example.com"`. Each admin must create a normal account on the site with that email.

## 2. Deploy

```sh
npm run deploy
```

This builds the site, applies database migrations to the remote D1 database, and deploys the Worker. The first deploy prints your address, `https://wassce-school.<your-subdomain>.workers.dev`. Run the same command for every later update.

## 3. Tell Supabase about the new address

Sign-up confirmation and password-reset emails link back to the site, and Supabase only allows addresses you list. In the Supabase dashboard for the `wassce-lab` project, go to **Authentication → URL Configuration**:

- **Site URL:** your site's address, for example `https://wassce-school.<your-subdomain>.workers.dev` (or your own domain).
- **Redirect URLs:** add `https://<your-site>/**`.

Until this is done, sign-in works but confirmation and reset links point to the wrong place.

## 4. Optional: your own domain

In the Cloudflare dashboard: **Workers & Pages → wassce-school → Settings → Domains & Routes → Add → Custom domain**, for example `wassce.school` or `learn.example.org`. Then update the Supabase URLs from step 3 to the new domain.

## Deploying automatically from GitHub (optional)

Instead of running `npm run deploy` yourself, connect the repository in the Cloudflare dashboard: **Workers & Pages → wassce-school → Settings → Build → Connect** to `baimasonga/WASSCE-School`, with:

- **Root directory:** `web`
- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler d1 migrations apply DB --remote && npx wrangler deploy`

Every push to `main` then deploys. The **Website** GitHub Actions workflow typechecks, tests and builds the site on every pull request.

## Local development

```sh
npm ci
npm run db:migrate:local
npm run dev        # http://localhost:5173, with the real Worker runtime and a local D1 database
npm test           # API and learning-logic tests
```

To test publishing locally, create `web/.dev.vars` (ignored by git) with `ADMIN_EMAILS=you@example.com`.

## Configuration reference

| Setting | Where | Purpose |
|---|---|---|
| `SUPABASE_URL` | `wrangler.jsonc` vars | Supabase project whose sign-in tokens the API accepts. |
| `ADMIN_EMAILS` | `wrangler.jsonc` vars | Comma-separated emails allowed to publish packs. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | build environment (optional) | Override the Supabase project used by the browser app (defaults in `src/config.ts`). |
| Supabase URL in `public/_headers` | file | The Content-Security-Policy allows the browser to talk to this Supabase project. Update it if the project changes. |

No secrets are needed: the API verifies Supabase sign-in tokens with Supabase's public keys.

# CMS login service — one-time setup

The editor at https://darwin1942.com/admin/ (Decap CMS) saves releases directly into this GitHub
repository. GitHub needs a small "OAuth" login service to make that safe; this folder is that service,
written for Cloudflare Workers (free tier is plenty). It takes about 15 minutes to set up once.

## 1. Create the GitHub OAuth App

GitHub → Settings → Developer settings → OAuth Apps → **New OAuth App**
(do this from the account that owns `t-heritage/darwin1942`, at
https://github.com/settings/applications/new)

| Field | Value |
|---|---|
| Application name | Darwin 1942 Media Release Editor |
| Homepage URL | https://darwin1942.com |
| Authorization callback URL | https://darwin1942-cms-auth.**YOUR-SUBDOMAIN**.workers.dev/callback |

Leave "Enable Device Flow" off. After creating it, copy the **Client ID** and generate a
**Client secret** (shown once).

You will know YOUR-SUBDOMAIN after step 2; you can come back and edit the callback URL then.

## 2. Deploy the Worker

From this folder:

```bash
cd _oauth-worker
npx wrangler login
npx wrangler deploy
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

`wrangler deploy` prints the Worker URL, e.g. `https://darwin1942-cms-auth.heritagefilms.workers.dev`.
Make sure the OAuth App's callback URL from step 1 is that URL plus `/callback`.

## 3. Point the editor at it

In `admin/config.yml`, replace the `base_url` placeholder with the Worker URL (no trailing slash),
commit and push.

## 4. Give the client access

The client signs in to the editor with a **GitHub account**. Invite that account as a collaborator
with *Write* access on `t-heritage/darwin1942` (repo → Settings → Collaborators). They accept the
invitation, then go to https://darwin1942.com/admin/ and click "Login with GitHub".

## Testing locally

Run the site with `python3 -m http.server 8765` won't work for the CMS (Jekyll is needed). To test the
editor against a local build add `http://localhost:4000` to `ALLOWED_ORIGINS` in `wrangler.toml`,
redeploy, and open http://localhost:4000/admin/ from `bundle exec jekyll serve`.

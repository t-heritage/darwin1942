/**
 * GitHub OAuth handler for Decap CMS, as a Cloudflare Worker.
 *
 * Decap CMS running at https://darwin1942.com/admin/ opens a popup at <this worker>/auth.
 * We send the user to GitHub to log in, GitHub sends them back to /callback with a code,
 * we swap the code for a token (using the OAuth App secret, which never reaches the browser),
 * and hand the token back to the CMS window with postMessage.
 *
 * Secrets (set with `npx wrangler secret put <NAME>`):
 *   GITHUB_CLIENT_ID      from the GitHub OAuth App
 *   GITHUB_CLIENT_SECRET  from the GitHub OAuth App
 * Vars (wrangler.toml):
 *   ALLOWED_ORIGINS       comma-separated origins allowed to receive the token
 */

const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/auth') {
      const state = crypto.randomUUID();
      const redirect = new URL(GITHUB_AUTHORIZE);
      redirect.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      redirect.searchParams.set('redirect_uri', `${url.origin}/callback`);
      // The repository is public, so public_repo is enough. Use "repo" if it is ever made private.
      redirect.searchParams.set('scope', url.searchParams.get('scope') || 'public_repo');
      redirect.searchParams.set('state', state);
      return new Response(null, {
        status: 302,
        headers: {
          Location: redirect.toString(),
          'Set-Cookie': `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
        },
      });
    }

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const cookieState = (request.headers.get('Cookie') || '').match(/oauth_state=([^;]+)/)?.[1];
      if (!code || !state || state !== cookieState) {
        return page('error', 'Login could not be verified. Please close this window and try again.', env);
      }
      const res = await fetch(GITHUB_TOKEN, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'darwin1942-cms-auth' },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: `${url.origin}/callback`,
        }),
      });
      const data = await res.json();
      if (!data.access_token) {
        return page('error', data.error_description || 'GitHub did not return a token.', env);
      }
      return page('success', { token: data.access_token, provider: 'github' }, env);
    }

    if (url.pathname === '/') {
      return new Response('Darwin 1942 CMS login service. Nothing to see here.', { status: 200 });
    }
    return new Response('Not found', { status: 404 });
  },
};

/** Popup page that hands the result back to the Decap CMS window and closes. */
function page(status, payload, env) {
  const allowed = (env.ALLOWED_ORIGINS || 'https://darwin1942.com').split(',').map((s) => s.trim());
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Signing in…</title></head>
<body style="font-family:Arial,sans-serif;padding:32px;color:#0b1c2c">
<p>${status === 'success' ? 'Signed in. You can close this window.' : 'Sign-in failed: ' + escapeHtml(String(payload))}</p>
<script>
(function () {
  var allowed = ${JSON.stringify(allowed)};
  function receive(e) {
    if (allowed.indexOf(e.origin) === -1) return;
    window.opener.postMessage(${JSON.stringify(message)}, e.origin);
    window.removeEventListener('message', receive, false);
    setTimeout(function () { window.close(); }, 300);
  }
  window.addEventListener('message', receive, false);
  if (window.opener) window.opener.postMessage('authorizing:github', '*');
})();
</script>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Set-Cookie': 'oauth_state=; Path=/; Max-Age=0' },
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

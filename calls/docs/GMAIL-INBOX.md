# Gmail inbox watcher — setup

What this does: an edge function (`d1942-gmail-sync`, Supabase project `nwchcduhlhhppvyhxbpo`)
watches one Gmail inbox, matches every email to a club in the call worksheet
by address, and stores it in table `d1942_emails`. Matched emails show up on
that club's overview page in the drawer, under "Inbox correspondence" — both
sides of the conversation (incoming and your outgoing replies).

It is already built and deployed, and a cron job is already running every 10
minutes (plus an hourly re-match pass). It currently does nothing because
three secrets are not set yet — until you set them, every run just returns
`{configured:false, missing:[...]}`. Nothing to undo, nothing broken: it is
simply idle.

## What you need to do

### 1. Choose the inbox

`darwin1942@darwin1942.com` is the natural choice (the team inbox). If that
mailbox is a **Google Workspace** account (not plain Gmail), your Workspace
admin may need to allow this app to connect to it — see the note at the
bottom.

### 2. Create a Google Cloud OAuth client

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create
   a project (or reuse an existing one — the same one used for
   `GA4_SERVICE_ACCOUNT` in `d1942-calls-sync` is fine, or a fresh one, your
   call).
2. **APIs & Services → Library** → search "Gmail API" → **Enable**.
3. **APIs & Services → OAuth consent screen**: set it up as **Internal** if
   this is a Workspace account (limits it to your org, no Google review
   needed), or **External** + **Testing** mode if it's a personal Gmail
   account (works fine for a single mailbox, no review needed as long as you
   stay in testing mode with your own account added as a test user).
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   Application type: **Desktop app**. Name it anything, e.g. "Darwin 1942
   inbox watcher". Save the **Client ID** and **Client secret** it gives you
   — these become `D1942_GMAIL_CLIENT_ID` and `D1942_GMAIL_CLIENT_SECRET`.

### 3. Get a refresh token

You need one login (as the `darwin1942@darwin1942.com` mailbox) that grants
read-only access and hands back a refresh token. The scope required is:

```
https://www.googleapis.com/auth/gmail.readonly
```

Easiest path — Google's OAuth Playground:

1. Go to [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground).
2. Click the gear icon (top right) → check **"Use your own OAuth
   credentials"** → paste in the Client ID and Client secret from step 2.
3. In the left panel, paste the scope above into the "Input your own scopes"
   box → **Authorize APIs**.
4. Sign in as `darwin1942@darwin1942.com` (or whichever mailbox you chose)
   and approve.
5. Back on the Playground, click **"Exchange authorization code for
   tokens"**. The **Refresh token** field is what you need — this is
   `D1942_GMAIL_REFRESH_TOKEN`. (The access token shown there expires in about
   an hour and is not needed; the function fetches its own from the refresh
   token on every run.)

If you'd rather not use the Playground, any OAuth2 "installed app" flow with
that scope works the same way — the Playground is just the fastest no-code
route.

### 4. Set the three secrets in Supabase

**Dashboard → Edge Functions → Secrets** (project `nwchcduhlhhppvyhxbpo`),
add:

- `D1942_GMAIL_CLIENT_ID`
- `D1942_GMAIL_CLIENT_SECRET`
- `D1942_GMAIL_REFRESH_TOKEN`

Optional but recommended: `D1942_GMAIL_SELF_ADDRESSES` — a comma-separated
list of every address the mailbox sends from (usually just
`darwin1942@darwin1942.com`, but add any alias it uses too). This tells the
watcher which side of a thread is "us" so outgoing replies are logged with
`direction: 'out'` instead of being treated as an incoming club email.

No redeploy needed — the function reads these from the environment on each
invocation.

### 5. Confirm it's live

Hit the status endpoint (from a terminal, or just open the URL — GET works):

```
curl "https://nwchcduhlhhppvyhxbpo.supabase.co/functions/v1/d1942-gmail-sync?action=status&secret=<the d1942 admin secret>"
```

You should get back `{"configured": true, "total": 0, ...}` instead of the
`configured: false` message. The **next** scheduled cron run (within 10
minutes) will then do the first backfill automatically — it pulls the last
60 days of mail (`newer_than:60d`), matches what it can, and stores
everything (even unmatched mail, so nothing is silently dropped). You can
also trigger it immediately yourself with `?action=sync` instead of
`?action=status` on the same curl command.

Check progress any time with `?action=status` — it reports total emails
stored, how many are matched to a club, and the last sync time / error if
any.

## How matching works

For every email, the watcher looks at all the from/to/cc addresses (minus
your own mailbox's addresses) and checks them in this order:
1. the club's primary email on file,
2. the decision maker's email from a call record,
3. any extra contact's email recorded on a call,
4. as a last resort, the sender's domain — only if that domain belongs to
   exactly one club and isn't a shared provider like gmail.com or
   outlook.com.

First match wins. Unmatched emails are still stored (so nothing is lost),
just without a club — they'll silently start showing up once a caller
records that address as a contact and the hourly re-match run picks it up
(`?action=rematch`, also runnable manually any time).

## Caveats

- **Gmail API quota** is not a concern at this volume — you'd need to be
  fetching tens of thousands of messages a day before quota becomes
  relevant; one mailbox with normal club correspondence is nowhere near
  that.
- **A club writing from a new address you haven't recorded** will show up in
  `d1942_emails` unmatched until someone adds that address as a contact on a
  call (or as the club's primary email). The hourly `rematch` run then
  attaches it retroactively — no email is ever lost, it's just unmatched
  until the address is known.
- **Workspace admin approval**: if `darwin1942@darwin1942.com` is on Google
  Workspace, some orgs restrict which third-party apps can be authorized.
  If step 3 fails with an admin-blocked error, your Workspace admin needs to
  either approve the OAuth client (Admin console → Security → API controls)
  or mark it as a trusted app.
- The watcher **never throws on a single bad message** — if one email fails
  to parse or store, it's logged and skipped, and the rest of the batch
  still goes through; the response includes an `errors` count/list so you
  can see if anything's being missed.

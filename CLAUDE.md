# Darwin 1942: rules for agents

darwin1942.com is the site for the Darwin 1942 documentary (Heritage Films). It's plain HTML. Jekyll
(GitHub Pages) only builds the media releases (`_releases/*.md`) and `/news-and-media/` (read from a
published Google Sheet, see `_config.yml`). Shared nav, footer and head are in `_includes/`.

## Deploying

- **Live:** pushing `main` to `t-heritage/darwin1942` deploys darwin1942.com. Ask before pushing.
- **Staging:** `./scripts/deploy-staging.sh` publishes this working copy, committed or not, to
  https://t-heritage.github.io/ (no CNAME, noindex, no `/admin/`, a STAGING badge). Forms on staging
  still post to the live `darwin1942-intake` function, so a test entry sends a real team alert and
  lands in Customer.io.
- **Local:** the `d1942-static-8775` preview in `.claude/launch.json` serves the plain pages. Media
  releases and news-and-media need a Jekyll build to render properly, so check those on staging.

## The backend isn't in this repo

Everything server-side is a Supabase edge function in the shared project (see the parent CLAUDE.md).
Pull the live source before editing; edited copies are kept in `~/Desktop/claude/heritage-audit/live/`.

| Function | Used by |
| --- | --- |
| `darwin1942-intake` | Every website form: Get Involved, Register Interest, Subscribe, Contact, NSW Grant Quote. Writes Supabase, the Google Sheet, Customer.io, and sends the team alert (CIO transactional 75). |
| `d1942-calls-api` | Every action on the `/calls` worksheet (~115KB). |
| `d1942-calls-sync` | Every 5 minutes: pushes calls to the Google Sheet and Customer.io. |
| `d1942-calls-export` | The admin "Export to Excel" button on `/calls`. |
| `d1942-nurture-audit` | Daily check that wants-info contacts entered CIO campaign 297; posts to Slack. |

Memory has the detail and the traps: the calls backend, the CIO nurture trigger (never filter
campaign 297 on `emails`) and the intake alert.

## Pages worth knowing

- `calls/index.html`: the outbound call worksheet for RSL clubs. One big page. Hannah calls from it;
  Taylor's account is oversight-only. `?demo=admin` runs it with fake data and no backend.
  `calls/cards/` and `calls/classic/` are older layouts.
- `nsw-grant-quote.html`: builds a Heritage Films PDF quote in the browser (jsPDF), then records the
  request through intake.
- `/admin/`: a Decap CMS editor for media releases that would save straight to `main`. Its login
  worker (`_oauth-worker/`) was never deployed (`base_url` in `admin/config.yml` is still
  `REPLACE-ME`), so releases are added by hand in `_releases/`.
- `rsl/` is the project introduction deck; `rsl-packages/` is the old packages deck.

## Conventions

- Commit messages: `Area: what changed`, e.g. `Calls: skip sends clubs to the back of the queue`.
- The working tree sometimes holds unfinished work (check `git status`). Don't discard or commit
  changes you didn't make without asking.

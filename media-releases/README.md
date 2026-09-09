# Media releases — how they work

Releases are written in the online editor at **https://darwin1942.com/admin/** (Decap CMS).
No files need editing by hand.

## Adding a release (client)

1. Go to darwin1942.com/admin and click **Login with GitHub**.
2. Click **New Media Release**.
3. Fill in the headline, release date, a one-or-two-sentence summary, and paste the release text.
   The toolbar gives headings, bold, links, quotes and lists.
   Start the text from the first paragraph: "FOR IMMEDIATE RELEASE: date" and the headline are added
   by the website automatically, and the first paragraph is shown in bold.
4. Optionally upload the formatted PDF under **PDF version**.
5. Leave **Published** ticked and click **Publish**. The website updates within a couple of minutes.

To work on a release without showing it yet, untick **Published** before clicking Publish; it is
saved but hidden. Tick it again when the embargo lifts.

## Where things live

- Each release is a Markdown file in `/_releases/` named `YYYY-MM-DD-headline.md`.
- Uploaded PDFs and images go to `/media-releases/files/`.
- `/media-releases/` (this folder's `index.html`) lists every published release as an overview (date, headline, summary), newest first; the headline links to the full release.
- Each release also has its own page at `/media-releases/headline/` (the date is dropped from the address), with its own
  title and description for link previews.
- Page templates: `/_layouts/default.html`, `/_layouts/release.html`, `/_includes/`.
- Editor configuration: `/admin/config.yml`. Login service: `/_oauth-worker/` (one-time setup there).

Link for media emails: **darwin1942.com/media-releases**

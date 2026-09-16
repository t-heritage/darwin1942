# News and media — how the page works

`/news-and-media/` lists press coverage of Darwin 1942 and links out to each article.
The list is **not** edited in this repository. It is read, every time the page loads,
from a Google Sheet that the client maintains and publishes to the web as CSV.

The home page shows the same coverage in a slim **IN THE NEWS** row under the three
cards: the three most recent rows, each as a small picture, date, headline and
publication, with an ALL COVERAGE button through to this page. It reads the same
sheet, so adding a row to the sheet updates both pages at once and nothing on the home
page ever needs editing. If the sheet is empty or cannot be reached, the row stays
hidden and the home page looks as it did before.

Both pages share one script, `/assets/news-feed.js`, which fetches the sheet, reads the
columns, sorts newest first and picks the button word. The sheet address is written
into that file by Jekyll from `news_csv_url`, so it is still the only setting to change.

## One-time setup

1. Create a Google Sheet (call it something like *Darwin 1942 — News and Media*).
   `news-template.csv` in this folder is a ready-made starting point: in Sheets choose
   **File → Import → Upload** and pick it, replacing the current sheet.
2. **File → Share → Publish to web**.
   - Under the first dropdown pick the tab holding the news (not "Entire document").
   - Under the second dropdown pick **Comma-separated values (.csv)**.
   - Click **Publish** and copy the address it gives you. It looks like
     `https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=0&single=true&output=csv`
3. Paste that address into `news_csv_url` in `/_config.yml`, between the quotes, and commit.

Publishing to the web makes only that tab readable by anyone with the address; it does
not give anyone edit access, and it is separate from the sheet's normal sharing settings.

## Columns

The first row is the header. Column order does not matter and spare columns are ignored.

| Column        | Required | What it does |
|---------------|----------|--------------|
| `Date`        | no       | Shown on its own above the headline, and sorts the list (newest first). See **Dates** below. Rows with no date sit at the bottom. |
| `Title`       | **yes**  | The headline. A row with no title is skipped. |
| `Publication` | no       | The programme or masthead — *Afternoons with Michael McLaren*, *NT News*. Shown under the headline, in the case you type it. |
| `Summary`     | no       | A sentence or two describing the article. |
| `URL`         | no       | The article address. Makes the headline, image and button clickable. Must start with `https://`. |
| `Image`       | no       | A picture for the item. Either a full `https://` address, or a file uploaded to this site (see below). Leave blank for a text-only item. |
| `Type`        | no       | What kind of coverage it is — *Radio interview*, *Podcast*, *Television feature*, *Article*. Not shown on the page; it only decides what the button says. See **Type and the button** below. |
| `Show`        | no       | Type `no` to hide a row without deleting it. Anything else (or blank) shows it. |

## How an item is laid out

    [picture]   14 SEPTEMBER 2026                          <- Date
                85 YEARS ON — WHY A DOCUMENTARY MAKER      <- Title
                IS AFTER VETERAN STORIES
                Afternoons with Michael McLaren            <- Publication
                A sentence or two about the item.          <- Summary
                [ LISTEN ]                                 <- from Type

`Type` is the one column that is never printed on the page. It works behind the scenes,
choosing the button word, so you can write it however suits you without worrying how it
will look.

## Type and the button

The button under each item says how to take the item in, so a radio spot does not
invite the reader to "read" it. The word comes from the `Type` column:

| If `Type` contains | Button reads |
|--------------------|--------------|
| radio, podcast, audio, listen, on air | LISTEN |
| TV, television, video, watch, segment, footage, YouTube | WATCH |
| anything else, or left blank | READ |

Write it however reads naturally — *Radio interview*, *Podcast episode*, *Online
article*, *TV segment* all work, because the column is matched on those words rather
than an exact list. One thing to know: a word that could go either way is not enough on
its own. *Broadcast* alone reads as READ; write *Radio broadcast* or *TV broadcast*.

## Dates

A date like `3/6/2026` means 6 March in a US-locale sheet and 3 June to an Australian
reading it, and a published sheet does not say which it meant. The page works it out
from the column as a whole: if any row is unambiguous (a first number above 12, such as
`14/09/2026`) the whole column is read day-first; otherwise it is read the way Google
exports dates, month first.

That is reliable in practice but it is still a guess. To remove all doubt, either:

- set the sheet's locale to Australia (**File → Settings → Locale → Australia**) before
  entering dates, and keep every date in the same column format; or
- type dates as `2026-09-14` (year first). That form is never ambiguous and always wins.

A time after the date (`14/09/2026 14:32:00`) is ignored, so a column formatted as
date-and-time is fine.

## Images

Two ways:

- **Upload to the site** — put the file in `/media-releases/files/` (the same media
  library the release editor at `/admin/` uses) and put its path in the `Image` column,
  e.g. `/media-releases/files/nt-news-feb-2027.jpg`. This always works.
- **Link to the outlet's image** — paste the image's own `https://` address. Quicker,
  but some mastheads block other sites from loading their images. If that happens the
  item simply renders without a picture, so nothing breaks.

Pictures sit in a square, and the page works out how to fit each one:

- **A photograph** fills the square. Square pictures fit exactly; a wide press photo is
  cropped to the middle, so check the important part is central.
- **A logo on a transparent background** is placed whole on a panel of its own, never
  cropped — white behind a dark logo, Darwin 1942 blue behind a white one. That is
  worked out from the logo itself.

Reading a picture closely enough to tell those apart is something browsers only allow
for pictures **hosted on this site**. For one linked from an outlet's own server, the
page falls back to a sensible guess: a PNG or SVG, or anything much wider than it is
tall, is treated as a logo and given a white panel.

The practical upshot: **a white logo should be uploaded to the site** rather than linked
from elsewhere, otherwise it may land on a white panel and disappear. Dark logos and
photographs are fine either way.

## Notes

- Google caches a published sheet for a few minutes, so an edit takes up to about five
  minutes to appear. A hard refresh does not speed that up.
- Changing the sheet needs no deploy. Changing `news_csv_url` does.
- If the sheet is unreachable the page shows a short "temporarily unavailable" note
  rather than an error.
- Page template: `/news-and-media/index.html`. Styles: `/_includes/site-head.html`
  (search for `NEWS AND MEDIA`).

Official announcements written by the production team belong in **media releases**
(`/media-releases/`, edited at `/admin/`), not here. This page is for coverage by others.

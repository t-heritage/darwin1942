# Media releases — how to publish one

The page at https://darwin1942.com/media-releases/ is driven by `releases.json` in this folder.
Nothing else needs editing.

1. Export the release as a PDF and name it `YYYY-MM-DD-short-title.pdf` (lowercase, hyphens, no spaces),
   e.g. `2026-09-15-darwin-1942-production-announced.pdf`.
2. Copy the PDF into `media-releases/files/`.
3. Add an entry to the **top** of `releases.json`:

   ```json
   {
     "date": "2026-09-15",
     "title": "Darwin 1942 documentary announced for 85th anniversary",
     "summary": "One or two sentences that appear under the title on the page.",
     "file": "files/2026-09-15-darwin-1942-production-announced.pdf"
   }
   ```

   Entries are separated by commas inside the square brackets. `summary` is optional.
   The page sorts by `date` (newest first) and shows the date as e.g. "15 September 2026".
4. Commit and push to `main`. GitHub Pages redeploys in a minute or two.

Link to use in media emails: **darwin1942.com/media-releases**
(this redirects to the /media-releases/ page). Individual PDFs can be linked directly, e.g.
https://darwin1942.com/media-releases/files/2026-09-15-darwin-1942-production-announced.pdf

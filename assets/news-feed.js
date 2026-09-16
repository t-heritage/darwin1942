---
# Front matter (kept empty on purpose) so Jekyll fills in the sheet address below
# from `news_csv_url` in /_config.yml. Everything else in this file is plain JavaScript.
---
/* Darwin 1942 — news and media feed.

   One copy of the code that turns the client's Google Sheet into a list of coverage
   items, shared by /news-and-media/ (the full list) and the home page (the latest
   three). The sheet is published to the web as CSV; its address is the single key
   `news_csv_url` in /_config.yml and is written into this file at build time.

   Usage:  DarwinNews.load().then(function (items) { ... })
   Each item: { date (Date|null), dateLabel, title, publication, summary, url, image,
                type, cta ('READ' | 'LISTEN' | 'WATCH') }, newest first, hidden rows
   and title-less rows already dropped. The promise rejects if the sheet cannot be
   fetched or has no Title column; it resolves to [] when the sheet is empty or no
   address has been configured.

   DarwinNews.groundFor(img, src) is also exported: it works out whether a picture is
   a photograph or a logo and, for a logo, adds `on-white` / `on-blue` to the <img>
   so the page can give it a ground it will show up on. */
(function () {
  var CSV_URL = {{ site.news_csv_url | default: "" | jsonify }};

  /* --- CSV parsing (RFC 4180: quoted fields may contain commas and newlines) --- */
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    var rows = [], row = [], field = '', inQuotes = false, i = 0;
    while (i < text.length) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ',') { row.push(field); field = ''; i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += c; i++;
    }
    row.push(field);
    rows.push(row);
    return rows.filter(function (r) { return r.some(function (v) { return v.trim() !== ''; }); });
  }

  /* Header names are matched loosely, so "Article Title" and "title" both work. */
  function key(s) { return String(s).toLowerCase().replace(/[^a-z]/g, ''); }

  var FIELDS = {
    date: ['date', 'published', 'publisheddate'],
    title: ['title', 'headline', 'articletitle'],
    publication: ['publication', 'outlet', 'source', 'subheading', 'subtitle'],
    summary: ['summary', 'description', 'excerpt', 'intro', 'blurb'],
    url: ['url', 'link', 'articleurl', 'articlelink'],
    image: ['image', 'imageurl', 'photo', 'thumbnail'],
    type: ['type', 'format', 'medium', 'kind'],
    show: ['show', 'live', 'visible', 'publish']
  };

  function mapHeader(headerRow) {
    var map = {};
    headerRow.forEach(function (h, idx) {
      var k = key(h);
      Object.keys(FIELDS).forEach(function (field) {
        if (map[field] === undefined && FIELDS[field].indexOf(k) !== -1) map[field] = idx;
      });
    });
    return map;
  }

  /* The button says how to take the item in, and nothing more — one word, in the
     quiet register the rest of the site uses. The free-text Type column the client
     fills in is matched on keywords; anything unrecognised, blank column included,
     reads as something to read, which is the common case. */
  var CTA_RULES = [
    { label: 'LISTEN', words: ['radio', 'podcast', 'audio', 'listen', 'on air', 'on-air'] },
    { label: 'WATCH', words: ['tv', 'television', 'video', 'watch', 'segment', 'footage', 'youtube'] }
  ];

  function ctaLabel(rawType) {
    var t = (rawType || '').toLowerCase();
    for (var i = 0; i < CTA_RULES.length; i++) {
      for (var j = 0; j < CTA_RULES[i].words.length; j++) {
        /* Word-boundary match so "tv" does not fire on "Advertiser". */
        if (new RegExp('(^|[^a-z])' + CTA_RULES[i].words[j] + '([^a-z]|$)').test(t)) {
          return CTA_RULES[i].label;
        }
      }
    }
    return 'READ';
  }

  /* Dates.
     A slash date is ambiguous on its own: 3/6/2026 is 6 March to Google (whose
     sheets default to a US locale and export dates that way) and 3 June to an
     Australian typing it by hand. Rather than guess per row, the whole file is
     scanned once for a row that can only be read one way — a first part above 12
     means day-first, a second part above 12 means month-first — and that reading
     is then applied to every ambiguous row. With no such row anywhere, month-first
     is assumed, because that is what a published Google Sheet produces.
     ISO dates (2026-09-14) are never ambiguous and always win. */
  var SLASH = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/;

  function detectDayFirst(rawDates) {
    var dayFirstEvidence = false, monthFirstEvidence = false;
    rawDates.forEach(function (raw) {
      var m = String(raw || '').trim().match(SLASH);
      if (!m) return;
      if (+m[1] > 12) dayFirstEvidence = true;
      if (+m[2] > 12) monthFirstEvidence = true;
    });
    /* Contradictory evidence means the column is mixed; month-first matches the
       Google export, which is the far more likely source of the odd row out. */
    return dayFirstEvidence && !monthFirstEvidence;
  }

  function parseDate(raw, dayFirst) {
    var s = (raw || '').trim();
    if (!s) return null;

    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\b/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

    m = s.match(SLASH);
    if (m) {
      var a = +m[1], b = +m[2], y = +m[3];
      if (y < 100) y += 2000;
      var day, month;
      if (a > 12) { day = a; month = b; }
      else if (b > 12) { day = b; month = a; }
      else if (dayFirst) { day = a; month = b; }
      else { day = b; month = a; }
      return new Date(y, month - 1, day);
    }

    var d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

  function formatDate(d, raw) {
    if (!d) return (raw || '').trim();
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  /* Only http(s) links out, or a file on this site. Anything else is dropped so a
     stray value in the sheet can never turn into a javascript: link. */
  function safeUrl(raw) {
    var s = (raw || '').trim();
    if (!s) return '';
    if (/^\//.test(s)) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return '';
  }

  /* How a picture sits in its box depends on what kind of picture it is.
     A photograph fills the box. A logo supplied on a transparent background would
     otherwise vanish into the dark card, so it is fitted on a ground of its own
     instead: white behind dark artwork, the site blue behind white artwork.

     Telling them apart properly means reading the picture's pixels, which a browser
     only permits when the host allows a cross-origin read. Anything uploaded to this
     site always does; an outlet's own server often does not. Where the read is
     refused we fall back to the two things that can always be measured — the file
     type and the shape — and where even those say nothing, the picture is treated
     as a photograph. The probe is a separate image object throughout, so a refusal
     never stops the picture the reader actually sees from loading. */
  function groundFor(img, src) {
    /* Pixels are off-limits: judge by file type and proportions instead. A masthead
       is nearly always a PNG or SVG and much wider than it is tall. White is the
       safer ground of the two, most mastheads being dark artwork. */
    function fallback() {
      var ratio = (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 1;
      var flat = /\.(png|svg)(\?|#|$)/i.test(src);
      if (flat || ratio >= 2.5 || ratio <= 0.4) img.classList.add('on-white');
    }
    function fallbackWhenLoaded() {
      if (img.complete && img.naturalWidth) fallback();
      else img.addEventListener('load', fallback, { once: true });
    }

    var probe = new Image();
    probe.crossOrigin = 'anonymous';
    probe.onerror = fallbackWhenLoaded;
    probe.onload = function () {
      var size = 40, total = size * size;
      var clear = 0, lit = 0, luma = 0, px, i, alpha;
      try {
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(probe, 0, 0, size, size);
        px = ctx.getImageData(0, 0, size, size).data;
      } catch (e) {
        fallbackWhenLoaded();
        return;
      }
      for (i = 0; i < px.length; i += 4) {
        alpha = px[i + 3];
        if (alpha < 250) clear++;
        if (alpha > 16) {
          luma += (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
          lit++;
        }
      }
      /* A few soft edges are normal in a photograph; a logo is mostly open space. */
      if (!lit || clear / total < 0.12) return;
      img.classList.add(luma / lit > 0.6 ? 'on-blue' : 'on-white');
    };
    probe.src = src;
  }

  function toItems(rows) {
    if (rows.length < 2) return [];

    var map = mapHeader(rows[0]);
    if (map.title === undefined) throw new Error('no title column');

    function cell(r, field) {
      var idx = map[field];
      return idx === undefined ? '' : (r[idx] || '').trim();
    }

    var body = rows.slice(1);
    var dayFirst = detectDayFirst(body.map(function (r) { return cell(r, 'date'); }));

    var items = body.map(function (r, i) {
      function get(field) { return cell(r, field); }
      var d = parseDate(get('date'), dayFirst);
      return {
        order: i,
        show: get('show'),
        date: d,
        dateLabel: formatDate(d, get('date')),
        title: get('title'),
        publication: get('publication'),
        summary: get('summary'),
        url: safeUrl(get('url')),
        image: safeUrl(get('image')),
        type: get('type'),
        cta: ctaLabel(get('type'))
      };
    }).filter(function (it) {
      if (!it.title) return false;
      var s = it.show.toLowerCase();
      return !(s === 'no' || s === 'false' || s === 'n' || s === '0' || s === 'hidden' || s === 'draft');
    });

    /* Newest first; anything without a usable date keeps its sheet order at the end. */
    items.sort(function (a, b) {
      if (a.date && b.date) return b.date - a.date;
      if (a.date) return -1;
      if (b.date) return 1;
      return a.order - b.order;
    });

    return items;
  }

  /* Google caches a published sheet for a few minutes, so edits are not instant. */
  function load() {
    if (!CSV_URL) return Promise.resolve([]);
    return fetch(CSV_URL, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (text) { return toItems(parseCSV(text)); });
  }

  window.DarwinNews = {
    configured: !!CSV_URL,
    load: load,
    groundFor: groundFor
  };
})();

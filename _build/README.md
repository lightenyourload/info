# _build

Tools for building things from the site. Folders starting with `_` are not published by GitHub Pages.

## pdf/ — the printable A5 guide booklet

Rebuilds `LightenYourLoad-ProduceGuides-AU-Oct2026.pdf` from the live guide pages, so the PDF always matches the website.

```
python3 _build/pdf/build.py
```

Run it from the repo root after any change to the Dirty Dozen AU, Tread Carefully or Fill Your Basket pages, then commit the new PDF.

| File | What it is |
|---|---|
| `build.py` | The build: prints the three guides to A5, adds the cover, page numbers and the "About the data" note |
| `a5.css` | Print tweaks for A5 (margins, text sizes, spacing). Adjust here if the page count changes |
| `cover.html` | The cover page (page 1). Its contents list says p. 2 / 4 / 6, so the guides must stay 2 + 2 + 3 pages |
| `note.html` | The "About the data" box at the end of page 8 |

The script stops without touching the live PDF if the guides don't come out as 2 + 2 + 3 pages.

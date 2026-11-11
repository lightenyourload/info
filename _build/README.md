# _build

Tools for building things from the site. Folders starting with `_` are not published by GitHub Pages.

## pdf/ — the printable guide PDFs

Rebuilds, from the live guide pages, so the PDFs always match the website:

- `LightenYourLoad-ProduceGuides-AU-Oct2026.pdf` — the A5 booklet of all three guides (8 pages)
- `LightenYourLoad-DirtyDozenAU-A4.pdf`, `...TreadCarefully-A4.pdf`, `...FillYourBasket-A4.pdf` — one guide each, two A4 pages, no cover

```
python3 _build/pdf/build.py
```

Run it from the repo root after any change to the Dirty Dozen AU, Tread Carefully or Fill Your Basket pages, then commit the new PDF.

| File | What it is |
|---|---|
| `build.py` | The build: prints the three guides to A5, adds the cover, page numbers and the "About the data" note |
| `a4.css` | Print styles for the one-guide A4 PDFs (header, two columns, larger text). Each must stay at 2 pages |
| `a5.css` | Print tweaks for A5 (margins, text sizes, spacing). Adjust here if the page count changes |
| `cover.html` | The cover page (page 1). Its contents list says p. 2 / 4 / 6, so the guides must stay 2 + 2 + 3 pages |
| `note.html` | The "About the data" box at the end of page 8 |

The script stops without touching the live PDF if the guides don't come out as 2 + 2 + 3 pages.

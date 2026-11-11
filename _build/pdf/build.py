"""Rebuild the printable A5 guide booklet:
    LightenYourLoad-ProduceGuides-AU-Oct2026.pdf  (8 pages)

What it does
  1. Prints the three guide pages (Dirty Dozen AU, Tread Carefully, Fill Your Basket)
     to A5 with headless Chrome, using each page's own print styles plus a5.css.
  2. Prints the cover (cover.html) in front.
  3. Stamps "page N of 8" at the foot of each guide page.
  4. Adds the "About the data" note (note.html) under the last guide's content.

Run from the repo root:
    python3 _build/pdf/build.py

Needs: Python packages playwright, pypdf, pypdfium2, reportlab, numpy, pillow;
a Chrome/Chromium browser; and Node/npm (to fetch the site fonts once).
This folder starts with "_" so GitHub Pages doesn't publish it.

Page-count check: the cover's contents list (cover.html) says p. 2 / p. 4 / p. 6, so the guides
must come out as 2 + 2 + 3 pages. The script stops if they don't; tweak a5.css
(spacing or text sizes) until they do.
"""
import asyncio, base64, io, os, shutil, subprocess, sys, tempfile, threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import numpy as np
import pypdf
import pypdfium2
from playwright.async_api import async_playwright
from reportlab.pdfgen import canvas

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'LightenYourLoad-ProduceGuides-AU-Oct2026.pdf')
GUIDES = ['dirty-dozen', 'tread-carefully', 'fill-your-basket']
EXPECTED_PAGES = [2, 2, 3]
SCALE = 0.72          # print the A4-designed print styles down onto A5
TOTAL = 8
PORT = 8799


def find_chrome():
    for c in [os.environ.get('CHROME'), shutil.which('google-chrome'), shutil.which('chromium'),
              shutil.which('chromium-browser'),
              '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']:
        if c and os.path.exists(c):
            return c
    return None  # fall back to Playwright's own Chromium


def font_css():
    """Site fonts embedded as data URIs, so printing never depends on Google Fonts loading."""
    cache = os.path.join(tempfile.gettempdir(), 'lyl-fonts')
    base = os.path.join(cache, 'node_modules', '@fontsource')
    if not os.path.isdir(base):
        os.makedirs(cache, exist_ok=True)
        subprocess.run('npm init -y >/dev/null && npm i -s @fontsource/dm-sans @fontsource/dm-mono '
                       '@fontsource/playfair-display', shell=True, cwd=cache, check=True)
    faces = [('DM Sans', 'dm-sans', [(300, 'normal'), (400, 'normal'), (400, 'italic'), (500, 'normal'),
                                     (600, 'normal'), (700, 'normal')]),
             ('Playfair Display', 'playfair-display', [(400, 'normal'), (400, 'italic'), (700, 'normal'),
                                                       (700, 'italic'), (900, 'normal'), (900, 'italic')]),
             ('DM Mono', 'dm-mono', [(400, 'normal'), (500, 'normal')])]
    css = ''
    for fam, d, variants in faces:
        for w, st in variants:
            data = open(f'{base}/{d}/files/{d}-latin-{w}-{st}.woff2', 'rb').read()
            css += (f"@font-face{{font-family:'{fam}';font-style:{st};font-weight:{w};"
                    f"src:url(data:font/woff2;base64,{base64.b64encode(data).decode()}) format('woff2');}}\n")
    return css


def serve_site():
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    handler = partial(Quiet, directory=ROOT)
    srv = ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def content_bottom(pdf_path):
    """Lowest inked point (in points from the top) on the last page of a PDF."""
    doc = pypdfium2.PdfDocument(pdf_path)
    img = np.array(doc[len(doc) - 1].render(scale=1).to_pil().convert('L'))
    rows = np.where((img < 245).sum(axis=1) > 0)[0]
    return int(rows.max()) if len(rows) else 0


async def render(tmp, fonts):
    a5 = open(os.path.join(HERE, 'a5.css')).read()
    async with async_playwright() as p:
        chrome = find_chrome()
        browser = await (p.chromium.launch(executable_path=chrome) if chrome else p.chromium.launch())
        page = await browser.new_page()

        async def give_fonts(route):
            await route.fulfill(status=200, content_type='text/css', body=fonts)

        async def block(route):
            await route.abort()

        await page.route('https://fonts.googleapis.com/**', give_fonts)
        await page.route('https://www.googletagmanager.com/**', block)
        await page.route('https://www.google-analytics.com/**', block)

        for g in GUIDES:
            await page.goto(f'http://127.0.0.1:{PORT}/{g}.html', wait_until='networkidle')
            await page.add_style_tag(content=a5)
            await page.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager')")
            await page.evaluate('document.fonts.ready')
            await page.wait_for_timeout(800)
            await page.pdf(path=os.path.join(tmp, f'{g}.pdf'), format='A5', print_background=True,
                           scale=SCALE, prefer_css_page_size=True)

        # Cover (page 1)
        await page.goto('file://' + os.path.join(HERE, 'cover.html'))
        await page.evaluate('document.fonts.ready')
        await page.wait_for_timeout(300)
        await page.pdf(path=os.path.join(tmp, 'cover.pdf'), format='A5', print_background=True,
                       prefer_css_page_size=True)

        # "About the data" note, placed just under the last guide's content
        top = content_bottom(os.path.join(tmp, GUIDES[-1] + '.pdf')) + 22
        await page.goto('file://' + os.path.join(HERE, 'note.html'))
        await page.add_style_tag(content=f'.box{{top:{top}pt}}')
        await page.evaluate('document.fonts.ready')
        await page.wait_for_timeout(300)
        await page.pdf(path=os.path.join(tmp, 'note.pdf'), format='A5', print_background=True,
                       prefer_css_page_size=True)
        await browser.close()
    return top


def stamp(n, w, h):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(w, h))
    c.setFont('Helvetica', 6.5)
    c.setFillColorRGB(0x73 / 255, 0x73 / 255, 0x73 / 255)
    c.drawCentredString(w / 2, h - 578, f'Lighten Your Load · lightenyourload.info · page {n} of {TOTAL}')
    c.save()
    buf.seek(0)
    return pypdf.PdfReader(buf).pages[0]


def main():
    tmp = tempfile.mkdtemp(prefix='lyl-pdf-')
    srv = serve_site()
    try:
        top = asyncio.run(render(tmp, font_css()))
    finally:
        srv.shutdown()

    counts = [len(pypdf.PdfReader(os.path.join(tmp, g + '.pdf')).pages) for g in GUIDES]
    print('Guide pages:', dict(zip(GUIDES, counts)))
    if counts != EXPECTED_PAGES:
        sys.exit(f'Expected {EXPECTED_PAGES} pages so the cover contents stay right; got {counts}. '
                 'Adjust a5.css and run again. The live PDF was not changed.')
    if top > 470:
        print('Warning: little room left on the last page for the "About the data" note - check it.')

    out = pypdf.PdfWriter()
    out.add_page(pypdf.PdfReader(os.path.join(tmp, 'cover.pdf')).pages[0])
    n = 2
    for g in GUIDES:
        for pg in pypdf.PdfReader(os.path.join(tmp, g + '.pdf')).pages:
            pg.merge_page(stamp(n, float(pg.mediabox.width), float(pg.mediabox.height)))
            out.add_page(pg)
            n += 1
    out.pages[-1].merge_page(pypdf.PdfReader(os.path.join(tmp, 'note.pdf')).pages[0])
    out.add_metadata({'/Title': 'Lighten Your Load — Australian Produce Guides (A5)',
                      '/Author': 'Lighten Your Load'})
    out.write(OUT)
    shutil.rmtree(tmp, ignore_errors=True)
    print(f'Wrote {OUT} ({len(out.pages)} pages)')


if __name__ == '__main__':
    main()

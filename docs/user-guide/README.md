# Bengali user guide

The finished guide is at `output/pdf/Nivo-Bangla-Guide.pdf` (relative to the repository root). It has 58 A4 pages and 52 real application screenshots captured from a synthetic, disposable company. No customer database or private screenshots are used.

- `chapters.json`: editable Bengali chapter text.
- `images/`: synthetic screenshots for each chapter.
- `screenshots.json`: capture manifest.
- `index.html`: standalone rendered source with an embedded Bengali font and relative screenshot links.
- `FONT-LICENSE.txt`: Hind Siliguri copyright and SIL Open Font License.

To regenerate screenshots after building the Linux application:

```bash
node uitest/capture-user-guide.cjs
```

The capture script only creates databases under the OS temporary directory and runs an isolated profile. It exercises optional pages in that synthetic company. Its dated example fixture is for the October 2026 guide, not a time-independent CI accounting benchmark.

To rebuild the PDF, install the project's Playwright dependency and a Chromium browser. Provide a Bengali TTF through `NIVO_BENGALI_FONT` if the script cannot locate Hind Siliguri. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` may select a browser executable.

```bash
node scripts/build-user-guide.cjs
```

Chromium/HarfBuzz performs Bengali shaping. The builder checks page overflow and footer overlap before saving the tagged PDF with bookmarks. Render the final PDF and visually inspect every page after changing text, images or fonts. A generated PDF alone is not a visual QA pass.

# basecoat-factory

**Maintainer-only build source** for the platform assets bundled by
[`app-factory`](https://github.com/mikolaj92/app-factory): Basecoat UI, shared
`.app-*` shell CSS, Basecoat JavaScript, HTMX, Alpine.js and Material Symbols.
Application hosts install `app-factory[platform]`, not this package or CDN assets.
app-factory vendors `dist/` and serves it from `/static/platform/`.

This repo's package version is `0.3.0`, not the `basecoat-css` pin.

## Platform compatibility

[app-factory v0.6.12 COMPAT.md](https://github.com/mikolaj92/app-factory/blob/v0.6.12/COMPAT.md)
is the coordinated compatibility source at commit `b764a35aaa8a9d0d1cea034ef044baa9563c6244`.
The browser smoke installs Git tag `v0.6.12`.

| Component | Pin |
|-----------|-----|
| @patryk/basecoat-factory | `0.3.0` |
| app-factory | `v0.6.12` |
| my-auth | `v0.4.6` |
| my-usermanager | `v0.5.8` |
| basecoat-css | `1.0.2` |
| Tailwind CSS / CLI | `4.3.3` |
| HTMX | `2.0.10` |
| Alpine.js | `3.15.12` |

Host templates extend `app_factory/product_shell.html` and fill its `content` block.
The shell loads `basecoat-factory.min.css`, `basecoat-js.min.js`, `htmx.min.js`
and `alpine.min.js` from `/static/platform/`.
Do not copy shell, theme, locale, session, login, account or admin chrome into hosts.

## Build (maintainers only)

Use Node 22 and uv 0.11.20, matching CI.

```bash
uv run --with uvicorn --with "app-factory[platform] @ git+https://github.com/mikolaj92/app-factory@v0.6.12" python --version
npm ci
npx playwright install --with-deps chromium
npm test
```

`npm ci` installs Playwright; Chromium is installed separately before `chromium.launch`.
`pretest` also installs Chromium, without Linux system dependencies.
`npm test` runs the build, asset checks and browser smoke.
The build minifies `src/input.css`, copies pinned JavaScript and local Material
Symbols CSS, font and license, and creates the destination directories.
It does not write `dist/MANIFEST.json` or `dist/ATTRIBUTION.txt`;
these and the other licenses are hand-committed artifacts.

Tests check npm pins, the smoke app-factory pin, asset integrity and license notices;
they do not verify my-auth or my-usermanager pins.
Smoke serves only local `dist/` through StaticFiles, without an app-factory fallback.
Missing files and escaping symlinks return 404; missing `dist/` blocks startup.
Chromium checks login, account, admin, Alpine, HTMX, Basecoat, SRI and same-origin requests,
accepting HTTP 200 and cache revalidation with HTTP 304.

Commit generated `dist/` with source, lockfile and MANIFEST/notice updates for vendoring.

### Changing the shared shell

Edit `src/app-shell.css`, rebuild and refresh app-factory's vendored assets.
Consumers must not keep another `static/css/app-shell.css` or vendor the JS independently.

## Rozmiar

Patrz `make size` po buildzie.

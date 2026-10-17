# basecoat-factory

**Maintainer-only build source** for the platform assets bundled by
[`app-factory`](https://github.com/mikolaj92/app-factory). It produces:

1. Basecoat UI + the shared `.app-*` shell CSS
2. Basecoat component JavaScript
3. HTMX
4. Alpine.js

Application hosts do not install this package and do not link these files from a CDN.
They install `app-factory[platform]`, extend `app_factory/product_shell.html`, and let
app-factory serve every asset from `/static/platform/`.

This repo's package version is `0.3.0` (`package.json`; next git tag `v0.3.0`).
That identifier is **not** the `basecoat-css` pin (`1.0.2`). app-factory vendors the
built `dist/` files; it does not install `@patryk/basecoat-factory` as a runtime package.

## Platform compatibility

The preferred coordinated compatibility row below is verified against
[app-factory v0.6.12 COMPAT.md](https://github.com/mikolaj92/app-factory/blob/v0.6.12/COMPAT.md).
Source commit: `b764a35aaa8a9d0d1cea034ef044baa9563c6244`.
Preferred BOM: the row below. Tested browser smoke: published Git tag `v0.6.12`.

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

Host templates use the platform shell instead of copying chrome:

```html
{% extends "app_factory/product_shell.html" %}
{% block content %}…{% endblock %}
```

app-factory renders these same-origin assets:

```text
/static/platform/basecoat-factory.min.css
/static/platform/basecoat-js.min.js
/static/platform/htmx.min.js
/static/platform/alpine.min.js
```

Do not add host-local shell, theme, locale, session, login, account, or admin chrome.
Those surfaces and asset tags belong to app-factory's `product_shell` contract.

## Build (maintainers only)

Use Node 22 and uv 0.11.20, matching CI.

```bash
uv run --with uvicorn --with "app-factory[platform] @ git+https://github.com/mikolaj92/app-factory@v0.6.12" python --version
npm ci
npx playwright install --with-deps chromium
npm test
```

`npm ci` installs `playwright@1.55.0` from `devDependencies`; it does not
download the Chromium browser. The install step is the same command CI runs
before `npm test` (`.github/workflows/test.yml`). Without it, browser smoke
fails on `chromium.launch`.

`npm test` runs `npm run build` then `node --test`.

`build` minifies CSS from `src/input.css` and copies the pinned JS files from
`node_modules` into `dist/`. It does not write `dist/MANIFEST.json`,
`dist/ATTRIBUTION.txt`, or `dist/licenses/*`; those are hand-committed artifacts.

Tests compare the five npm pins in README with package and lockfile metadata
and the README app-factory pin with the smoke installation. They do not verify
my-auth or my-usermanager pins. They check generated CSS/JS against the committed
`dist/MANIFEST.json` and license notices, then run Chromium with SRI.
Smoke serves only local `dist/` at `/static/platform/` and compares response bytes.
Missing files return 404; missing `dist/` prevents startup. Symlinks cannot escape it.
After rebuilding CSS or changing JS pins, refresh MANIFEST hashes and notices by hand.

Commit generated `dist/` CSS/JS together with source, lockfile, and any
MANIFEST/notice updates; app-factory then vendors them into its package.

### Changing the shared shell

Edit `src/app-shell.css`, rebuild, and refresh the vendored assets in app-factory.
Consumer applications must not keep a second `static/css/app-shell.css` or vendor
Basecoat, HTMX, or Alpine independently.

## Rozmiar

Patrz `make size` po buildzie.

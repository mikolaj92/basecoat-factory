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

## Platform compatibility

The current app-factory COMPAT row is:

| Component | Pin |
|-----------|-----|
| app-factory | `v0.5.19` |
| my-auth | `v0.3.23` |
| my-usermanager | `v0.4.5` |
| basecoat-css / this asset bundle | `1.0.2` |
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

```bash
npm ci
npm test
```

`npm test` rebuilds `dist/` and verifies that all four runtime assets are present and
that their dependency versions match the COMPAT row. Commit generated `dist/` files
with source and lockfile changes; app-factory then vendors them into its package.

### Changing the shared shell

Edit `src/app-shell.css`, rebuild, and refresh the vendored assets in app-factory.
Consumer applications must not keep a second `static/css/app-shell.css` or vendor
Basecoat, HTMX, or Alpine independently.

## Rozmiar

Patrz `make size` po buildzie.

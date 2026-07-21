# basecoat-factory

**Jeden prebuilt CSS** dla apek Jinja/HTMX:

1. [Basecoat UI](https://basecoatui.com) — komponenty (`btn`, `card`, `sidebar`, …)
2. **Utility Tailwind** — tylko to, co jest w safelist / `src/apps/`
3. **App shell** — wspólny layout `.app-*` (sidebar + main, stack, card grid, auth page, …)

Repo: **https://github.com/mikolaj92/basecoat-factory** (public)

Aplikacje (**rnkstr**, **wolnyrolnik**, **emitype**, …) **nie potrzebują**:

- npm / Tailwind w apce
- lokalnego `app-shell.css` / `basecoat-full.css`

Tylko link z **jsDelivr**.

## Consumer

### jsDelivr — pinuj tag

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/mikolaj92/basecoat-factory@v0.2.0/dist/basecoat-factory.min.css"
/>
<script
  src="https://cdn.jsdelivr.net/gh/mikolaj92/basecoat-factory@v0.2.0/dist/basecoat-js.min.js"
  defer
></script>
```

| Plik | URL |
|------|-----|
| CSS | `https://cdn.jsdelivr.net/gh/mikolaj92/basecoat-factory@v0.2.0/dist/basecoat-factory.min.css` |
| JS | `https://cdn.jsdelivr.net/gh/mikolaj92/basecoat-factory@v0.2.0/dist/basecoat-js.min.js` |

Pinuj **`@v0.2.0`**, nie `@main`.

### Co jest w CSS

| Warstwa | Przykłady |
|---------|-----------|
| Basecoat | `btn`, `card`, `input`, `sidebar`, `dialog`, … |
| Utility (safelist) | `flex`, `gap-2`, `mt-4`, `text-sm`, `grid-cols-3`, … |
| App shell (wspólne) | `app-shell`, `app-main`, `app-stack`, `app-card-grid--3`, `app-nav-link`, `app-state-page`, … |

Alias layoutu: `factory-shell` / `factory-main` / `factory-stack` = te same reguły co `app-*` (opcjonalnie).

**W apce nie trzymaj** drugiego `static/css/app-shell.css` — będzie dublowanie.

## Build (tylko to repo)

```bash
npm install
make build
git add dist/ && git commit -m "build: refresh dist"
git tag v0.2.1 && git push origin main --tags
```

### Nowe utility w apkach

1. Dopisz klasę do `src/safelist.html` **albo** wrzuć HTML pod `src/apps/`.
2. `make build` → commit `dist/` + nowy tag.
3. W apkach bump pin + SRI.

### Zmiana layoutu shell

Edytuj `src/app-shell.css` (nie w rnkstr/wolnyrolnik).

## Co to NIE jest

- Nie cały Tailwind na CDN.
- Nie Play CDN (`cdn.tailwindcss.com`).
- Nie `make css` w każdej apce.

## Rozmiar

Patrz `make size` po buildzie.

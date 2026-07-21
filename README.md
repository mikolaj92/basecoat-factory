# basecoat-factory

**Jeden prebuilt CSS** = [Basecoat UI](https://basecoatui.com) (komponenty) + **używane** utility z Tailwind.

Aplikacje (rnkstr, wolnyrolnik, emitype, …) **nie potrzebują npm ani Tailwind**.  
Tylko link do pliku z `dist/`.

## Consumer (apki)

### Opcja A — raw z Gita (jsDelivr)

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/OWNER/basecoat-factory@v0.1.0/dist/basecoat-factory.min.css"
/>
<script
  src="https://cdn.jsdelivr.net/npm/basecoat-css@0.3.2/dist/js/all.min.js"
  defer
></script>
```

(Po pushu na GitHub podmień `OWNER` i tag.)

### Opcja B — kopia w apce

```bash
cp /path/to/basecoat-factory/dist/basecoat-factory.min.css static/css/
```

```html
<link rel="stylesheet" href="/static/css/basecoat-factory.min.css" />
```

JS Basecoat (sidebar, toast, …) nadal z CDN lub vendored:

```html
<script src="https://cdn.jsdelivr.net/npm/basecoat-css@0.3.2/dist/js/all.min.js" defer></script>
```

### Layout helpers (w tym pliku CSS)

| Klasa | Znaczenie |
|--------|-----------|
| `factory-shell` | root body layout |
| `factory-main` | kolumna treści obok sidebara |
| `factory-main-content` | scroll content |
| `factory-content` | max-width + padding |
| `factory-stack` / `factory-stack-sm` | pionowy stack |
| `factory-cluster` | flex wrap gap |
| `factory-page-header` | tytuł + akcje |

Plus standardowe Basecoat (`btn`, `card`, `input`, `sidebar`, …) i utility z safelist (`flex`, `gap-2`, `mt-4`, `text-sm`, …).

## Build (tylko to repo)

Wymaga Node **tylko tutaj** (nie w rnkstr/wolnyrolnik):

```bash
npm install
make build
```

Wynik: `dist/basecoat-factory.min.css` — **commituj do gita**.

### Nowe classy w apkach

1. Dopisz classę do `src/safelist.html` **albo** wrzuć HTML apki pod `src/apps/` i przebuduj.  
2. `make build`  
3. Commit `dist/` + tag `v0.1.x`

### Watch (opcjonalnie przy robocie nad kitem)

```bash
make watch
```

## Co to NIE jest

- Nie cały Tailwind na CDN (tylko classy ze skanu/safelist).  
- Nie Play CDN (`cdn.tailwindcss.com` — ~400 KiB JS).  
- Nie trzeba `make css` w każdej apce przy autoreload — `dist/` jest w gicie.

## Wersjonowanie

Semver na tagach: `v0.1.0`, `v0.2.0` przy breaking zmianach kitu.

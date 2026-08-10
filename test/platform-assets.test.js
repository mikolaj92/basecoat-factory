import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const copiedAssets = {
  "basecoat-js.min.js": "node_modules/basecoat-css/dist/js/all.min.js",
  "htmx.min.js": "node_modules/htmx.org/dist/htmx.min.js",
  "alpine.min.js": "node_modules/alpinejs/dist/cdn.min.js",
};

const canonicalCssIntegrity = "sha384-Ql0IeN0RoFWsNdPTaE7gRqcy4Q31OcomrvAonD+yA2Uaoe0d52T/qY+9OwWeoB8u";

const integrity = (content) => `sha384-${createHash("sha384").update(content).digest("base64")}`;

test("build matches the app-factory v0.5.19 vendoring contract", async () => {
  const manifest = JSON.parse(await readFile(new URL("../dist/MANIFEST.json", import.meta.url)));
  const css = await readFile(new URL("../dist/basecoat-factory.min.css", import.meta.url));
  assert.equal(integrity(css), canonicalCssIntegrity);
  assert.equal(manifest["basecoat-css"].integrity, canonicalCssIntegrity);

  for (const [filename, source] of Object.entries(copiedAssets)) {
    const generated = await readFile(new URL(`../dist/${filename}`, import.meta.url));
    const pinnedSource = await readFile(new URL(`../${source}`, import.meta.url));
    assert.deepEqual(generated, pinnedSource, `${filename} differs from ${source}`);
    const entry = Object.values(manifest).find((candidate) => candidate.filename === filename);
    assert.equal(entry.source, source);
    assert.equal(entry.integrity, integrity(generated));
  }
});

test("COMPAT pins match package and lock metadata", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url)));
  const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url)));
  const pins = {
    "@tailwindcss/cli": "4.3.3",
    tailwindcss: "4.3.3",
    "basecoat-css": "1.0.2",
    "htmx.org": "2.0.10",
    alpinejs: "3.15.12",
  };
  for (const [name, version] of Object.entries(pins)) {
    assert.equal(packageJson.devDependencies[name], version);
    assert.equal(lock.packages[`node_modules/${name}`].version, version);
  }
});

test("redistributed Alpine preserves its MIT notice", async () => {
  const notice = await readFile(new URL("../dist/licenses/alpine.LICENSE", import.meta.url), "utf8");
  assert.match(notice, /Copyright © 2019-2025 Caleb Porzio and contributors/);
  assert.match(notice, /Permission is hereby granted/);
});

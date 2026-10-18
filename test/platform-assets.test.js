import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const integrity = (content) => `sha384-${createHash("sha384").update(content).digest("base64")}`;

test("build matches the coordinated app-factory chrome contract", async () => {
  const copiedAssets = {
    "basecoat-js.min.js": "node_modules/basecoat-css/dist/js/all.min.js",
    "htmx.min.js": "node_modules/htmx.org/dist/htmx.min.js",
    "alpine.min.js": "node_modules/alpinejs/dist/cdn.min.js",
    "material-symbols.css": "src/material-symbols/material-symbols.css",
    "material-symbols-outlined.woff2": "src/material-symbols/material-symbols-outlined.woff2",
  };
  const manifest = JSON.parse(await readFile(new URL("../dist/MANIFEST.json", import.meta.url)));
  const css = await readFile(new URL("../dist/basecoat-factory.min.css", import.meta.url));
  assert.equal(manifest["basecoat-css"].filename, "basecoat-factory.min.css");
  assert.equal(integrity(css), manifest["basecoat-css"].integrity);
  for (const [filename, source] of Object.entries(copiedAssets)) {
    const generated = await readFile(new URL(`../dist/${filename}`, import.meta.url));
    const pinnedSource = await readFile(new URL(`../${source}`, import.meta.url));
    assert.deepEqual(generated, pinnedSource, `${filename} differs from ${source}`);
    const entry = Object.values(manifest).find((candidate) => candidate.filename === filename);
    assert.equal(entry.source, filename.startsWith("material-symbols") ? `${source} (app-factory v0.6.12)` : source);
    assert.equal(entry.integrity, integrity(generated));
  }
});

test("README npm pins match package and lock metadata; app-factory matches the smoke install pin", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url)));
  const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url)));
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const readmePins = new Map([...readme.matchAll(/^\| ([^|]+?) \| `([^`]+)` \|\s*$/gm)]
    .map(([, name, version]) => [name, version]));
  const pins = [
    ["@tailwindcss/cli", "Tailwind CSS / CLI", "4.3.3"],
    ["tailwindcss", "Tailwind CSS / CLI", "4.3.3"],
    ["basecoat-css", "basecoat-css", "1.0.2"],
    ["htmx.org", "HTMX", "2.0.10"],
    ["alpinejs", "Alpine.js", "3.15.12"],
  ];
  for (const [name, component, version] of pins) {
    assert.equal(readmePins.get(component), version, `README pin for ${component}`);
    assert.equal(packageJson.devDependencies[name], version);
    assert.equal(lock.packages[""].devDependencies[name], version);
    assert.equal(lock.packages[`node_modules/${name}`].version, version);
  }
  const smokePin = packageJson.scripts.test.match(/app-factory\[platform\] @ git\+https:\/\/github\.com\/mikolaj92\/app-factory@([^\s'"]+)/);
  assert.ok(smokePin, "npm test must install a pinned app-factory for browser smoke");
  assert.equal(readmePins.get("app-factory"), smokePin[1], "README app-factory pin must match the smoke install pin");
});

test("package version is this repo, not the basecoat-css pin", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url)));
  const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url)));
  assert.equal(packageJson.version, "0.3.0");
  assert.equal(lock.version, "0.3.0");
  assert.equal(lock.packages[""].version, "0.3.0");
  assert.notEqual(packageJson.version, packageJson.devDependencies["basecoat-css"]);
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  assert.match(readme, /package version is `0\.3\.0`/);
  assert.match(readme, /\| @patryk\/basecoat-factory \| `0\.3\.0` \|/);
  assert.match(readme, /\| basecoat-css \| `1\.0\.2` \|/);
});

test("redistributed licenses preserve their required notices and grants", async () => {
  const mitGrant = /Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files \(the "Software"\), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and\/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:/;
  const licenses = {
    "licenses/alpine.LICENSE": [
      /Copyright © 2019-2025 Caleb Porzio and contributors/,
      mitGrant,
    ],
    "licenses/basecoat-css.LICENSE": [
      /Copyright \(c\) 2025 Ronan Berder/,
      mitGrant,
    ],
    "licenses/htmx.LICENSE": [
      /Zero-Clause BSD/,
      /Permission to use, copy, modify, and\/or distribute this software for any purpose with or without fee is hereby granted\./,
    ],
    "licenses/material-symbols.LICENSE": [
      /Apache License Version 2\.0, January 2004/,
      /You must give any other recipients of the Work or Derivative Works a copy of this License/,
    ],
    "licenses/tailwindcss.LICENSE": [
      /Copyright \(c\) Tailwind Labs, Inc\./,
      mitGrant,
    ],
  };
  const attribution = await readFile(new URL("../dist/ATTRIBUTION.txt", import.meta.url), "utf8");
  const paths = [...attribution.matchAll(/^\s*License: (\S+)\s*$/gm)].map(([, path]) => path);
  assert.deepEqual(paths.sort(), Object.keys(licenses).sort());
  for (const path of paths) {
    const notice = await readFile(new URL(`../dist/${path}`, import.meta.url), "utf8");
    for (const fragment of licenses[path]) {
      assert.match(notice.replace(/\s+/g, " "), fragment, path);
    }
  }
});

test("README documents that MANIFEST and notices are hand-committed", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  assert.doesNotMatch(readme, /preserves third-party notices/);
  assert.match(readme, /does not write `dist\/MANIFEST\.json`/);
  assert.match(readme, /hand-committed artifacts/);
});

test("README installs Chromium before npm test, matching CI", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const workflow = await readFile(new URL("../.github/workflows/test.yml", import.meta.url), "utf8");
  const install = "npx playwright install --with-deps chromium";
  const ciOrder = /npm ci[\s\S]*npx playwright install --with-deps chromium[\s\S]*npm test/;
  const docsOrder = /npm ci\s*\nnpx playwright install --with-deps chromium\s*\nnpm test/;
  assert.match(workflow, ciOrder);
  assert.match(readme, docsOrder);
  assert.match(readme, /chromium\.launch/);
  assert.ok(readme.indexOf(install) < readme.indexOf("`npm test` runs"));
});

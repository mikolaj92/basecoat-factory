import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const assets = {
  "basecoat-factory.min.css": [100_000, ".app-shell"],
  "basecoat-js.min.js": [1_000, "window.basecoat"],
  "htmx.min.js": [10_000, "htmx"],
  "alpine.min.js": [10_000, "Alpine"],
};

test("build emits the complete same-origin platform asset set", async () => {
  for (const [filename, [minimumBytes, marker]] of Object.entries(assets)) {
    const content = await readFile(new URL(`../dist/${filename}`, import.meta.url));
    assert.ok(content.length > minimumBytes, `${filename} is unexpectedly small`);
    assert.match(content.toString(), new RegExp(marker.replace(".", "\\.")));
  }
});

test("runtime platform dependencies are exact COMPAT pins", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url)));
  assert.deepEqual(
    {
      "basecoat-css": packageJson.devDependencies["basecoat-css"],
      "htmx.org": packageJson.devDependencies["htmx.org"],
      alpinejs: packageJson.devDependencies.alpinejs,
    },
    { "basecoat-css": "1.0.2", "htmx.org": "2.0.10", alpinejs: "3.15.12" },
  );
});

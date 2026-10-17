import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { link, mkdtemp, readFile, rename, rmdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import test from "node:test";

const platformAssets = new Set([
  "basecoat-factory.min.css",
  "basecoat-js.min.js",
  "htmx.min.js",
  "alpine.min.js",
]);

async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  server.close();
  await once(server, "close");
  return port;
}

test("Chromium exercises app-factory product shell on platform surfaces", async (t) => {
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn("python", ["test/platform_app.py", "--port", String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => server.kill());

  let stderr = "";
  server.stderr.on("data", (chunk) => stderr += chunk);
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) assert.fail(`platform test server exited: ${stderr}`);
    try {
      if ((await fetch(`${origin}/health`)).ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (attempt === 99) assert.fail(`platform test server did not start: ${stderr}`);
  }

  for (const filename of platformAssets) {
    const response = await fetch(`${origin}/static/platform/${filename}`, { cache: "no-store" });
    assert.equal(response.status, 200, filename);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(new URL(`../dist/${filename}`, import.meta.url)), filename);
  }
  for (const path of ["missing.js", "..%2fREADME.md", "%2e%2e%2fREADME.md"]) {
    assert.equal((await fetch(`${origin}/static/platform/${path}`, { cache: "no-store" })).status, 404, path);
  }

  const alpine = new URL("../dist/alpine.min.js", import.meta.url);
  const alpineBytes = await readFile(alpine);
  const temporary = await mkdtemp(new URL("../.platform-smoke-", import.meta.url));
  const backup = join(temporary, "alpine.min.js");
  let moved = false;
  try {
    await rename(alpine, backup);
    moved = true;
    const response = await fetch(`${origin}/static/platform/alpine.min.js`, { cache: "no-store" });
    assert.equal(response.status, 404, "missing local Alpine must not fall back to app-factory");
  } finally {
    if (moved) {
      await link(backup, alpine);
      await unlink(backup);
    }
    await rmdir(temporary);
  }
  assert.deepEqual(await readFile(alpine), alpineBytes, "Alpine must be restored before browser interactions");

  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const browserRequests = [];
  const assetResponses = [];
  const browserErrors = [];
  page.on("request", (request) => browserRequests.push(request.url()));
  page.on("response", (response) => {
    if (platformAssets.has(new URL(response.url()).pathname.split("/").pop()))
      assetResponses.push(response.status());
  });
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto(`${origin}/login`);
  assert.equal(await page.locator('[data-surface="login"] h1').textContent(), "Login");
  assert.equal(await page.locator("#sidebar").count(), 0, "login should use the canonical bare shell");
  await page.getByRole("button", { name: "Continue with passkey" }).click();
  await page.getByText("Passkey ready").waitFor({ state: "visible" });

  await page.goto(`${origin}/account`);
  assert.equal(await page.locator('[data-surface="account"] h1').textContent(), "Account");
  assert.equal(await page.locator("#sidebar").count(), 1);
  assert.equal(await page.locator("[data-platform-account-link]").count(), 1);
  assert.equal(await page.locator("[data-platform-session]").count(), 1);
  assert.equal(await page.getByRole("button", { name: "Log out" }).count(), 1);

  await page.goto(`${origin}/admin`);
  assert.equal(await page.locator('[data-surface="admin"] h1').textContent(), "Admin users");
  assert.equal(await page.locator("#sidebar").count(), 1);
  assert.equal(await page.locator('[href="/admin"][aria-current="page"]').count(), 1);
  await page.getByRole("button", { name: "Load users" }).click();
  await page.getByText("Users ready").waitFor({ state: "visible" });

  const sidebarDisplay = await page.locator("#sidebar").evaluate((element) => getComputedStyle(element).display);
  assert.notEqual(sidebarDisplay, "inline", "platform shell CSS was not applied");
  assert.equal(await page.locator("#sidebar").evaluate((element) => typeof element.toggle), "function", "Basecoat sidebar behavior was not initialized");
  assert.equal(await page.evaluate(() => typeof window.htmx), "object");
  assert.equal(await page.evaluate(() => typeof window.Alpine), "object");

  for (const filename of platformAssets) {
    assert.ok(browserRequests.includes(`${origin}/static/platform/${filename}`), `${filename} was not requested from the production path`);
    const asset = page.locator(`[src="/static/platform/${filename}"], [href="/static/platform/${filename}"]`);
    assert.match(await asset.getAttribute("integrity"), /^sha384-\S+$/);
  }
  assert.ok(assetResponses.length >= platformAssets.size);
  assert.ok(assetResponses.every((status) => status === 200), "a local platform asset failed to load");
  assert.deepEqual(browserErrors, []);
  assert.ok(browserRequests.every((url) => new URL(url).origin === origin), "the canonical shell made a cross-origin request");
});

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
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
  const { link, mkdtemp, readFile, rename, rmdir, symlink, unlink } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn("python", ["test/platform_app.py", "--port", String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    if (server.exitCode === null && server.signalCode === null) {
      const exited = once(server, "exit");
      server.kill();
      await exited;
    }
  });

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
  for (const filename of [...platformAssets, "material-symbols.css", "material-symbols-outlined.woff2"]) {
    const url = `${origin}/static/platform/${filename}`;
    const response = await fetch(url, { cache: "no-store" });
    assert.equal(response.status, 200, `${url}: HTTP ${response.status}`);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(new URL(`../dist/${filename}`, import.meta.url)), `${url}: response differs from dist/${filename}`);
  }
  const probe = await mkdtemp(new URL("../dist/.platform-smoke-", import.meta.url));
  try {
    await symlink(new URL("../README.md", import.meta.url), join(probe, "outside.txt"));
    const url = `${origin}/static/platform/${probe.split("/").pop()}/outside.txt`;
    assert.equal((await fetch(url, { cache: "no-store" })).status, 404, url);
  } finally {
    await unlink(join(probe, "outside.txt"));
    await rmdir(probe);
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
      try {
        await link(backup, alpine);
        assert.deepEqual(await readFile(alpine), alpineBytes);
      } catch (cause) {
        throw new Error(`Could not restore Alpine; backup retained at ${backup}`, { cause });
      }
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
  const assetChecks = [];
  const browserErrors = [];
  page.on("request", (request) => browserRequests.push(request.url()));
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (response.status() >= 400) browserErrors.push(`${url.href}: HTTP ${response.status()}`);
    if (url.origin === origin && url.pathname.startsWith("/static/platform/")) {
      assetResponses.push(url.href);
      assetChecks.push((async () => {
        assert.ok([200, 304].includes(response.status()), `${url.href}: HTTP ${response.status()}`);
        if (response.status() === 200) {
          assert.deepEqual(await response.body(), await readFile(new URL(`../dist/${url.pathname.slice("/static/platform/".length)}`, import.meta.url)), `${url.href}: response differs from local dist`);
        }
      })().catch((error) => browserErrors.push(error.message)));
    }
  });
  page.on("requestfailed", (request) => browserErrors.push(`${request.url()}: ${request.failure()?.errorText}`));
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

  await page.goto(`${origin}/login`);
  await page.goto(`${origin}/account`);
  await page.goto(`${origin}/admin`);

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
  const usedFonts = await page.evaluate(async () => {
    const icons = [...document.querySelectorAll("*")].filter((element) =>
      element.getClientRects().length && getComputedStyle(element).fontFamily.includes("Material Symbols Outlined") && element.textContent.trim());
    for (const icon of icons) {
      const style = getComputedStyle(icon);
      const font = `${style.fontSize} ${style.fontFamily}`;
      const text = icon.textContent.trim();
      await document.fonts.load(font, text);
      if (!document.fonts.check(font, text)) throw new Error(`Font not loaded: ${font}, text: ${text}`);
    }
    await document.fonts.ready;
    return icons.length;
  });
  await Promise.all(assetChecks);
  assert.ok(assetResponses.includes(`${origin}/static/platform/material-symbols.css`), "Material Symbols CSS was not loaded by the shell");
  if (usedFonts) {
    assert.ok(assetResponses.includes(`${origin}/static/platform/material-symbols-outlined.woff2`), "Font used by the shell was not loaded");
  }
  assert.deepEqual(browserErrors, []);
  assert.ok(browserRequests.every((url) => new URL(url).origin === origin), "the canonical shell made a cross-origin request");
});

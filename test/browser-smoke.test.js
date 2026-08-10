import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { once } from "node:events";
import { chromium } from "playwright";
import test from "node:test";

const fixture = new URL("./smoke.html", import.meta.url);
const platformAssets = new Set([
  "basecoat-factory.min.css",
  "basecoat-js.min.js",
  "htmx.min.js",
  "alpine.min.js",
]);

test("Chromium exercises production-path assets on platform surfaces", async (t) => {
  const requests = [];
  const server = createServer(async (request, response) => {
    requests.push({ url: request.url, hx: request.headers["hx-request"] });

    if (request.url === "/smoke/fragment") {
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end("<p>HTMX ready</p>");
      return;
    }

    if (request.url?.startsWith("/static/platform/")) {
      const filename = request.url.slice("/static/platform/".length);
      if (!platformAssets.has(filename)) {
        response.writeHead(404).end();
        return;
      }
      response.setHeader("content-type", filename.endsWith(".css") ? "text/css" : "text/javascript");
      createReadStream(new URL(`../dist/${filename}`, import.meta.url)).pipe(response);
      return;
    }

    if (["/login", "/account", "/admin"].includes(request.url)) {
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(await readFile(fixture));
      return;
    }

    response.writeHead(404).end();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());

  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browserRequests = [];
  page.on("request", (request) => browserRequests.push(request.url()));

  for (const [path, title] of [["/login", "Login"], ["/account", "Account"], ["/admin", "Admin users"]]) {
    await page.goto(`${origin}${path}`);
    assert.equal(await page.locator("#surface-title").textContent(), title);
    for (const selector of ["#sidebar", "#app-main", "#app-main-header", "#main-content", "[data-sidebar-toggle]"])
      assert.equal(await page.locator(selector).count(), 1, `${path} is missing ${selector}`);
  }

  await page.locator("#alpine-toggle").click();
  await page.locator("#alpine-result").waitFor({ state: "visible" });
  await page.locator("#htmx-trigger").click();
  await page.locator("#htmx-result").getByText("HTMX ready").waitFor();

  for (const filename of platformAssets)
    assert.ok(requests.some(({ url }) => url === `/static/platform/${filename}`), `${filename} was not requested from the production path`);
  assert.ok(requests.some(({ url, hx }) => url === "/smoke/fragment" && hx === "true"), "HTMX did not issue its same-origin request");
  assert.ok(browserRequests.every((url) => new URL(url).origin === origin), "the fixture made a cross-origin request");
});

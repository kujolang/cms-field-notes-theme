import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getArticle, getPages } from "../lib/cms.ts";
import { linkTarget } from "../lib/presentation-url.ts";

const originalFetch = globalThis.fetch;
const originalBase = process.env.CMS_BASE_URL;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalBase === undefined) delete process.env.CMS_BASE_URL;
  else process.env.CMS_BASE_URL = originalBase;
});

test("delivery fetch uses one bounded request to the configured origin", async () => {
  process.env.CMS_BASE_URL = "https://cms.example.test";
  globalThis.fetch = async (url, options) => {
    assert.equal(url.origin, "https://cms.example.test");
    assert.equal(url.pathname, "/v1/entries");
    assert.equal(options.redirect, "manual");
    assert.ok(options.signal instanceof AbortSignal && !options.signal.aborted);
    assert.equal(options.headers.Authorization, undefined);
    return Response.json({ ok: true, data: { items: [], count: 0, total: 0 } });
  };
  assert.deepEqual(await getPages(), { items: [], count: 0, total: 0 });
});

test("only CMS 404 responses are treated as missing entries", async () => {
  globalThis.fetch = async () => new Response(null, { status: 404 });
  assert.equal(await getArticle("example"), null);
  globalThis.fetch = async () => new Response(null, { status: 502 });
  await assert.rejects(getArticle("example"), /failed with 502/);
});

test("delivery rejects declared oversized JSON before decoding it", async () => {
  globalThis.fetch = async () => new Response("{}", { headers: { "content-length": String(33 * 1024 * 1024) } });
  await assert.rejects(getPages(), /32 MiB size limit/);
});

test("Markdown keeps ordinary web, relative and contact links", () => {
  for (const url of ["/articles/example", "#resources", "https://example.test/", "mailto:readers@example.test", "tel:+15550123"]) {
    assert.equal(linkTarget(url), url);
  }
  assert.equal(linkTarget(""), null);
  assert.equal(linkTarget("ftp://example.test/"), null);
});

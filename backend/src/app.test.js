import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "./app.js";

const contentService = {
  async listPublic(resource) {
    return [{ id: "public-test-record", is_demo: true, resource }];
  },
  async getPublic(resource, id) {
    return { id, is_demo: true, resource };
  },
  async getPublicPage(slug) {
    return { page: { title: slug }, isDemo: true };
  },
};

const app = createApp({ contentService });

const featureRoutes = [
  ["auth", "/auth"],
  ["hostels", "/hostels"],
  ["facilities", "/facilities"],
  ["notices", "/notices"],
  ["rules", "/rules"],
  ["fees", "/fees"],
  ["important-dates", "/important-dates"],
];

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

for (const prefix of ["/api/v1", "/api"]) {
  for (const [moduleName, path] of featureRoutes) {
    test(`GET ${prefix}${path} returns ${moduleName} content`, async () => {
      const response = await fetch(`${baseUrl}${prefix}${path}`);
      const body = await response.json();

      assert.equal(response.status, 200);
      if (moduleName === "auth") {
        assert.equal(body.meta.module, moduleName);
        assert.equal(body.meta.placeholder, true);
      } else {
        assert.equal(body.data.resource, moduleName);
        assert.equal(body.data.records[0].is_demo, true);
      }
    });
  }
}

test("GET /api/v1/content/pages/:slug reads backend-managed public page settings", async () => {
  const response = await fetch(`${baseUrl}/api/v1/content/pages/about-hostel`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.content.title, "about-hostel");
  assert.equal(body.data.isDemo, true);
});

test("GET /api/v1/health returns the API health response", async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.status, "ok");
  assert.equal(body.meta.apiVersion, "v1");
});

test("unknown routes return a structured 404 response", async () => {
  const response = await fetch(`${baseUrl}/api/v1/missing`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "NOT_FOUND");
});

test("malformed JSON returns a structured 400 response", async () => {
  const response = await fetch(`${baseUrl}/api/v1/applications`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{invalid",
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "INVALID_JSON");
});

test("allowed CORS origin, request ID, and security headers are present", async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`, {
    headers: { origin: "http://localhost:5173" },
  });

  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "http://localhost:5173",
  );
  assert.ok(response.headers.get("x-request-id"));
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-powered-by"), null);
});

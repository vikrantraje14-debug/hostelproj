import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { createApp } from "./app.js";
import { sessionCookieName } from "./controllers/auth.controller.js";
import { csrfCookieName } from "./middleware/csrf.js";
import { env } from "./config/env.js";
import { createLocalDocumentStorage } from "./services/local-document-storage.js";

function loadEnvironment(environment) {
  return spawnSync(
    process.execPath,
    ["--input-type=module", "-e", "import('./src/config/env.js')"],
    {
      cwd: process.cwd(),
      env: { ...process.env, ...environment },
      encoding: "utf8",
    },
  );
}

test("production startup rejects missing credentials and insecure origins", () => {
  const missing = loadEnvironment({
    NODE_ENV: "production",
    MONGODB_URI: "",
    SESSION_SECRET: "",
    CLIENT_ORIGIN: "",
  });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Invalid environment configuration/);

  const insecureOrigin = loadEnvironment({
    NODE_ENV: "production",
    MONGODB_URI: "mongodb://app:placeholder@db.example.test:27017/app",
    SESSION_SECRET: "a".repeat(43),
    CLIENT_ORIGIN: "http://portal.example.test",
  });
  assert.notEqual(insecureOrigin.status, 0);
  assert.match(insecureOrigin.stderr, /canonical HTTPS origin/);

  const tlsDowngrade = loadEnvironment({
    NODE_ENV: "production",
    MONGODB_URI:
      "mongodb://app:placeholder@db.example.test:27017/app?tls=false",
    SESSION_SECRET: "a".repeat(43),
    CLIENT_ORIGIN: "https://portal.example.test",
  });
  assert.notEqual(tlsDowngrade.status, 0);
  assert.match(tlsDowngrade.stderr, /must not disable TLS validation/);

  const validOrigin = loadEnvironment({
    NODE_ENV: "production",
    MONGODB_URI: "mongodb://app:placeholder@db.example.test:27017/app",
    SESSION_SECRET: "a".repeat(43),
    CLIENT_ORIGIN: "https://portal.example.test",
  });
  assert.equal(validOrigin.status, 0, validOrigin.stderr);
});

test("repeated document uploads are stopped by the dedicated upload limiter", async (context) => {
  const authService = {
    async authenticate(token) {
      if (token === "security-test-student") {
        return { id: "44444444-4444-4444-8444-444444444444", role: "STUDENT" };
      }
      throw new Error("unauthenticated");
    },
  };
  const server = createApp({ authService }).listen(0);
  context.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const csrfResponse = await fetch(`${baseUrl}/api/v1/auth/csrf`);
  const csrfBody = await csrfResponse.json();
  const setCookies = csrfResponse.headers.getSetCookie?.() ?? [
    csrfResponse.headers.get("set-cookie"),
  ];
  const csrfCookie = setCookies
    .find((cookie) => cookie?.startsWith(`${csrfCookieName()}=`))
    ?.split(";", 1)[0];
  const cookie = `${sessionCookieName()}=security-test-student; ${csrfCookie}`;
  let limited = false;

  for (let attempt = 0; attempt < 15; attempt += 1) {
    const form = new FormData();
    form.set("documentType", "supporting_document");
    const response = await fetch(
      `${baseUrl}/api/v1/applications/44444444-4444-4444-8444-444444444444/documents`,
      {
        method: "POST",
        headers: {
          origin: env.CLIENT_ORIGIN,
          cookie,
          "x-csrf-token": csrfBody.data.csrfToken,
        },
        body: form,
      },
    );
    if (response.status === 429) {
      limited = true;
      break;
    }
    assert.equal(response.status, 400);
  }
  assert.equal(limited, true);
});

test("local document storage rejects path traversal keys", async (context) => {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "secure-docs-"));
  context.after(() => rm(rootDirectory, { recursive: true, force: true }));
  const storage = createLocalDocumentStorage({ rootDirectory });

  await assert.rejects(
    storage.put("../outside.txt", Buffer.from("should not escape")),
    { code: "INVALID_STORAGE_KEY" },
  );
  assert.equal(await storage.get("../outside.txt"), null);
});

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { createApp } from "./app.js";
import { CONTENT_RESOURCES } from "./config/content-resources.js";
import { createContentService } from "./services/content.service.js";

const adminId = randomUUID();
const records = new Map(
  Object.keys(CONTENT_RESOURCES).map((resource) => [resource, new Map()]),
);
const auditEntries = [];

function publicRecord(resourceName, record) {
  const definition = CONTENT_RESOURCES[resourceName];
  return Object.fromEntries(
    definition.publicFields.map((column) => {
      const entry = Object.entries(definition.columns).find(
        ([, dbColumn]) => dbColumn === column,
      );
      return [column, entry ? record[entry[0]] : record[column]];
    }),
  );
}

function isPublic(resourceName, record) {
  if (resourceName === "hostels") return record.isActive;
  if (resourceName === "fees") return record.isActive;
  if (["notices", "rules", "important-dates"].includes(resourceName)) {
    return record.status === "published";
  }
  if (resourceName === "settings") return record.isPublic;
  return true;
}

const repository = {
  async listAdmin(resourceName, { page, pageSize, search }) {
    let result = [...records.get(resourceName).values()];
    if (search) {
      result = result.filter((record) =>
        JSON.stringify(record).toLowerCase().includes(search.toLowerCase()),
      );
    }
    const total = result.length;
    return {
      records: result.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  },
  async getAdmin(resourceName, id) {
    return records.get(resourceName).get(id) ?? null;
  },
  async create(resourceName, values, context) {
    const now = new Date().toISOString();
    const record = {
      ...values,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...(values.status === "published"
        ? { publishedAt: now, publishedByUserId: context.actorUserId }
        : {}),
    };
    records.get(resourceName).set(record.id, record);
    auditEntries.push({ action: "create", resourceName, record });
    return record;
  },
  async update(resourceName, id, values) {
    const current = records.get(resourceName).get(id);
    if (!current) throw new Error("missing");
    const record = {
      ...current,
      ...values,
      updatedAt: new Date().toISOString(),
    };
    records.get(resourceName).set(id, record);
    auditEntries.push({ action: "update", resourceName, record });
    return record;
  },
  async delete(resourceName, id) {
    const current = records.get(resourceName).get(id);
    if (resourceName === "hostels") {
      records.get(resourceName).set(id, { ...current, isActive: false });
      auditEntries.push({
        action: "deactivate",
        resourceName,
        record: current,
      });
      return { deactivated: true };
    }
    records.get(resourceName).delete(id);
    auditEntries.push({ action: "delete", resourceName, record: current });
    return { deleted: true };
  },
  async listPublic(resourceName) {
    return [...records.get(resourceName).values()]
      .filter((record) => isPublic(resourceName, record))
      .map((record) => publicRecord(resourceName, record));
  },
  async getPublic(resourceName, id) {
    const record = records.get(resourceName).get(id);
    return record && isPublic(resourceName, record)
      ? publicRecord(resourceName, record)
      : null;
  },
  async getPublicPage(slug) {
    const setting = [...records.get("settings").values()].find(
      (record) => record.key === `public_page:${slug}` && record.isPublic,
    );
    return setting ? { page: setting.value, isDemo: setting.isDemo } : null;
  },
};

const contentService = createContentService({ repository });
const authService = {
  async authenticate(token) {
    if (token === "test-admin") return { id: adminId, role: "ADMIN" };
    if (token === "test-student") {
      return { id: randomUUID(), role: "STUDENT" };
    }
    const error = new Error("not authenticated");
    error.statusCode = 401;
    error.code = "UNAUTHENTICATED";
    throw error;
  },
};

let server;
let baseUrl;
let adminCookie;
let csrfToken;

before(async () => {
  server = createApp({ authService, contentService }).listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  const csrfResponse = await fetch(`${baseUrl}/api/v1/auth/csrf`);
  const csrfBody = await csrfResponse.json();
  csrfToken = csrfBody.data.csrfToken;
  const csrfCookie = csrfResponse.headers.get("set-cookie").split(";")[0];
  adminCookie = `hostel.sid=test-admin; ${csrfCookie}`;
});

after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

async function request(path, { method = "GET", body, role = "admin" } = {}) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      origin: "http://localhost:5173",
      cookie: adminCookie.replace("test-admin", `test-${role}`),
      ...(body ? { "content-type": "application/json" } : {}),
      ...(method !== "GET" ? { "x-csrf-token": csrfToken } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

const fixtures = {
  hostels: {
    code: "DEMO-H1",
    name: "Demo Hostel One",
    description: "DEMO DATA — NOT OFFICIAL GOVERNMENT DATA",
    address: "Demo address",
    capacity: 20,
    isActive: true,
    isDemo: true,
  },
  facilities: {
    code: "DEMO-F1",
    name: "Demo Study Room",
    description: "DEMO DATA — NOT OFFICIAL GOVERNMENT DATA",
    isDemo: true,
  },
  fees: {
    hostelId: null,
    feeCode: "DEMO-FEE-1",
    description: "Demo fee amount",
    amount: 10,
    currency: "USD",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    isActive: true,
    isDemo: true,
  },
  notices: {
    title: "Demo notice",
    body: "DEMO DATA — NOT OFFICIAL GOVERNMENT DATA",
    status: "draft",
    expiresAt: null,
    isDemo: true,
  },
  rules: {
    ruleCode: "DEMO-RULE-1",
    title: "Demo rule",
    body: "DEMO DATA — NOT OFFICIAL GOVERNMENT DATA",
    status: "draft",
    effectiveFrom: null,
    effectiveTo: null,
    isDemo: true,
  },
  "important-dates": {
    admissionYear: 2026,
    eventCode: "DEMO-OPEN",
    title: "Demo opening date",
    description: "DEMO DATA — NOT OFFICIAL GOVERNMENT DATA",
    startsAt: "2026-10-01T00:00:00Z",
    endsAt: null,
    status: "draft",
    isDemo: true,
  },
  settings: {
    key: "public_page:about-hostel",
    value: { title: "Demo dynamic page", sections: [] },
    isPublic: true,
    isDemo: true,
  },
};

test("admin content CRUD validates, audits, and controls public visibility for all resources", async () => {
  let publicPageBody;
  for (const [resource, fixture] of Object.entries(fixtures)) {
    const collectionPath = `/api/v1/admin/content/${resource}`;
    const createResponse = await request(collectionPath, {
      method: "POST",
      body: fixture,
    });
    const createdBody = await createResponse.json();
    assert.equal(createResponse.status, 201, resource);
    assert.equal(createdBody.data.record.isDemo, true, resource);
    const recordId = createdBody.data.record.id;

    const listResponse = await request(`${collectionPath}?page=1&pageSize=1`);
    const listBody = await listResponse.json();
    assert.equal(listResponse.status, 200, resource);
    assert.equal(listBody.data.records.length, 1, resource);
    assert.equal(listBody.data.total, 1, resource);

    const detailResponse = await request(`${collectionPath}/${recordId}`);
    assert.equal(detailResponse.status, 200, resource);
    assert.equal((await detailResponse.json()).data.record.id, recordId);

    const updatedFixture = {
      ...fixture,
      ...(resource === "hostels" || resource === "facilities"
        ? { name: `${fixture.name} Updated` }
        : resource === "fees"
          ? { amount: 12.5 }
          : resource === "notices" ||
              resource === "rules" ||
              resource === "important-dates"
            ? { status: "published" }
            : { value: { title: "Updated demo page", sections: [] } }),
    };
    const updateResponse = await request(`${collectionPath}/${recordId}`, {
      method: "PUT",
      body: updatedFixture,
    });
    const updatedBody = await updateResponse.json();
    assert.equal(updateResponse.status, 200, resource);
    assert.equal(updatedBody.data.record.isDemo, true, resource);

    if (resource === "settings") {
      const publicPage = await request("/api/v1/content/pages/about-hostel");
      publicPageBody = await publicPage.json();
      assert.equal(publicPage.status, 200);
      assert.equal(publicPageBody.data.content.title, "Updated demo page");
      assert.equal(publicPageBody.data.isDemo, true);
    }

    if (resource !== "settings") {
      const publicResponse = await request(`/api/v1/${resource}`);
      const publicBody = await publicResponse.json();
      assert.equal(publicResponse.status, 200, resource);
      assert.ok(
        publicBody.data.records.some((record) => record.is_demo === true),
        resource,
      );
    }

    const deleteResponse = await request(`${collectionPath}/${recordId}`, {
      method: "DELETE",
    });
    assert.equal(deleteResponse.status, 200, resource);
    assert.equal(
      resource === "hostels"
        ? (await deleteResponse.json()).data.deactivated
        : (await deleteResponse.json()).data.deleted,
      true,
      resource,
    );
  }

  assert.equal(publicPageBody.data.content.title, "Updated demo page");
  assert.equal(publicPageBody.data.isDemo, true);
  assert.equal(auditEntries.length, 21);

  const rejectedValue = "do-not-reflect-secret-value";
  const invalid = await request("/api/v1/admin/content/hostels", {
    method: "POST",
    body: { ...fixtures.hostels, capacity: rejectedValue },
  });
  const invalidBody = await invalid.json();
  assert.equal(invalid.status, 400);
  assert.equal(invalidBody.error.code, "VALIDATION_ERROR");
  assert.equal(JSON.stringify(invalidBody).includes(rejectedValue), false);
});

test("student sessions cannot read or change admin content", async () => {
  const readResponse = await request("/api/v1/admin/content/hostels", {
    role: "student",
  });
  assert.equal(readResponse.status, 403);
  const writeResponse = await request("/api/v1/admin/content/hostels", {
    method: "POST",
    body: fixtures.hostels,
    role: "student",
  });
  assert.equal(writeResponse.status, 403);
});

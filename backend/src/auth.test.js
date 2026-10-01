import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { after, before, test } from "node:test";
import argon2 from "argon2";
import { createApp } from "./app.js";
import { createAuthService } from "./services/auth.service.js";
import { createApplicationService } from "./services/application.service.js";
import { createDocumentService } from "./services/document.service.js";
import { createApplicationStatusService } from "./services/application-status.service.js";
import {
  APPLICATION_STATUSES,
  STATUS_TRANSITIONS,
  isAllowedStatusTransition,
} from "./config/application-status.js";
import { ApiError } from "./utils/api-error.js";

class InMemoryAuthRepository {
  usersByEmail = new Map();
  usersById = new Map();
  sessions = new Map();
  applications = new Map();
  ownApplicationId;
  foreignApplicationId;

  async createStudent({ email, passwordHash, fullName }) {
    if (this.usersByEmail.has(email)) {
      const error = new Error("duplicate email");
      error.code = "23505";
      throw error;
    }
    const user = {
      id: randomUUID(),
      email,
      passwordHash,
      role: "student",
      accountStatus: "active",
      fullName,
    };
    this.usersByEmail.set(email, user);
    this.usersById.set(user.id, user);
    const application = {
      id: randomUUID(),
      status: "draft",
      admission_year: 2099,
      created_at: new Date().toISOString(),
    };
    this.ownApplicationId = application.id;
    this.applications.set(`${user.id}:${application.id}`, application);
    return user;
  }

  async addAdmin(email, password, displayName) {
    const user = {
      id: randomUUID(),
      email,
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
      role: "admin",
      accountStatus: "active",
      displayName,
    };
    this.usersByEmail.set(email, user);
    this.usersById.set(user.id, user);
    return user;
  }

  async addOtherStudentApplication() {
    const user = {
      id: randomUUID(),
      email: `other-${randomUUID()}@example.test`,
      passwordHash: "unused",
      role: "student",
      accountStatus: "active",
      fullName: "Other Student",
    };
    this.usersByEmail.set(user.email, user);
    this.usersById.set(user.id, user);
    const application = {
      id: randomUUID(),
      status: "submitted",
      admission_year: 2099,
      created_at: new Date().toISOString(),
    };
    this.foreignApplicationId = application.id;
    this.applications.set(`${user.id}:${application.id}`, application);
  }

  async findUserByEmail(email) {
    return this.usersByEmail.get(email) ?? null;
  }

  async createSession(session) {
    this.sessions.set(session.tokenHash, {
      ...session,
      revoked: false,
    });
  }

  async findActiveSession(tokenHash) {
    const session = this.sessions.get(tokenHash);
    if (!session || session.revoked || session.expiresAt <= new Date()) {
      return null;
    }
    const user = this.usersById.get(session.userId);
    return user ? { ...user } : null;
  }

  async revokeSession(tokenHash) {
    const session = this.sessions.get(tokenHash);
    if (session) session.revoked = true;
  }

  async getStudentProfile(userId) {
    const user = this.usersById.get(userId);
    return user?.role === "student"
      ? {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: user.fullName,
          student_number: null,
        }
      : null;
  }

  async listOwnApplications(userId) {
    return [...this.applications.entries()]
      .filter(([key]) => key.startsWith(`${userId}:`))
      .map(([, application]) => application);
  }

  async getOwnApplication(userId, applicationId) {
    return this.applications.get(`${userId}:${applicationId}`) ?? null;
  }

  async listApplicationsForAdmin() {
    return [...this.applications.values()];
  }
}

function parseCookies(response) {
  const values = response.headers.getSetCookie?.() ?? [
    response.headers.get("set-cookie"),
  ];
  return values.filter(Boolean).map((value) => value.split(";", 1)[0]);
}

function mergeCookies(...cookieSets) {
  const cookies = new Map();
  for (const cookie of cookieSets.flat()) {
    const separator = cookie.indexOf("=");
    cookies.set(cookie.slice(0, separator), cookie.slice(separator + 1));
  }
  return [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
}

let server;
let baseUrl;
let repository;
let student;
let studentCookies;
let studentCsrf;
let admin;
let adminCookies;
let applicationRepository;
let documentService;
const storedDocuments = new Map();
const documentMetadata = new Map();
const statusRecords = new Map();
let statusService;
let createdApplicationId;
let failNextApplication = false;
const submittedApplications = new Map();

before(async () => {
  repository = new InMemoryAuthRepository();
  student = {
    email: `student-${randomUUID()}@example.test`,
    password: "A-Strong-Student-Passphrase-42",
    fullName: "Casey Example",
  };
  admin = {
    email: `admin-${randomUUID()}@example.test`,
    password: "A-Strong-Admin-Passphrase-77",
  };
  await repository.addAdmin(admin.email, admin.password, "Portal Admin");
  await repository.addOtherStudentApplication();

  const authService = createAuthService({
    repository,
    sessionSecret: randomBytes(32).toString("hex"),
  });
  applicationRepository = {
    async createStudentApplication(input) {
      if (failNextApplication) {
        failNextApplication = false;
        throw new Error("internal database connection detail");
      }
      const key = `${input.studentUserId}:${input.application.admissionYear}`;
      if (submittedApplications.has(key)) {
        const duplicate = new Error("unique application");
        duplicate.code = "23505";
        duplicate.constraint = "applications_one_active_per_student_year_idx";
        throw duplicate;
      }
      const saved = {
        id: randomUUID(),
        referenceNumber: input.referenceNumber,
        status: "submitted",
        submittedAt: input.submittedAt.toISOString(),
        admissionYear: input.application.admissionYear,
        summary: {
          fullName: input.application.fullName,
          college: input.application.college,
          course: input.application.course,
          hostelPreference: input.application.hostelPreference,
        },
      };
      submittedApplications.set(key, saved);
      createdApplicationId = saved.id;
      statusRecords.set(saved.id, {
        ownerId: input.studentUserId,
        application: {
          id: saved.id,
          reference_number: saved.referenceNumber,
          status: "submitted",
          submitted_at: saved.submittedAt,
          updated_at: saved.submittedAt,
        },
        history: [
          {
            previous_status: null,
            new_status: "submitted",
            student_remarks: null,
            changed_by_user_id: input.studentUserId,
            reason: "PRIVATE INITIAL EVENT DETAIL",
            created_at: saved.submittedAt,
          },
        ],
      });
      return saved;
    },
  };
  const applicationService = createApplicationService({
    repository: applicationRepository,
  });
  const documentRepository = {
    async findApplicationOwner(applicationId) {
      for (const key of repository.applications.keys()) {
        const [userId, id] = key.split(":");
        if (id === applicationId) return userId;
      }
      return null;
    },
    async createDocument(input) {
      const document = {
        id: randomUUID(),
        applicationId: input.applicationId,
        documentType: input.documentType,
        originalFilename: input.originalFilename,
        contentType: input.contentType,
        byteSize: input.byteSize,
        createdAt: new Date().toISOString(),
        storage_key: input.storageKey,
        content_type: input.contentType,
      };
      documentMetadata.set(document.id, document);
      const { storage_key, content_type, ...publicDocument } = document;
      return publicDocument;
    },
    async listDocuments(applicationId) {
      return [...documentMetadata.values()]
        .filter((document) => document.applicationId === applicationId)
        .map((document) => ({
          id: document.id,
          application_id: applicationId,
          document_type: document.documentType,
          original_filename: document.originalFilename,
          content_type: document.contentType,
          byte_size: document.byteSize,
          created_at: document.createdAt,
        }));
    },
    async findDocumentForAccess(applicationId, documentId, userId, isAdmin) {
      const document = documentMetadata.get(documentId);
      const ownerId = await this.findApplicationOwner(applicationId);
      if (
        !document ||
        document.applicationId !== applicationId ||
        (!isAdmin && ownerId !== userId)
      ) {
        return null;
      }
      return document;
    },
  };
  documentService = createDocumentService({
    repository: documentRepository,
    storage: {
      provider: "test",
      async put(key, content) {
        storedDocuments.set(key, content);
      },
      async get(key) {
        return storedDocuments.get(key) ?? null;
      },
      async delete(key) {
        storedDocuments.delete(key);
      },
    },
  });
  const statusRepository = {
    async getStudentStatus(userId, applicationId) {
      const record = statusRecords.get(applicationId);
      return record?.ownerId === userId
        ? { application: record.application, history: record.history }
        : null;
    },
    async findOwnApplicationByReference(userId, referenceNumber) {
      const record = [...statusRecords.values()].find(
        (candidate) =>
          candidate.ownerId === userId &&
          candidate.application.reference_number === referenceNumber,
      );
      return record?.application ?? null;
    },
    async transitionApplicationStatus({
      applicationId,
      adminUserId,
      status,
      studentRemarks,
    }) {
      const record = statusRecords.get(applicationId);
      if (!record) {
        throw new ApiError(404, "NOT_FOUND", "Application was not found.");
      }
      const previousStatus = record.application.status;
      if (!isAllowedStatusTransition(previousStatus, status)) {
        throw new ApiError(
          409,
          "INVALID_STATUS_TRANSITION",
          "This application cannot move to the selected status.",
        );
      }
      const timestamp = new Date().toISOString();
      record.application = {
        ...record.application,
        status: status.toLowerCase(),
        updated_at: timestamp,
      };
      record.history.push({
        previous_status: previousStatus,
        new_status: status.toLowerCase(),
        student_remarks: studentRemarks,
        changed_by_user_id: adminUserId,
        reason: "PRIVATE ADMIN DETAIL",
        created_at: timestamp,
      });
      return {
        applicationId,
        previousStatus: previousStatus.toUpperCase(),
        status,
      };
    },
  };
  statusService = createApplicationStatusService({
    repository: statusRepository,
  });
  const getAdminRows = () => [
    {
      id: repository.ownApplicationId,
      applicationNumber: "GHA-2026-OWN0000000001",
      studentName: "Casey Example",
      college: "North College",
      course: "Civil Engineering",
      hostel: "Demo Hostel North",
      submissionDate: new Date().toISOString(),
      status: "SUBMITTED",
      admissionYear: 2026,
    },
    {
      id: repository.foreignApplicationId,
      applicationNumber: "GHA-2026-OTHER000001",
      studentName: "Other Student",
      college: "South College",
      course: "Applied Science",
      hostel: "Demo Hostel South",
      submissionDate: new Date(Date.now() - 86400000).toISOString(),
      status: "APPROVED",
      admissionYear: 2025,
    },
  ];
  const paginate = (items, options) => {
    const { page = 1, pageSize = 20 } = options;
    return {
      page,
      pageSize,
      total: items.length,
      totalPages: Math.ceil(items.length / pageSize),
      items: items.slice((page - 1) * pageSize, page * pageSize),
    };
  };
  const adminService = {
    async getDashboardStats() {
      return {
        totalApplications: 2,
        pendingApplications: 1,
        underReview: 0,
        approved: 1,
        rejected: 0,
        receivedToday: 1,
      };
    },
    async listApplications(options) {
      let rows = getAdminRows();
      if (options.search) {
        const term = options.search.toLowerCase();
        rows = rows.filter((row) =>
          [row.applicationNumber, row.studentName, row.college, row.course]
            .join(" ")
            .toLowerCase()
            .includes(term),
        );
      }
      if (options.status)
        rows = rows.filter((row) => row.status === options.status);
      if (options.admissionYear) {
        rows = rows.filter(
          (row) => row.admissionYear === options.admissionYear,
        );
      }
      const key = {
        applicationNumber: "applicationNumber",
        studentName: "studentName",
        college: "college",
        course: "course",
        hostel: "hostel",
        submissionDate: "submissionDate",
        status: "status",
      }[options.sortBy];
      rows.sort(
        (left, right) =>
          String(left[key]).localeCompare(String(right[key])) *
          (options.sortDirection === "asc" ? 1 : -1),
      );
      const result = paginate(rows, options);
      return {
        applications: result.items,
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      };
    },
    async getApplicationDetails(applicationId) {
      const row = getAdminRows().find(
        (application) => application.id === applicationId,
      );
      if (!row) return null;
      return {
        ...row,
        updatedAt: row.submissionDate,
        student: {
          fullName: row.studentName,
          email: student.email,
          studentNumber: "STUDENT-204",
          address: "Private student address",
        },
        academic: {
          college: row.college,
          course: row.course,
          branch: "Civil",
          year: 2,
          rollNumber: "ROLL-204",
        },
        guardian: {
          name: "Jordan Example",
          relationship: "Parent",
          mobile: "+1 202 555 0188",
          address: "Guardian address",
        },
        history: [
          { status: row.status, remarks: null, timestamp: row.submissionDate },
        ],
        documents: [...documentMetadata.values()]
          .filter((document) => document.applicationId === applicationId)
          .map((document) => ({
            id: document.id,
            applicationId,
            originalFilename: document.originalFilename,
            contentType: document.contentType,
            documentType: document.documentType,
            byteSize: document.byteSize,
            createdAt: document.createdAt,
          })),
      };
    },
    async listStudents(options) {
      const term = options.search?.toLowerCase();
      const adminStudents = [...repository.usersByEmail.values()]
        .filter((user) => user.role === "student")
        .map((user) => ({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          studentNumber:
            user.fullName === "Other Student" ? "STUDENT-OTHER" : "STUDENT-204",
          applicationCount: 1,
          createdAt: new Date().toISOString(),
        }));
      const rows = adminStudents.filter(
        (studentRow) =>
          !term ||
          `${studentRow.fullName} ${studentRow.email} ${studentRow.studentNumber}`
            .toLowerCase()
            .includes(term),
      );
      const result = paginate(rows, options);
      return {
        students: result.items,
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      };
    },
    async listDocuments(options) {
      const rows = [...documentMetadata.values()].map((document) => ({
        id: document.id,
        applicationId: document.applicationId,
        applicationNumber: getAdminRows().find(
          (row) => row.id === document.applicationId,
        )?.applicationNumber,
        studentName: "Casey Example",
        documentType: document.documentType,
        originalFilename: document.originalFilename,
        contentType: document.contentType,
        byteSize: document.byteSize,
        createdAt: document.createdAt,
      }));
      const result = paginate(rows, options);
      return {
        documents: result.items,
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      };
    },
  };
  server = createApp({
    authService,
    applicationService,
    documentService,
    statusService,
    adminService,
  }).listen(0);
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

async function getCsrf() {
  const response = await fetch(`${baseUrl}/api/v1/auth/csrf`);
  const body = await response.json();
  return { token: body.data.csrfToken, cookies: parseCookies(response) };
}

async function postAuth(path, body, csrf, existingCookies = []) {
  const response = await fetch(`${baseUrl}/api/v1/auth/${path}`, {
    method: "POST",
    headers: {
      origin: "http://localhost:5173",
      "content-type": "application/json",
      "x-csrf-token": csrf.token,
      cookie: mergeCookies(existingCookies, csrf.cookies),
    },
    body: JSON.stringify(body),
  });
  return { response, cookies: parseCookies(response) };
}

async function postApplication(
  body,
  csrf,
  cookies = studentCookies,
  prefix = "/api/v1",
) {
  const existingCookies = Array.isArray(cookies)
    ? cookies
    : cookies.split(/;\s*/).filter(Boolean);
  return fetch(`${baseUrl}${prefix}/applications`, {
    method: "POST",
    headers: {
      origin: "http://localhost:5173",
      "content-type": "application/json",
      "x-csrf-token": csrf.token,
      cookie: mergeCookies(existingCookies, csrf.cookies),
    },
    body: JSON.stringify(body),
  });
}

async function postDocument(applicationId, bytes, filename, mimeType, csrf) {
  const form = new FormData();
  form.set("documentType", "supporting_document");
  form.set("document", new Blob([bytes], { type: mimeType }), filename);
  return fetch(`${baseUrl}/api/v1/applications/${applicationId}/documents`, {
    method: "POST",
    headers: {
      origin: "http://localhost:5173",
      "x-csrf-token": csrf.token,
      cookie: mergeCookies(
        studentCookies.split(/;\s*/).filter(Boolean),
        csrf.cookies,
      ),
    },
    body: form,
  });
}

async function patchApplicationStatus(applicationId, status, remarks, csrf) {
  const response = await fetch(
    `${baseUrl}/api/v1/admin/applications/${applicationId}/status`,
    {
      method: "PATCH",
      headers: {
        origin: "http://localhost:5173",
        "content-type": "application/json",
        "x-csrf-token": csrf.token,
        cookie: mergeCookies(
          adminCookies.split(/;\s*/).filter(Boolean),
          csrf.cookies,
        ),
      },
      body: JSON.stringify({ status, remarks }),
    },
  );
  return response;
}

const validApplication = {
  fullName: "Casey Example",
  dateOfBirth: "2000-01-01",
  gender: "Unspecified",
  mobileNumber: "+1 202 555 0144",
  email: "casey@example.test",
  address: "10 Example Avenue",
  college: "Example College",
  course: "Example Course",
  branch: "Example Branch",
  year: "2",
  rollNumber: "ROLL-204",
  studentId: "STUDENT-204",
  admissionYear: "2026",
  guardianName: "Jordan Example",
  guardianRelationship: "Parent",
  guardianMobile: "+1 202 555 0188",
  guardianAddress: "12 Example Road",
  guardianOtherInfo: "",
  hostelPreference: "demo-hostel-a",
  hostelOtherInfo: "",
};

test("student registration creates only a student and returns no secrets", async () => {
  const csrf = await getCsrf();
  const { response, cookies } = await postAuth("register", student, csrf);
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.data.user.email, student.email);
  assert.equal(body.data.user.role, "STUDENT");
  assert.equal(body.data.user.fullName, student.fullName);
  assert.equal("password" in body.data.user, false);
  assert.equal("passwordHash" in body.data.user, false);
  assert.equal("password_hash" in body.data.user, false);
  assert.ok(cookies.some((cookie) => cookie.startsWith("hostel.sid=")));
  studentCookies = mergeCookies(csrf.cookies, cookies);
  studentCsrf = csrf;
});

test("student login authenticates with a generic safe response", async () => {
  const csrf = await getCsrf();
  const { response, cookies } = await postAuth(
    "login",
    { email: student.email, password: student.password },
    csrf,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.user.role, "STUDENT");
  assert.equal(JSON.stringify(body).includes(student.password), false);
  assert.equal("passwordHash" in body.data.user, false);
  studentCookies = mergeCookies(csrf.cookies, cookies);
  studentCsrf = csrf;
});

test("authentication validation errors never reflect password input", async () => {
  const csrf = await getCsrf();
  const sensitiveMarker = "CANARY-password-not-for-response";
  const result = await postAuth(
    "login",
    { email: student.email, password: { value: sensitiveMarker } },
    csrf,
  );
  const body = await result.response.json();

  assert.equal(result.response.status, 400);
  assert.equal(body.error.code, "VALIDATION_ERROR");
  assert.equal(JSON.stringify(body).includes(sensitiveMarker), false);
});

test("student protected profile and applications return only the student's data", async () => {
  const profileResponse = await fetch(`${baseUrl}/api/v1/students/me`, {
    headers: { cookie: studentCookies },
  });
  const profile = await profileResponse.json();
  assert.equal(profileResponse.status, 200);
  assert.equal(profile.data.profile.email, student.email);
  assert.equal(profile.data.profile.role, "STUDENT");
  assert.equal("password_hash" in profile.data.profile, false);

  const listResponse = await fetch(`${baseUrl}/api/v1/applications`, {
    headers: { cookie: studentCookies },
  });
  const listBody = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.ok(listBody.data.applications.length >= 1);
  assert.equal(
    listBody.data.applications.some(
      (application) => application.id === repository.foreignApplicationId,
    ),
    false,
  );

  const ownResponse = await fetch(
    `${baseUrl}/api/v1/applications/${repository.ownApplicationId}`,
    { headers: { cookie: studentCookies } },
  );
  assert.equal(ownResponse.status, 200);

  const otherResponse = await fetch(
    `${baseUrl}/api/v1/applications/${repository.foreignApplicationId}`,
    { headers: { cookie: studentCookies } },
  );
  assert.equal(otherResponse.status, 404);
});

test("valid student application returns a safe acknowledgement reference", async () => {
  const csrf = await getCsrf();
  const response = await postApplication(validApplication, csrf);
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.match(
    body.data.application.referenceNumber,
    /^GHA-\d{4}-[A-F0-9]{16}$/,
  );
  assert.equal(body.data.application.status, "submitted");
  assert.equal(
    body.data.application.summary.fullName,
    validApplication.fullName,
  );
  assert.equal("password_hash" in body.data.application, false);
  assert.equal(JSON.stringify(body).includes("internal database"), false);
});

test("student status and reference lookup expose only owned public history", async () => {
  const statusResponse = await fetch(
    `${baseUrl}/api/v1/applications/${createdApplicationId}/status`,
    { headers: { cookie: studentCookies } },
  );
  const statusBody = await statusResponse.json();
  assert.equal(statusResponse.status, 200);
  assert.equal(statusBody.data.status.status, "SUBMITTED");
  assert.equal(statusBody.data.status.history.length, 1);
  assert.equal("reason" in statusBody.data.status.history[0], false);
  assert.equal(
    "changed_by_user_id" in statusBody.data.status.history[0],
    false,
  );
  assert.equal(JSON.stringify(statusBody).includes("PRIVATE INITIAL"), false);

  const ownReference = statusBody.data.status.referenceNumber;
  const searchResponse = await fetch(
    `${baseUrl}/api/v1/applications/search?referenceNumber=${encodeURIComponent(ownReference)}`,
    { headers: { cookie: studentCookies } },
  );
  const searchBody = await searchResponse.json();
  assert.equal(searchResponse.status, 200);
  assert.equal(searchBody.data.application.id, createdApplicationId);

  const foreignResponse = await fetch(
    `${baseUrl}/api/v1/applications/${repository.foreignApplicationId}/status`,
    { headers: { cookie: studentCookies } },
  );
  assert.equal(foreignResponse.status, 404);

  const foreignSearch = await fetch(
    `${baseUrl}/api/v1/applications/search?referenceNumber=GHA-PRIVATE-FOREIGN`,
    { headers: { cookie: studentCookies } },
  );
  assert.equal(foreignSearch.status, 404);
});

test("POST /api/applications remains available as the requested API alias", async () => {
  const csrf = await getCsrf();
  const response = await postApplication(
    { ...validApplication, admissionYear: "2028" },
    csrf,
    studentCookies,
    "/api",
  );
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.match(
    body.data.application.referenceNumber,
    /^GHA-\d{4}-[A-F0-9]{16}$/,
  );
});

test("server validation rejects invalid application fields", async () => {
  const csrf = await getCsrf();
  const response = await postApplication(
    { ...validApplication, email: "not-an-email" },
    csrf,
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "VALIDATION_ERROR");
});

test("duplicate active applications for a student and admission year return 409", async () => {
  const csrf = await getCsrf();
  const response = await postApplication(validApplication, csrf);
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.error.code, "DUPLICATE_APPLICATION");
});

test("application creation requires an authenticated student", async () => {
  const csrf = await getCsrf();
  const response = await postApplication(validApplication, csrf, []);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "UNAUTHENTICATED");
});

test("database failures return safe errors without internal details", async () => {
  failNextApplication = true;
  const csrf = await getCsrf();
  const response = await postApplication(
    { ...validApplication, admissionYear: "2027" },
    csrf,
  );
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.error.code, "INTERNAL_SERVER_ERROR");
  assert.equal(JSON.stringify(body).includes("database password"), false);
});

test("admin login and protected admin routes require an admin role", async () => {
  const csrf = await getCsrf();
  const { response, cookies } = await postAuth(
    "admin/login",
    { email: admin.email, password: admin.password },
    csrf,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.user.role, "ADMIN");
  assert.equal("password_hash" in body.data.user, false);
  adminCookies = mergeCookies(csrf.cookies, cookies);

  const routeResponse = await fetch(`${baseUrl}/api/v1/admin`, {
    headers: { cookie: adminCookies },
  });
  assert.equal(routeResponse.status, 200);

  const adminApplications = await fetch(
    `${baseUrl}/api/v1/admin/applications`,
    { headers: { cookie: adminCookies } },
  );
  assert.equal(adminApplications.status, 200);
  const dashboardStats = await fetch(`${baseUrl}/api/v1/admin/stats`, {
    headers: { cookie: adminCookies },
  });
  const statsBody = await dashboardStats.json();
  assert.equal(dashboardStats.status, 200);
  assert.equal(statsBody.data.stats.totalApplications, 2);
  assert.equal(statsBody.data.stats.receivedToday, 1);
});

test("admin application search, filters, sorting, pagination, and details work", async () => {
  const search = new URLSearchParams({
    search: "OWN0000000001",
    status: "SUBMITTED",
    page: "1",
    pageSize: "1",
    sortBy: "studentName",
    sortDirection: "asc",
  });
  const listResponse = await fetch(
    `${baseUrl}/api/v1/admin/applications?${search}`,
    { headers: { cookie: adminCookies } },
  );
  const listBody = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(listBody.data.total, 1);
  assert.equal(listBody.data.applications.length, 1);
  assert.equal(
    listBody.data.applications[0].applicationNumber,
    "GHA-2026-OWN0000000001",
  );

  const pageResponse = await fetch(
    `${baseUrl}/api/v1/admin/applications?page=2&pageSize=1`,
    { headers: { cookie: adminCookies } },
  );
  const pageBody = await pageResponse.json();
  assert.equal(pageResponse.status, 200);
  assert.equal(pageBody.data.page, 2);
  assert.equal(pageBody.data.totalPages, 2);
  assert.equal(pageBody.data.applications.length, 1);

  const detailResponse = await fetch(
    `${baseUrl}/api/v1/admin/applications/${repository.ownApplicationId}`,
    { headers: { cookie: adminCookies } },
  );
  const detailBody = await detailResponse.json();
  assert.equal(detailResponse.status, 200);
  assert.equal(detailBody.data.application.student.fullName, "Casey Example");
  assert.ok(Array.isArray(detailBody.data.application.history));
  assert.equal("storage_key" in detailBody.data.application, false);

  const studentsResponse = await fetch(
    `${baseUrl}/api/v1/admin/students?search=Casey&page=1&pageSize=1`,
    { headers: { cookie: adminCookies } },
  );
  const studentsBody = await studentsResponse.json();
  assert.equal(studentsResponse.status, 200);
  assert.equal(studentsBody.data.total, 1);
  assert.equal(studentsBody.data.students[0].fullName, "Casey Example");

  const documentsResponse = await fetch(`${baseUrl}/api/v1/admin/documents`, {
    headers: { cookie: adminCookies },
  });
  assert.equal(documentsResponse.status, 200);
});

test("every allowed status transition records history and illegal transitions fail", async () => {
  const adminUserId = repository.usersByEmail.get(admin.email).id;
  let lastTransitionId;
  for (const [previousStatus, nextStatuses] of Object.entries(
    STATUS_TRANSITIONS,
  )) {
    for (const nextStatus of nextStatuses) {
      const applicationId = randomUUID();
      lastTransitionId = applicationId;
      const createdAt = new Date().toISOString();
      statusRecords.set(applicationId, {
        ownerId: repository.usersByEmail.get(student.email).id,
        application: {
          id: applicationId,
          reference_number: `TEST-${applicationId}`,
          status: previousStatus.toLowerCase(),
          submitted_at: createdAt,
          updated_at: createdAt,
        },
        history: [
          {
            previous_status: null,
            new_status: previousStatus.toLowerCase(),
            student_remarks: null,
            created_at: createdAt,
          },
        ],
      });

      const csrf = await getCsrf();
      const response = await patchApplicationStatus(
        applicationId,
        nextStatus,
        `Public ${nextStatus} remark`,
        csrf,
      );
      const body = await response.json();
      const record = statusRecords.get(applicationId);
      assert.equal(response.status, 200, `${previousStatus} -> ${nextStatus}`);
      assert.equal(body.data.status.previousStatus, previousStatus);
      assert.equal(body.data.status.status, nextStatus);
      assert.equal(record.history.length, 2);
      assert.equal(record.history[1].new_status, nextStatus.toLowerCase());
      assert.equal(
        record.history[1].student_remarks,
        `Public ${nextStatus} remark`,
      );
      assert.equal(record.history[1].changed_by_user_id, adminUserId);
    }
  }

  const ownerId = repository.usersByEmail.get(student.email).id;
  for (const previousStatus of APPLICATION_STATUSES) {
    for (const nextStatus of APPLICATION_STATUSES) {
      if (STATUS_TRANSITIONS[previousStatus].includes(nextStatus)) continue;
      assert.equal(
        isAllowedStatusTransition(previousStatus, nextStatus),
        false,
      );
      const applicationId = randomUUID();
      const createdAt = new Date().toISOString();
      statusRecords.set(applicationId, {
        ownerId,
        application: {
          id: applicationId,
          reference_number: `TEST-${applicationId}`,
          status: previousStatus.toLowerCase(),
          submitted_at: createdAt,
          updated_at: createdAt,
        },
        history: [
          {
            new_status: previousStatus.toLowerCase(),
            created_at: createdAt,
          },
        ],
      });
      const csrf = await getCsrf();
      const response = await patchApplicationStatus(
        applicationId,
        nextStatus,
        "Must not be saved",
        csrf,
      );
      assert.equal(response.status, 409, `${previousStatus} -> ${nextStatus}`);
      assert.equal(
        (await response.json()).error.code,
        "INVALID_STATUS_TRANSITION",
      );
      assert.equal(statusRecords.get(applicationId).history.length, 1);
    }
  }

  const timelineResponse = await fetch(
    `${baseUrl}/api/v1/applications/${lastTransitionId}/status`,
    { headers: { cookie: studentCookies } },
  );
  const timelineBody = await timelineResponse.json();
  assert.equal(timelineResponse.status, 200);
  assert.equal(timelineBody.data.status.history.length, 2);
  assert.equal(timelineBody.data.status.remarks, "Public REJECTED remark");
  assert.equal(JSON.stringify(timelineBody).includes("PRIVATE ADMIN"), false);
});

test("document upload sniffs content and never exposes storage keys", async () => {
  const csrf = await getCsrf();
  const pdf = Buffer.from("%PDF-1.7\nsecure test document\n%%EOF");
  const response = await postDocument(
    repository.ownApplicationId,
    pdf,
    "../../proof.pdf",
    "application/x-msdownload",
    csrf,
  );
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.data.document.contentType, "application/pdf");
  assert.equal(body.data.document.originalFilename, "proof.pdf");
  assert.equal("storageKey" in body.data.document, false);
  assert.equal("storageProvider" in body.data.document, false);
  assert.equal("storage_key" in body.data.document, false);

  const listResponse = await fetch(
    `${baseUrl}/api/v1/applications/${repository.ownApplicationId}/documents`,
    { headers: { cookie: studentCookies } },
  );
  const listBody = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(listBody.data.documents.length, 1);
  assert.equal(listBody.data.requirements[0].required, false);
  assert.equal(JSON.stringify(listBody).includes("storage_key"), false);

  const contentResponse = await fetch(
    `${baseUrl}/api/v1/applications/${repository.ownApplicationId}/documents/${body.data.document.id}/content`,
    { headers: { cookie: studentCookies } },
  );
  assert.equal(contentResponse.status, 200);
  assert.equal(contentResponse.headers.get("cache-control"), "no-store");
  assert.equal(
    contentResponse.headers.get("x-content-type-options"),
    "nosniff",
  );
  assert.match(
    contentResponse.headers.get("content-disposition"),
    /^attachment;/,
  );
  assert.deepEqual(Buffer.from(await contentResponse.arrayBuffer()), pdf);

  const adminResponse = await fetch(
    `${baseUrl}/api/v1/applications/${repository.ownApplicationId}/documents/${body.data.document.id}/content`,
    { headers: { cookie: adminCookies } },
  );
  assert.equal(adminResponse.status, 200);
});

test("executable signatures and unsupported content are rejected despite extensions", async () => {
  const csrf = await getCsrf();
  const executable = Buffer.from("MZ\x90\x00not a PDF");
  const executableResponse = await postDocument(
    repository.ownApplicationId,
    executable,
    "safe.pdf",
    "application/pdf",
    csrf,
  );
  assert.equal(executableResponse.status, 415);
  assert.equal(
    (await executableResponse.json()).error.code,
    "UNSUPPORTED_DOCUMENT",
  );

  const unsupportedResponse = await postDocument(
    repository.ownApplicationId,
    Buffer.from("plain text pretending to be a picture"),
    "photo.png",
    "image/png",
    csrf,
  );
  assert.equal(unsupportedResponse.status, 415);
});

test("oversized uploads and cross-student document access are denied", async () => {
  const csrf = await getCsrf();
  const oversized = Buffer.alloc(10 * 1024 * 1024 + 1, 0x41);
  const oversizedResponse = await postDocument(
    repository.ownApplicationId,
    oversized,
    "large.pdf",
    "application/pdf",
    csrf,
  );
  assert.equal(oversizedResponse.status, 413);
  assert.equal(
    (await oversizedResponse.json()).error.code,
    "DOCUMENT_TOO_LARGE",
  );

  const foreignList = await fetch(
    `${baseUrl}/api/v1/applications/${repository.foreignApplicationId}/documents`,
    { headers: { cookie: studentCookies } },
  );
  assert.equal(foreignList.status, 404);

  const foreignUpload = await postDocument(
    repository.foreignApplicationId,
    Buffer.from("%PDF-1.7\nvalid"),
    "record.pdf",
    "application/pdf",
    csrf,
  );
  assert.equal(foreignUpload.status, 404);
});

test("unauthorized requests and students attempting admin routes are denied", async () => {
  const unauthorized = await fetch(`${baseUrl}/api/v1/applications`);
  assert.equal(unauthorized.status, 401);

  const studentAdmin = await fetch(`${baseUrl}/api/v1/admin`, {
    headers: { cookie: studentCookies },
  });
  assert.equal(studentAdmin.status, 403);
  for (const path of [
    "/api/v1/admin/stats",
    "/api/v1/admin/applications",
    "/api/v1/admin/students",
    "/api/v1/admin/documents",
    `/api/v1/admin/applications/${repository.ownApplicationId}`,
  ]) {
    const denied = await fetch(`${baseUrl}${path}`, {
      headers: { cookie: studentCookies },
    });
    assert.equal(denied.status, 403, path);
  }

  const wrongAdminLogin = await postAuth(
    "admin/login",
    { email: student.email, password: student.password },
    await getCsrf(),
  );
  const errorBody = await wrongAdminLogin.response.json();
  assert.equal(wrongAdminLogin.response.status, 401);
  assert.equal(errorBody.error.code, "INVALID_CREDENTIALS");
  assert.equal(errorBody.error.message, "Email or password is incorrect.");
});

test("logout revokes the session and protects against session replay", async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/logout`, {
    method: "POST",
    headers: {
      origin: "http://localhost:5173",
      "x-csrf-token": studentCsrf.token,
      cookie: studentCookies,
    },
  });
  assert.equal(response.status, 204);

  const replay = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { cookie: studentCookies },
  });
  assert.equal(replay.status, 401);
});

test("registration rejects a caller-supplied role", async () => {
  const csrf = await getCsrf();
  const { response } = await postAuth(
    "register",
    {
      email: `role-${randomUUID()}@example.test`,
      password: "A-Strong-Student-Passphrase-42",
      fullName: "Role Attempt",
      role: "admin",
    },
    csrf,
  );
  assert.equal(response.status, 400);
});

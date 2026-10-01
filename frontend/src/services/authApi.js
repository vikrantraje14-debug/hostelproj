const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1"
).replace(/\/$/, "");

export class AuthApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.code = code;
  }
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  let response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      credentials: "include",
      headers: {
        ...(body && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      ...(body ? { body: isFormData ? body : JSON.stringify(body) } : {}),
    });
  } catch {
    throw new AuthApiError(
      "Unable to reach the service. Check your connection and try again.",
      0,
      "NETWORK_ERROR",
    );
  }

  if (response.status === 204) return null;
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AuthApiError(
      result.error?.message ?? "The request could not be completed.",
      response.status,
      result.error?.code ?? "REQUEST_FAILED",
    );
  }

  return result.data;
}

async function csrfHeaders() {
  const result = await request("/auth/csrf");
  return { "X-CSRF-Token": result.csrfToken };
}

export const authApi = {
  currentUser() {
    return request("/auth/me").then((result) => result.user);
  },

  async registerStudent(values) {
    const headers = await csrfHeaders();
    const result = await request("/auth/register", {
      method: "POST",
      headers,
      body: values,
    });
    return result.user;
  },

  async login(email, password, role = "STUDENT") {
    const headers = await csrfHeaders();
    const endpoint = role === "ADMIN" ? "/auth/admin/login" : "/auth/login";
    const result = await request(endpoint, {
      method: "POST",
      headers,
      body: { email, password },
    });
    return result.user;
  },

  async logout() {
    const headers = await csrfHeaders();
    return request("/auth/logout", { method: "POST", headers });
  },

  studentProfile() {
    return request("/students/me").then((result) => result.profile);
  },

  studentApplications() {
    return request("/applications").then((result) => result.applications);
  },

  studentApplication(applicationId) {
    return request(`/applications/${encodeURIComponent(applicationId)}`).then(
      (result) => result.application,
    );
  },

  searchApplication(referenceNumber) {
    const query = new URLSearchParams({ referenceNumber });
    return request(`/applications/search?${query}`).then(
      (result) => result.application,
    );
  },

  applicationStatus(applicationId) {
    return request(
      `/applications/${encodeURIComponent(applicationId)}/status`,
    ).then((result) => result.status);
  },

  applicationDocuments(applicationId) {
    return request(
      `/applications/${encodeURIComponent(applicationId)}/documents`,
    );
  },

  async uploadDocument(applicationId, file, documentType) {
    const headers = await csrfHeaders();
    const body = new FormData();
    body.set("documentType", documentType);
    body.set("document", file);
    const result = await request(
      `/applications/${encodeURIComponent(applicationId)}/documents`,
      { method: "POST", headers, body },
    );
    return result.document;
  },

  async downloadDocument(applicationId, documentId) {
    let response;
    try {
      response = await fetch(
        `${apiBaseUrl}/applications/${encodeURIComponent(applicationId)}/documents/${encodeURIComponent(documentId)}/content`,
        { credentials: "include" },
      );
    } catch {
      throw new AuthApiError(
        "Unable to reach the service. Check your connection and try again.",
        0,
        "NETWORK_ERROR",
      );
    }
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new AuthApiError(
        result.error?.message ?? "The document could not be downloaded.",
        response.status,
        result.error?.code ?? "REQUEST_FAILED",
      );
    }
    return response.blob();
  },

  adminDashboardStats() {
    return request("/admin/stats").then((result) => result.stats);
  },

  adminApplications(options = {}) {
    const query = new URLSearchParams(options);
    return request(`/admin/applications?${query}`);
  },

  adminApplication(applicationId) {
    return request(
      `/admin/applications/${encodeURIComponent(applicationId)}`,
    ).then((result) => result.application);
  },

  adminStudents(options = {}) {
    const query = new URLSearchParams(options);
    return request(`/admin/students?${query}`);
  },

  adminDocuments(options = {}) {
    const query = new URLSearchParams(options);
    return request(`/admin/documents?${query}`);
  },

  adminContentList(resource, options = {}) {
    const query = new URLSearchParams(options);
    return request(`/admin/content/${encodeURIComponent(resource)}?${query}`);
  },

  adminContentRecord(resource, recordId) {
    return request(
      `/admin/content/${encodeURIComponent(resource)}/${encodeURIComponent(recordId)}`,
    ).then((result) => result.record);
  },

  async createAdminContent(resource, values) {
    const headers = await csrfHeaders();
    const result = await request(
      `/admin/content/${encodeURIComponent(resource)}`,
      { method: "POST", headers, body: values },
    );
    return result.record;
  },

  async updateAdminContent(resource, recordId, values) {
    const headers = await csrfHeaders();
    const result = await request(
      `/admin/content/${encodeURIComponent(resource)}/${encodeURIComponent(recordId)}`,
      { method: "PUT", headers, body: values },
    );
    return result.record;
  },

  async deleteAdminContent(resource, recordId) {
    const headers = await csrfHeaders();
    return request(
      `/admin/content/${encodeURIComponent(resource)}/${encodeURIComponent(recordId)}`,
      { method: "DELETE", headers },
    );
  },

  publicContent(resource) {
    return request(`/${encodeURIComponent(resource)}`).then(
      (result) => result.records,
    );
  },

  publicPage(slug) {
    return request(`/content/pages/${encodeURIComponent(slug)}`).then(
      (result) => result,
    );
  },

  async adminUpdateApplicationStatus(applicationId, status, remarks) {
    const headers = await csrfHeaders();
    const result = await request(
      `/admin/applications/${encodeURIComponent(applicationId)}/status`,
      { method: "PATCH", headers, body: { status, remarks } },
    );
    return result.status;
  },

  async submitApplication(values) {
    const headers = await csrfHeaders();
    const result = await request("/applications", {
      method: "POST",
      headers,
      body: values,
    });
    return result.application;
  },
};

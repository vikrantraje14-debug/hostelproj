import { ApiError } from "../utils/api-error.js";

export function createAdminService({ repository }) {
  return {
    getDashboardStats() {
      return repository.getDashboardStats();
    },

    listApplications(options) {
      return repository.listApplications(options);
    },

    async getApplicationDetails(applicationId) {
      const application = await repository.getApplicationDetails(applicationId);
      if (!application) {
        throw new ApiError(404, "NOT_FOUND", "Application was not found.");
      }
      return application;
    },

    listStudents(options) {
      return repository.listStudents(options);
    },

    listDocuments(options) {
      return repository.listDocuments(options);
    },
  };
}

import { createDatabasePool } from "../config/database.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

export function createPostgresDocumentRepository({
  getPool = createDatabasePool,
} = {}) {
  let pool;

  function getConnectionPool() {
    if (!env.DATABASE_URL) {
      throw new ApiError(
        503,
        "DATABASE_NOT_CONFIGURED",
        "Document service is temporarily unavailable.",
      );
    }
    return (pool ??= getPool());
  }

  return {
    async findApplicationOwner(applicationId) {
      const result = await getConnectionPool().query(
        "SELECT student_user_id FROM applications WHERE id = $1",
        [applicationId],
      );
      return result.rows[0]?.student_user_id ?? null;
    },

    async createDocument(document) {
      const result = await getConnectionPool().query(
        `INSERT INTO application_documents (
          application_id, uploaded_by_user_id, storage_provider, storage_key,
          original_filename, content_type, byte_size, sha256_hex, scan_status,
          document_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'not_scanned', $9)
        RETURNING id, application_id AS "applicationId",
            document_type AS "documentType",
            original_filename AS "originalFilename",
            content_type AS "contentType", byte_size AS "byteSize",
            created_at AS "createdAt"`,
        [
          document.applicationId,
          document.uploadedByUserId,
          document.storageProvider,
          document.storageKey,
          document.originalFilename,
          document.contentType,
          document.byteSize,
          document.sha256Hex,
          document.documentType,
        ],
      );
      return result.rows[0];
    },

    async listDocuments(applicationId) {
      const result = await getConnectionPool().query(
        `SELECT id, application_id, document_type, original_filename,
                content_type, byte_size, created_at
         FROM application_documents
         WHERE application_id = $1
         ORDER BY created_at DESC, id`,
        [applicationId],
      );
      return result.rows;
    },

    async findDocumentForAccess(applicationId, documentId, userId, isAdmin) {
      const result = await getConnectionPool().query(
        `SELECT d.id, d.application_id, d.storage_provider, d.storage_key,
                d.original_filename, d.content_type, d.byte_size, d.created_at
         FROM application_documents d
         JOIN applications a ON a.id = d.application_id
         WHERE d.application_id = $1 AND d.id = $2
           AND ($4::boolean OR a.student_user_id = $3)`,
        [applicationId, documentId, userId, isAdmin],
      );
      return result.rows[0] ?? null;
    },
  };
}

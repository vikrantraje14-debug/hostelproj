import { randomUUID } from "node:crypto";
import { getMongoDatabase } from "../config/database.js";

function publicDocument(document) {
  return {
    id: document._id,
    application_id: document.application_id,
    document_type: document.document_type,
    original_filename: document.original_filename,
    content_type: document.content_type,
    byte_size: document.byte_size,
    created_at: document.created_at,
  };
}

export function createMongoDocumentRepository({
  getDatabase = getMongoDatabase,
} = {}) {
  return {
    async findApplicationOwner(applicationId) {
      const application = await (await getDatabase())
        .collection("applications")
        .findOne(
          { _id: applicationId },
          { projection: { student_user_id: 1 } },
        );
      return application?.student_user_id ?? null;
    },

    async createDocument(document) {
      const collection = (await getDatabase()).collection(
        "application_documents",
      );
      const record = {
        _id: randomUUID(),
        application_id: document.applicationId,
        uploaded_by_user_id: document.uploadedByUserId,
        storage_provider: document.storageProvider,
        storage_key: document.storageKey,
        original_filename: document.originalFilename,
        content_type: document.contentType,
        byte_size: document.byteSize,
        sha256_hex: document.sha256Hex,
        scan_status: "not_scanned",
        document_type: document.documentType,
        created_at: new Date(),
      };
      await collection.insertOne(record);
      return {
        id: record._id,
        applicationId: record.application_id,
        documentType: record.document_type,
        originalFilename: record.original_filename,
        contentType: record.content_type,
        byteSize: record.byte_size,
        createdAt: record.created_at,
      };
    },

    async listDocuments(applicationId) {
      const result = await (await getDatabase())
        .collection("application_documents")
        .find({ application_id: applicationId })
        .sort({ created_at: -1, _id: 1 })
        .toArray();
      return result.map(publicDocument);
    },

    async findDocumentForAccess(applicationId, documentId, userId, isAdmin) {
      const database = await getDatabase();
      const applicationFilter = {
        _id: applicationId,
        ...(isAdmin ? {} : { student_user_id: userId }),
      };
      const application = await database
        .collection("applications")
        .findOne(applicationFilter, { projection: { _id: 1 } });
      if (!application) return null;
      const document = await database
        .collection("application_documents")
        .findOne({ _id: documentId, application_id: applicationId });
      if (!document) return null;
      return {
        id: document._id,
        application_id: document.application_id,
        storage_provider: document.storage_provider,
        storage_key: document.storage_key,
        original_filename: document.original_filename,
        content_type: document.content_type,
        byte_size: document.byte_size,
        created_at: document.created_at,
      };
    },
  };
}

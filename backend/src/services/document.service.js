import { createHash, randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import {
  ALLOWED_FILE_TYPES,
  DOCUMENT_TYPES,
  MAX_DOCUMENT_SIZE,
} from "../config/documents.js";
import { ApiError } from "../utils/api-error.js";

function safeOriginalFilename(filename) {
  const basename = filename.replaceAll("\\", "/").split("/").at(-1) ?? "";
  const cleaned = basename
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .trim()
    .slice(0, 120);
  return cleaned || "uploaded-document";
}

function invalidFile(message = "This file type is not supported.") {
  return new ApiError(415, "UNSUPPORTED_DOCUMENT", message);
}

export function createDocumentService({ repository, storage }) {
  return {
    listDocumentTypes() {
      return Object.entries(DOCUMENT_TYPES).map(([type, config]) => ({
        type,
        label: config.label,
        required: config.required,
        maxBytes: MAX_DOCUMENT_SIZE,
        allowedMimeTypes: [...config.allowedMimeTypes],
      }));
    },

    async uploadDocument({ applicationId, userId, file, documentType }) {
      if (!file?.buffer?.length) {
        throw new ApiError(
          400,
          "DOCUMENT_REQUIRED",
          "Choose a document to upload.",
        );
      }
      if (file.size > MAX_DOCUMENT_SIZE) {
        throw new ApiError(
          413,
          "DOCUMENT_TOO_LARGE",
          "The document exceeds the 10 MB limit.",
        );
      }
      const typeConfig = DOCUMENT_TYPES[documentType];
      if (!typeConfig) {
        throw new ApiError(
          400,
          "INVALID_DOCUMENT_TYPE",
          "Choose a supported document category.",
        );
      }

      const ownerId = await repository.findApplicationOwner(applicationId);
      if (ownerId !== userId) {
        throw new ApiError(404, "NOT_FOUND", "Application was not found.");
      }

      const detected = await fileTypeFromBuffer(file.buffer);
      const fileType =
        detected &&
        Object.values(ALLOWED_FILE_TYPES).find(
          (allowed) => allowed.mimeType === detected.mime,
        );
      if (
        !fileType ||
        !typeConfig.allowedMimeTypes.includes(fileType.mimeType)
      ) {
        throw invalidFile();
      }

      const documentId = randomUUID();
      const storageKey = `${documentId}.${fileType.extension}`;
      const document = {
        applicationId,
        uploadedByUserId: userId,
        storageProvider: storage.provider,
        storageKey,
        originalFilename: safeOriginalFilename(file.originalname),
        contentType: fileType.mimeType,
        byteSize: file.size,
        sha256Hex: createHash("sha256").update(file.buffer).digest("hex"),
        documentType,
      };

      await storage.put(storageKey, file.buffer);
      try {
        const saved = await repository.createDocument(document);
        return {
          id: saved.id,
          applicationId: saved.applicationId ?? saved.application_id,
          documentType: saved.documentType ?? saved.document_type,
          originalFilename: saved.originalFilename ?? saved.original_filename,
          contentType: saved.contentType ?? saved.content_type,
          byteSize: Number(saved.byteSize ?? saved.byte_size),
          createdAt: saved.createdAt ?? saved.created_at,
        };
      } catch (error) {
        await storage.delete(storageKey).catch(() => {});
        throw error;
      }
    },

    async listApplicationDocuments({ applicationId, userId, isAdmin }) {
      if (!isAdmin) {
        const ownerId = await repository.findApplicationOwner(applicationId);
        if (ownerId !== userId) {
          throw new ApiError(404, "NOT_FOUND", "Application was not found.");
        }
      }
      const documents = await repository.listDocuments(applicationId);
      return {
        documents: documents.map((document) => ({
          id: document.id,
          applicationId: document.application_id,
          documentType: document.document_type,
          originalFilename: document.original_filename,
          contentType: document.content_type,
          byteSize: Number(document.byte_size),
          createdAt: document.created_at,
        })),
        requirements: this.listDocumentTypes(),
      };
    },

    async getDocumentContent({ applicationId, documentId, userId, isAdmin }) {
      const document = await repository.findDocumentForAccess(
        applicationId,
        documentId,
        userId,
        isAdmin,
      );
      if (!document) {
        throw new ApiError(404, "NOT_FOUND", "Document was not found.");
      }
      const content = await storage.get(document.storage_key);
      if (!content) {
        throw new ApiError(404, "NOT_FOUND", "Document was not found.");
      }
      return { document, content };
    },
  };
}

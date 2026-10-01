export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

export const DOCUMENT_TYPES = Object.freeze({
  supporting_document: Object.freeze({
    label: "Supporting document",
    required: false,
    allowedMimeTypes: Object.freeze([
      "application/pdf",
      "image/jpeg",
      "image/png",
    ]),
  }),
});

export const ALLOWED_FILE_TYPES = Object.freeze({
  pdf: Object.freeze({ mimeType: "application/pdf", extension: "pdf" }),
  jpg: Object.freeze({ mimeType: "image/jpeg", extension: "jpg" }),
  png: Object.freeze({ mimeType: "image/png", extension: "png" }),
});

export const APPLICATION_STATUSES = Object.freeze([
  "SUBMITTED",
  "UNDER_REVIEW",
  "DOCUMENT_VERIFICATION",
  "APPROVED",
  "REJECTED",
  "ADDITIONAL_INFORMATION_REQUIRED",
]);

export const STATUS_TRANSITIONS = Object.freeze({
  SUBMITTED: Object.freeze(["UNDER_REVIEW"]),
  UNDER_REVIEW: Object.freeze([
    "DOCUMENT_VERIFICATION",
    "APPROVED",
    "REJECTED",
    "ADDITIONAL_INFORMATION_REQUIRED",
  ]),
  DOCUMENT_VERIFICATION: Object.freeze([
    "APPROVED",
    "REJECTED",
    "ADDITIONAL_INFORMATION_REQUIRED",
  ]),
  APPROVED: Object.freeze([]),
  REJECTED: Object.freeze([]),
  ADDITIONAL_INFORMATION_REQUIRED: Object.freeze([
    "UNDER_REVIEW",
    "DOCUMENT_VERIFICATION",
    "APPROVED",
    "REJECTED",
  ]),
});

export function normalizeApplicationStatus(status) {
  return String(status ?? "").toUpperCase();
}

export function isAllowedStatusTransition(previousStatus, newStatus) {
  const previous = normalizeApplicationStatus(previousStatus);
  const next = normalizeApplicationStatus(newStatus);
  return STATUS_TRANSITIONS[previous]?.includes(next) ?? false;
}

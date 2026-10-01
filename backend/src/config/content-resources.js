import { z } from "zod";

const optionalText = (max) => z.string().trim().max(max).nullable().optional();
const status = z.enum(["draft", "published", "archived"]);

export const CONTENT_RESOURCES = Object.freeze({
  hostels: {
    table: "hostels",
    title: "Hostels",
    orderBy: "name ASC",
    publicWhere: "is_active = true",
    columns: {
      code: "code",
      name: "name",
      description: "description",
      address: "address",
      capacity: "capacity",
      isActive: "is_active",
      isDemo: "is_demo",
    },
    publicFields: [
      "id",
      "code",
      "name",
      "description",
      "address",
      "capacity",
      "is_demo",
    ],
    schema: z
      .object({
        code: z
          .string()
          .trim()
          .min(1)
          .max(32)
          .regex(/^[A-Za-z0-9_-]+$/),
        name: z.string().trim().min(2).max(160),
        description: optionalText(2000),
        address: optionalText(500),
        capacity: z.coerce.number().int().min(0).nullable().optional(),
        isActive: z.boolean().optional().default(true),
        isDemo: z.boolean().optional().default(true),
      })
      .strict(),
  },
  facilities: {
    table: "facilities",
    title: "Facilities",
    orderBy: "name ASC",
    publicWhere: "true",
    columns: {
      code: "code",
      name: "name",
      description: "description",
      isDemo: "is_demo",
    },
    publicFields: ["id", "code", "name", "description", "is_demo"],
    schema: z
      .object({
        code: z
          .string()
          .trim()
          .min(1)
          .max(32)
          .regex(/^[A-Za-z0-9_-]+$/),
        name: z.string().trim().min(2).max(160),
        description: optionalText(2000),
        isDemo: z.boolean().optional().default(true),
      })
      .strict(),
  },
  fees: {
    table: "fees",
    title: "Fees",
    orderBy: "effective_from DESC, fee_code ASC",
    publicWhere:
      "is_active = true AND effective_from <= CURRENT_DATE AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)",
    columns: {
      hostelId: "hostel_id",
      feeCode: "fee_code",
      description: "description",
      amount: "amount",
      currency: "currency",
      effectiveFrom: "effective_from",
      effectiveTo: "effective_to",
      isActive: "is_active",
      isDemo: "is_demo",
    },
    publicFields: [
      "id",
      "hostel_id",
      "fee_code",
      "description",
      "amount",
      "currency",
      "effective_from",
      "effective_to",
      "is_demo",
    ],
    schema: z
      .object({
        hostelId: z.string().uuid().nullable().optional(),
        feeCode: z.string().trim().min(1).max(40),
        description: z.string().trim().min(1).max(500),
        amount: z.coerce.number().finite().min(0).max(9999999999.99),
        currency: z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^[A-Z]{3}$/),
        effectiveFrom: z.string().date(),
        effectiveTo: z.string().date().nullable().optional(),
        isActive: z.boolean().optional().default(true),
        isDemo: z.boolean().optional().default(true),
      })
      .strict()
      .refine(
        (value) =>
          !value.effectiveTo || value.effectiveTo >= value.effectiveFrom,
        {
          message: "End date must be on or after the start date.",
          path: ["effectiveTo"],
        },
      ),
  },
  notices: {
    table: "notices",
    title: "Notices",
    orderBy: "created_at DESC",
    publicWhere:
      "status = 'published' AND (expires_at IS NULL OR expires_at >= now())",
    columns: {
      title: "title",
      body: "body",
      status: "status",
      expiresAt: "expires_at",
      isDemo: "is_demo",
    },
    publicFields: [
      "id",
      "title",
      "body",
      "published_at",
      "expires_at",
      "is_demo",
    ],
    statusColumn: "status",
    schema: z
      .object({
        title: z.string().trim().min(3).max(200),
        body: z.string().trim().min(1).max(20000),
        status,
        expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
        isDemo: z.boolean().optional().default(true),
      })
      .strict(),
  },
  rules: {
    table: "rules",
    title: "Rules",
    orderBy: "effective_from DESC NULLS LAST, rule_code ASC",
    publicWhere:
      "status = 'published' AND (effective_from IS NULL OR effective_from <= CURRENT_DATE) AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)",
    columns: {
      ruleCode: "rule_code",
      title: "title",
      body: "body",
      status: "status",
      effectiveFrom: "effective_from",
      effectiveTo: "effective_to",
      isDemo: "is_demo",
    },
    publicFields: [
      "id",
      "rule_code",
      "title",
      "body",
      "effective_from",
      "effective_to",
      "is_demo",
    ],
    statusColumn: "status",
    schema: z
      .object({
        ruleCode: z.string().trim().min(1).max(40),
        title: z.string().trim().min(3).max(200),
        body: z.string().trim().min(1).max(20000),
        status,
        effectiveFrom: z.string().date().nullable().optional(),
        effectiveTo: z.string().date().nullable().optional(),
        isDemo: z.boolean().optional().default(true),
      })
      .strict()
      .refine(
        (value) =>
          !value.effectiveTo ||
          !value.effectiveFrom ||
          value.effectiveTo >= value.effectiveFrom,
        {
          message: "End date must be on or after the start date.",
          path: ["effectiveTo"],
        },
      ),
  },
  "important-dates": {
    table: "important_dates",
    title: "Important Dates",
    orderBy: "admission_year DESC, starts_at ASC NULLS LAST",
    publicWhere: "status = 'published'",
    columns: {
      admissionYear: "admission_year",
      eventCode: "event_code",
      title: "title",
      description: "description",
      startsAt: "starts_at",
      endsAt: "ends_at",
      status: "status",
      isDemo: "is_demo",
    },
    publicFields: [
      "id",
      "admission_year",
      "event_code",
      "title",
      "description",
      "starts_at",
      "ends_at",
      "is_demo",
    ],
    statusColumn: "status",
    schema: z
      .object({
        admissionYear: z.coerce.number().int().min(1900).max(2200),
        eventCode: z.string().trim().min(1).max(60),
        title: z.string().trim().min(3).max(200),
        description: optionalText(2000),
        startsAt: z.string().datetime({ offset: true }).nullable().optional(),
        endsAt: z.string().datetime({ offset: true }).nullable().optional(),
        status,
        isDemo: z.boolean().optional().default(true),
      })
      .strict()
      .refine(
        (value) =>
          !value.endsAt || (value.startsAt && value.endsAt >= value.startsAt),
        {
          message: "An end date requires a start date and must not precede it.",
          path: ["endsAt"],
        },
      ),
  },
  settings: {
    table: "site_settings",
    title: "Settings",
    orderBy: "setting_key ASC",
    publicWhere: "is_public = true",
    columns: {
      key: "setting_key",
      value: "setting_value",
      isPublic: "is_public",
      isDemo: "is_demo",
    },
    publicFields: ["id", "setting_key", "setting_value", "is_demo"],
    schema: z
      .object({
        key: z
          .string()
          .trim()
          .min(2)
          .max(120)
          .regex(/^[A-Za-z0-9._:-]+$/),
        value: z
          .unknown()
          .refine((value) => value !== undefined, "Value is required."),
        isPublic: z.boolean().default(false),
        isDemo: z.boolean().default(true),
      })
      .strict(),
  },
});

export const CONTENT_RESOURCE_NAMES = Object.freeze(
  Object.keys(CONTENT_RESOURCES),
);

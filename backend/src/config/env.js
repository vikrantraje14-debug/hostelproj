import "dotenv/config";
import { z } from "zod";

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    MONGODB_URI: z.string().url().optional(),
    MONGODB_DB_NAME: z.string().trim().min(1).optional(),
    DOCUMENT_STORAGE_PATH: z.string().min(1).optional(),
    SESSION_SECRET: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(32).optional(),
    ),
    SEED_DEMO_DATA: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  })
  .superRefine((values, context) => {
    if (values.NODE_ENV !== "production") return;

    if (
      !values.MONGODB_URI ||
      !/^mongodb(?:\+srv)?:\/\//i.test(values.MONGODB_URI)
    ) {
      context.addIssue({
        code: "custom",
        path: ["MONGODB_URI"],
        message: "Production requires a MongoDB MONGODB_URI.",
      });
    } else {
      const mongoUrl = new URL(values.MONGODB_URI);
      const tlsOverride = [...mongoUrl.searchParams.entries()].some(
        ([key, value]) => {
          const normalizedKey = key.toLowerCase();
          const normalizedValue = value.toLowerCase();
          return (
            ((normalizedKey === "tls" || normalizedKey === "ssl") &&
              normalizedValue === "false") ||
            ((normalizedKey === "tlsinsecure" ||
              normalizedKey === "tlsallowinvalidcertificates" ||
              normalizedKey === "tlsallowinvalidhostnames") &&
              normalizedValue === "true")
          );
        },
      );
      if (tlsOverride) {
        context.addIssue({
          code: "custom",
          path: ["MONGODB_URI"],
          message:
            "Production MONGODB_URI must not disable TLS validation.",
        });
      }
    }
    if (!values.SESSION_SECRET || values.SESSION_SECRET.length < 43) {
      context.addIssue({
        code: "custom",
        path: ["SESSION_SECRET"],
        message:
          "Production requires a randomly generated SESSION_SECRET of at least 43 characters.",
      });
    }
    if (!process.env.CLIENT_ORIGIN) {
      context.addIssue({
        code: "custom",
        path: ["CLIENT_ORIGIN"],
        message: "Production requires an explicit HTTPS CLIENT_ORIGIN.",
      });
      return;
    }
    const clientOrigin = new URL(values.CLIENT_ORIGIN);
    if (
      clientOrigin.protocol !== "https:" ||
      clientOrigin.origin !== values.CLIENT_ORIGIN
    ) {
      context.addIssue({
        code: "custom",
        path: ["CLIENT_ORIGIN"],
        message:
          "Production CLIENT_ORIGIN must be a canonical HTTPS origin without a path.",
      });
    }
  });

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const details = parsedEnvironment.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = Object.freeze(parsedEnvironment.data);

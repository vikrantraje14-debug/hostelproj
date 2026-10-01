import { MongoClient } from "mongodb";
import { env } from "./env.js";
import { ApiError } from "../utils/api-error.js";

let databasePromise;
let indexesPromise;

async function initializeIndexes(database) {
  await Promise.all([
    database.collection("users").createIndex({ email: 1 }, { unique: true }),
    database
      .collection("user_sessions")
      .createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }),
    database
      .collection("applications")
      .createIndex({ reference_number: 1 }, { unique: true }),
    database.collection("applications").createIndex(
      { student_user_id: 1, admission_year: 1 },
      {
        unique: true,
        partialFilterExpression: {
          status: {
            $in: [
              "draft",
              "submitted",
              "under_review",
              "document_verification",
              "approved",
              "rejected",
              "additional_information_required",
            ],
          },
        },
      },
    ),
    database
      .collection("application_documents")
      .createIndex({ storage_key: 1 }, { unique: true }),
    database.collection("hostels").createIndex({ code: 1 }, { unique: true }),
    database
      .collection("facilities")
      .createIndex({ code: 1 }, { unique: true }),
    database
      .collection("fees")
      .createIndex(
        { fee_code: 1 },
        { unique: true, partialFilterExpression: { hostel_id: null } },
      ),
    database.collection("fees").createIndex(
      { hostel_id: 1, fee_code: 1 },
      {
        unique: true,
        partialFilterExpression: { hostel_id: { $type: "string" } },
      },
    ),
    database
      .collection("rules")
      .createIndex({ rule_code: 1 }, { unique: true }),
    database
      .collection("important_dates")
      .createIndex({ admission_year: 1, event_code: 1 }, { unique: true }),
    database
      .collection("site_settings")
      .createIndex({ setting_key: 1 }, { unique: true }),
  ]);
}

export async function getMongoDatabase() {
  if (!env.MONGODB_URI) {
    throw new ApiError(
      503,
      "DATABASE_NOT_CONFIGURED",
      "MongoDB is not configured.",
    );
  }

  databasePromise ??= (async () => {
    const client = new MongoClient(env.MONGODB_URI, {
      appName: "government-hostel-admission-portal",
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5_000,
      ...(env.NODE_ENV === "production"
        ? {
            tls: true,
            tlsAllowInvalidCertificates: false,
            tlsAllowInvalidHostnames: false,
          }
        : {}),
    });
    try {
      await client.connect();
      const database = client.db(env.MONGODB_DB_NAME || undefined);
      indexesPromise ??= initializeIndexes(database).catch((error) => {
        indexesPromise = undefined;
        throw error;
      });
      await indexesPromise;
      return database;
    } catch {
      await client.close().catch(() => {});
      databasePromise = undefined;
      throw new ApiError(
        503,
        "DATABASE_UNAVAILABLE",
        "MongoDB is temporarily unavailable.",
      );
    }
  })();

  return databasePromise;
}

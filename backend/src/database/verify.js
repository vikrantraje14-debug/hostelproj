import { env } from "../config/env.js";
import { getMongoDatabase } from "../config/database.js";
import { log } from "../utils/logger.js";

const expectedIndexes = [
  ["users", "email_1"],
  ["user_sessions", "expires_at_1"],
  ["applications", "reference_number_1"],
  ["application_documents", "storage_key_1"],
  ["site_settings", "setting_key_1"],
];

async function verifyMongoDatabase() {
  if (env.NODE_ENV !== "development") {
    throw new Error("Mongo verification is restricted to NODE_ENV=development.");
  }
  const database = await getMongoDatabase();
  await database.command({ ping: 1 });
  for (const [collectionName, indexName] of expectedIndexes) {
    const indexes = await database.collection(collectionName).listIndexes().toArray();
    if (!indexes.some((index) => index.name === indexName)) {
      throw new Error(`Missing MongoDB index for collection ${collectionName}.`);
    }
  }
  log("info", "Mongo database verification passed", {
    checks: ["connection ping", "user email uniqueness", "session expiry", "application/document/settings indexes"],
  });
}

verifyMongoDatabase().catch((error) => {
  log("error", "Mongo database verification failed", { errorName: error.name });
  process.exitCode = 1;
});

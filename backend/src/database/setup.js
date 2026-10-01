import { getMongoDatabase } from "../config/database.js";
import { log } from "../utils/logger.js";

try {
  const database = await getMongoDatabase();
  await database.command({ ping: 1 });
  log("info", "MongoDB indexes are ready", { database: database.databaseName });
} catch (error) {
  log("error", "MongoDB setup failed", { errorName: error.name });
  process.exitCode = 1;
}
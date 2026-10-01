import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { ApiError } from "../utils/api-error.js";

export function createLocalDocumentStorage({
  rootDirectory = path.resolve(process.cwd(), "private-uploads"),
} = {}) {
  return {
    provider: "local_development",

    async put(storageKey, bytes) {
      const destination = path.resolve(rootDirectory, storageKey);
      if (
        !destination.startsWith(`${path.resolve(rootDirectory)}${path.sep}`)
      ) {
        throw new ApiError(400, "INVALID_STORAGE_KEY", "Invalid storage key.");
      }
      await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
      await writeFile(destination, bytes, { flag: "wx", mode: 0o600 });
    },

    async get(storageKey) {
      const destination = path.resolve(rootDirectory, storageKey);
      if (
        !destination.startsWith(`${path.resolve(rootDirectory)}${path.sep}`)
      ) {
        return null;
      }
      try {
        return await readFile(destination);
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
    },

    async delete(storageKey) {
      const destination = path.resolve(rootDirectory, storageKey);
      if (
        !destination.startsWith(`${path.resolve(rootDirectory)}${path.sep}`)
      ) {
        return;
      }
      await unlink(destination).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
    },
  };
}

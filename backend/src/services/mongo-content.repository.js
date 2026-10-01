import { randomUUID } from "node:crypto";
import { getMongoDatabase } from "../config/database.js";
import { CONTENT_RESOURCES } from "../config/content-resources.js";
import { ApiError } from "../utils/api-error.js";

function toMongo(resource, input) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [resource.columns[key], value]),
  );
}

function toAdmin(resource, document) {
  if (!document) return null;
  return {
    id: document._id,
    ...Object.fromEntries(
      Object.entries(resource.columns).map(([key, column]) => [
        key,
        document[column],
      ]),
    ),
    createdAt: document.created_at,
    updatedAt: document.updated_at,
  };
}

function publicFilter(resourceName, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  if (resourceName === "hostels") return { is_active: true };
  if (resourceName === "fees") {
    return {
      is_active: true,
      effective_from: { $lte: today },
      $or: [{ effective_to: null }, { effective_to: { $gte: today } }],
    };
  }
  if (resourceName === "notices") {
    return {
      status: "published",
      $or: [{ expires_at: null }, { expires_at: { $gte: now.toISOString() } }],
    };
  }
  if (resourceName === "rules") {
    return {
      status: "published",
      $and: [
        {
          $or: [{ effective_from: null }, { effective_from: { $lte: today } }],
        },
        {
          $or: [{ effective_to: null }, { effective_to: { $gte: today } }],
        },
      ],
    };
  }
  if (resourceName === "important-dates") return { status: "published" };
  if (resourceName === "settings") return { is_public: true };
  return {};
}

function toPublic(resource, document) {
  return Object.fromEntries(
    resource.publicFields.map((field) => [
      field,
      field === "id" ? document._id : document[field],
    ]),
  );
}

function createSafeSearchFilter(resource, search) {
  if (!search) return {};
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const searchableFields = Object.entries(resource.columns)
    .filter(([key]) =>
      [
        "name",
        "title",
        "code",
        "feeCode",
        "ruleCode",
        "eventCode",
        "key",
        "description",
      ].includes(key),
    )
    .map(([, column]) => ({
      [column]: { $regex: escaped, $options: "i" },
    }));
  return searchableFields.length ? { $or: searchableFields } : {};
}

export function createMongoContentRepository({
  getDatabase = getMongoDatabase,
} = {}) {
  async function writeAudit(database, entry, session) {
    await database.collection("audit_logs").insertOne(
      {
        actor_user_id: entry.actorUserId,
        action: entry.action,
        entity_type: entry.resourceName,
        entity_id: entry.entityId,
        before_state: entry.before ?? null,
        after_state: entry.after ?? null,
        request_id: entry.requestId ?? null,
        ip_address: entry.ipAddress ?? null,
        created_at: new Date(),
      },
      { session },
    );
  }

  async function withAuditTransaction(operation) {
    const database = await getDatabase();
    const session = database.client.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await operation(database, session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  return {
    async listAdmin(resourceName, { page, pageSize, search }) {
      const resource = CONTENT_RESOURCES[resourceName];
      const collection = (await getDatabase()).collection(resource.table);
      const filter = createSafeSearchFilter(resource, search);
      const [documents, total] = await Promise.all([
        collection
          .find(filter)
          .sort({ created_at: -1, _id: 1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .toArray(),
        collection.countDocuments(filter),
      ]);
      return {
        records: documents.map((document) => toAdmin(resource, document)),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    },

    async getAdmin(resourceName, id) {
      const resource = CONTENT_RESOURCES[resourceName];
      const document = await (await getDatabase())
        .collection(resource.table)
        .findOne({ _id: id });
      return toAdmin(resource, document);
    },

    async create(resourceName, values, context) {
      const resource = CONTENT_RESOURCES[resourceName];
      return withAuditTransaction(async (database, session) => {
        const timestamp = new Date();
        const record = {
          _id: randomUUID(),
          ...toMongo(resource, values),
          created_at: timestamp,
          updated_at: timestamp,
          ...(resourceName === "settings"
            ? { updated_by_user_id: context.actorUserId }
            : {}),
          ...(resource.statusColumn && values.status === "published"
            ? {
                published_by_user_id: context.actorUserId,
                published_at: timestamp,
              }
            : {}),
        };
        await database
          .collection(resource.table)
          .insertOne(record, { session });
        await writeAudit(
          database,
          {
            ...context,
            action: "create",
            resourceName,
            entityId: record._id,
            after: record,
          },
          session,
        );
        return toAdmin(resource, record);
      });
    },

    async update(resourceName, id, values, context) {
      const resource = CONTENT_RESOURCES[resourceName];
      return withAuditTransaction(async (database, session) => {
        const collection = database.collection(resource.table);
        const before = await collection.findOne({ _id: id }, { session });
        if (!before) {
          throw new ApiError(404, "NOT_FOUND", "Content record was not found.");
        }
        const changes = {
          ...toMongo(resource, values),
          updated_at: new Date(),
          ...(resourceName === "settings"
            ? { updated_by_user_id: context.actorUserId }
            : {}),
        };
        if (resource.statusColumn && values.status === "published") {
          changes.published_at = before.published_at ?? new Date();
          changes.published_by_user_id = context.actorUserId;
        } else if (resource.statusColumn && values.status === "draft") {
          changes.published_at = null;
          changes.published_by_user_id = null;
        }
        const after = await collection.findOneAndUpdate(
          { _id: id },
          { $set: changes },
          { returnDocument: "after", includeResultMetadata: false, session },
        );
        await writeAudit(
          database,
          {
            ...context,
            action: "update",
            resourceName,
            entityId: id,
            before,
            after,
          },
          session,
        );
        return toAdmin(resource, after);
      });
    },

    async delete(resourceName, id, context) {
      const resource = CONTENT_RESOURCES[resourceName];
      return withAuditTransaction(async (database, session) => {
        const collection = database.collection(resource.table);
        const before = await collection.findOne({ _id: id }, { session });
        if (!before) {
          throw new ApiError(404, "NOT_FOUND", "Content record was not found.");
        }
        if (resourceName === "hostels") {
          const after = await collection.findOneAndUpdate(
            { _id: id },
            { $set: { is_active: false, updated_at: new Date() } },
            { returnDocument: "after", includeResultMetadata: false, session },
          );
          await writeAudit(
            database,
            {
              ...context,
              action: "deactivate",
              resourceName,
              entityId: id,
              before,
              after,
            },
            session,
          );
          return { deactivated: true };
        }
        await collection.deleteOne({ _id: id }, { session });
        await writeAudit(
          database,
          { ...context, action: "delete", resourceName, entityId: id, before },
          session,
        );
        return { deleted: true };
      });
    },

    async listPublic(resourceName) {
      const resource = CONTENT_RESOURCES[resourceName];
      const documents = await (await getDatabase())
        .collection(resource.table)
        .find(publicFilter(resourceName))
        .sort({ created_at: -1, _id: 1 })
        .toArray();
      return documents.map((document) => toPublic(resource, document));
    },

    async getPublic(resourceName, id) {
      const resource = CONTENT_RESOURCES[resourceName];
      const document = await (await getDatabase())
        .collection(resource.table)
        .findOne({ _id: id, ...publicFilter(resourceName) });
      return document ? toPublic(resource, document) : null;
    },

    async getPublicPage(slug) {
      const setting = await (await getDatabase())
        .collection("site_settings")
        .findOne({ setting_key: `public_page:${slug}`, is_public: true });
      return setting
        ? { page: setting.setting_value, isDemo: setting.is_demo }
        : null;
    },
  };
}

import { createDatabasePool } from "../config/database.js";
import { env } from "../config/env.js";
import { CONTENT_RESOURCES } from "../config/content-resources.js";
import { ApiError } from "../utils/api-error.js";

function getColumnNames(resource) {
  return Object.entries(resource.columns);
}

function toPublicRecord(resource, row) {
  return Object.fromEntries(
    resource.publicFields.map((field) => [field, row[field]]),
  );
}

function toAdminRecord(resource, row) {
  return {
    id: row.id,
    ...Object.fromEntries(
      Object.entries(resource.columns).map(([key, column]) => [
        key,
        row[column],
      ]),
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createPostgresContentRepository({
  getPool = createDatabasePool,
} = {}) {
  let pool;

  function getConnectionPool() {
    if (!env.DATABASE_URL) {
      throw new ApiError(
        503,
        "DATABASE_NOT_CONFIGURED",
        "Content management is unavailable until the database is configured.",
      );
    }
    return (pool ??= getPool());
  }

  async function audit(
    client,
    {
      actorUserId,
      action,
      resourceName,
      entityId,
      before,
      after,
      requestId,
      ipAddress,
    },
  ) {
    await client.query(
      `INSERT INTO audit_logs (
        actor_user_id, action, entity_type, entity_id, before_state,
        after_state, request_id, ip_address
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)`,
      [
        actorUserId,
        action,
        resourceName,
        entityId,
        before ? JSON.stringify(before) : null,
        after ? JSON.stringify(after) : null,
        requestId ?? null,
        ipAddress ?? null,
      ],
    );
  }

  return {
    async listAdmin(resourceName, { page, pageSize, search }) {
      const resource = CONTENT_RESOURCES[resourceName];
      const database = getConnectionPool();
      const values = [];
      let where = "";
      if (search) {
        const searchable = getColumnNames(resource)
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
          .map(([, column]) => `${column}::text ILIKE $1 ESCAPE '!'`);
        if (searchable.length) {
          values.push(`%${search.replace(/[!%_]/g, "!$&")}%`);
          where = `WHERE (${searchable.join(" OR ")})`;
        }
      }
      const count = await database.query(
        `SELECT count(*)::int AS total FROM ${resource.table} ${where}`,
        values,
      );
      const total = count.rows[0].total;
      const result = await database.query(
        `SELECT * FROM ${resource.table} ${where}
         ORDER BY ${resource.orderBy}
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, pageSize, (page - 1) * pageSize],
      );
      return {
        records: result.rows.map((row) => toAdminRecord(resource, row)),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    },

    async getAdmin(resourceName, id) {
      const resource = CONTENT_RESOURCES[resourceName];
      const result = await getConnectionPool().query(
        `SELECT * FROM ${resource.table} WHERE id = $1`,
        [id],
      );
      return result.rows[0] ? toAdminRecord(resource, result.rows[0]) : null;
    },

    async create(resourceName, values, context) {
      const resource = CONTENT_RESOURCES[resourceName];
      const client = await getConnectionPool().connect();
      try {
        await client.query("BEGIN");
        const columns = Object.entries(values).map(
          ([key]) => resource.columns[key],
        );
        const parameters = Object.entries(values).map(([key, value]) =>
          resourceName === "settings" && key === "value"
            ? JSON.stringify(value)
            : value,
        );
        if (resourceName === "settings") {
          columns.push("updated_by_user_id");
          parameters.push(context.actorUserId);
        }
        if (resource.statusColumn && values.status === "published") {
          columns.push("published_by_user_id", "published_at");
          parameters.push(context.actorUserId, new Date());
        }
        const placeholders = parameters.map((_, index) => `$${index + 1}`);
        const result = await client.query(
          `INSERT INTO ${resource.table} (${columns.join(", ")})
           VALUES (${placeholders.join(", ")}) RETURNING *`,
          parameters,
        );
        const record = result.rows[0];
        await audit(client, {
          ...context,
          action: "create",
          resourceName,
          entityId: record.id,
          after: record,
        });
        await client.query("COMMIT");
        return toAdminRecord(resource, record);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },

    async update(resourceName, id, values, context) {
      const resource = CONTENT_RESOURCES[resourceName];
      const client = await getConnectionPool().connect();
      try {
        await client.query("BEGIN");
        const existing = await client.query(
          `SELECT * FROM ${resource.table} WHERE id = $1 FOR UPDATE`,
          [id],
        );
        const before = existing.rows[0];
        if (!before) {
          throw new ApiError(404, "NOT_FOUND", "Content record was not found.");
        }
        const entries = Object.entries(values);
        const assignments = entries.map(
          ([key], index) => `${resource.columns[key]} = $${index + 2}`,
        );
        const parameters = [
          id,
          ...entries.map(([key, value]) =>
            resourceName === "settings" && key === "value"
              ? JSON.stringify(value)
              : value,
          ),
        ];
        if (resourceName === "settings") {
          assignments.push(`updated_by_user_id = $${parameters.length + 1}`);
          parameters.push(context.actorUserId);
        }
        if (resource.statusColumn && values.status === "published") {
          assignments.push("published_at = COALESCE(published_at, now())");
          assignments.push(
            "published_by_user_id = $" + (parameters.length + 1),
          );
          parameters.push(context.actorUserId);
        } else if (resource.statusColumn && values.status === "draft") {
          assignments.push("published_at = NULL");
          assignments.push("published_by_user_id = NULL");
        }
        const result = await client.query(
          `UPDATE ${resource.table} SET ${assignments.join(", ")}
           WHERE id = $1 RETURNING *`,
          parameters,
        );
        const after = result.rows[0];
        await audit(client, {
          ...context,
          action: "update",
          resourceName,
          entityId: id,
          before,
          after,
        });
        await client.query("COMMIT");
        return toAdminRecord(resource, after);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },

    async delete(resourceName, id, context) {
      const resource = CONTENT_RESOURCES[resourceName];
      const client = await getConnectionPool().connect();
      try {
        await client.query("BEGIN");
        const existing = await client.query(
          `SELECT * FROM ${resource.table} WHERE id = $1 FOR UPDATE`,
          [id],
        );
        const before = existing.rows[0];
        if (!before) {
          throw new ApiError(404, "NOT_FOUND", "Content record was not found.");
        }
        if (resourceName === "hostels") {
          const result = await client.query(
            "UPDATE hostels SET is_active = false WHERE id = $1 RETURNING *",
            [id],
          );
          await audit(client, {
            ...context,
            action: "deactivate",
            resourceName,
            entityId: id,
            before,
            after: result.rows[0],
          });
          await client.query("COMMIT");
          return { deactivated: true };
        }
        await client.query(`DELETE FROM ${resource.table} WHERE id = $1`, [id]);
        await audit(client, {
          ...context,
          action: "delete",
          resourceName,
          entityId: id,
          before,
        });
        await client.query("COMMIT");
        return { deleted: true };
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },

    async listPublic(resourceName) {
      const resource = CONTENT_RESOURCES[resourceName];
      const result = await getConnectionPool().query(
        `SELECT ${resource.publicFields.join(", ")} FROM ${resource.table}
         WHERE ${resource.publicWhere} ORDER BY ${resource.orderBy}`,
      );
      return result.rows.map((row) => toPublicRecord(resource, row));
    },

    async getPublic(resourceName, id) {
      const resource = CONTENT_RESOURCES[resourceName];
      const result = await getConnectionPool().query(
        `SELECT ${resource.publicFields.join(", ")} FROM ${resource.table}
           WHERE id = $1 AND ${resource.publicWhere}`,
        [id],
      );
      return result.rows[0] ? toPublicRecord(resource, result.rows[0]) : null;
    },

    async getPublicPage(slug) {
      const result = await getConnectionPool().query(
        `SELECT setting_value, is_demo FROM site_settings
         WHERE setting_key = $1 AND is_public = true`,
        [`public_page:${slug}`],
      );
      return result.rows[0]
        ? { page: result.rows[0].setting_value, isDemo: result.rows[0].is_demo }
        : null;
    },
  };
}

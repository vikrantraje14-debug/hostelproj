const upStatements = [
  `CREATE TABLE fees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id uuid REFERENCES hostels(id) ON DELETE SET NULL,
    fee_code text NOT NULL,
    description text NOT NULL,
    amount numeric(12, 2) NOT NULL,
    currency char(3) NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    is_active boolean NOT NULL DEFAULT true,
    is_demo boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fees_amount_check CHECK (amount >= 0),
    CONSTRAINT fees_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT fees_effective_dates_check CHECK (
      effective_to IS NULL OR effective_to >= effective_from
    )
  )`,
  `CREATE UNIQUE INDEX fees_hostel_code_unique_idx
    ON fees (hostel_id, fee_code) WHERE hostel_id IS NOT NULL`,
  `CREATE UNIQUE INDEX fees_global_code_unique_idx
    ON fees (fee_code) WHERE hostel_id IS NULL`,
  `CREATE INDEX fees_active_effective_idx
    ON fees (is_active, effective_from, effective_to)`,
  `CREATE TABLE notices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    body text NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    published_by_user_id uuid REFERENCES admins(user_id) ON DELETE SET NULL,
    published_at timestamptz,
    expires_at timestamptz,
    is_demo boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT notices_status_check CHECK (
      status IN ('draft', 'published', 'archived')
    ),
    CONSTRAINT notices_published_at_check CHECK (
      status <> 'published' OR published_at IS NOT NULL
    ),
    CONSTRAINT notices_expiry_check CHECK (
      expires_at IS NULL OR published_at IS NULL OR expires_at >= published_at
    )
  )`,
  `CREATE INDEX notices_published_idx
    ON notices (published_at DESC) WHERE status = 'published'`,
  `CREATE INDEX notices_publisher_idx ON notices (published_by_user_id)`,
  `CREATE TABLE rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code text NOT NULL UNIQUE,
    title text NOT NULL,
    body text NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    published_by_user_id uuid REFERENCES admins(user_id) ON DELETE SET NULL,
    published_at timestamptz,
    effective_from date,
    effective_to date,
    is_demo boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT rules_status_check CHECK (
      status IN ('draft', 'published', 'archived')
    ),
    CONSTRAINT rules_published_at_check CHECK (
      status <> 'published' OR published_at IS NOT NULL
    ),
    CONSTRAINT rules_effective_dates_check CHECK (
      effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from
    )
  )`,
  `CREATE INDEX rules_published_idx
    ON rules (effective_from, effective_to) WHERE status = 'published'`,
  `CREATE TABLE important_dates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_year smallint NOT NULL,
    event_code text NOT NULL,
    title text NOT NULL,
    description text,
    starts_at timestamptz,
    ends_at timestamptz,
    status text NOT NULL DEFAULT 'draft',
    published_by_user_id uuid REFERENCES admins(user_id) ON DELETE SET NULL,
    published_at timestamptz,
    is_demo boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT important_dates_admission_year_check CHECK (
      admission_year BETWEEN 1900 AND 2200
    ),
    CONSTRAINT important_dates_status_check CHECK (
      status IN ('draft', 'published', 'archived')
    ),
    CONSTRAINT important_dates_published_at_check CHECK (
      status <> 'published' OR published_at IS NOT NULL
    ),
    CONSTRAINT important_dates_range_check CHECK (
      ends_at IS NULL OR (starts_at IS NOT NULL AND ends_at >= starts_at)
    ),
    CONSTRAINT important_dates_event_unique UNIQUE (admission_year, event_code)
  )`,
  `CREATE INDEX important_dates_published_year_idx
    ON important_dates (admission_year, starts_at) WHERE status = 'published'`,
  `CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    before_state jsonb,
    after_state jsonb,
    request_id uuid,
    ip_address inet,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT audit_logs_action_check CHECK (length(btrim(action)) > 0),
    CONSTRAINT audit_logs_entity_type_check CHECK (length(btrim(entity_type)) > 0)
  )`,
  `CREATE INDEX audit_logs_created_idx ON audit_logs (created_at DESC)`,
  `CREATE INDEX audit_logs_actor_created_idx
    ON audit_logs (actor_user_id, created_at DESC)`,
  `CREATE INDEX audit_logs_entity_idx
    ON audit_logs (entity_type, entity_id, created_at DESC)`,
];

const timestampedTables = ["fees", "notices", "rules", "important_dates"];

export function up(pgm) {
  upStatements.forEach((statement) => pgm.sql(statement));
  timestampedTables.forEach((table) => {
    pgm.sql(`CREATE TRIGGER ${table}_updated_at BEFORE UPDATE ON ${table}
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);
  });
}

export function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS
    audit_logs,
    important_dates,
    rules,
    notices,
    fees
    CASCADE`);
}

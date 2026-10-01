const upStatements = [
  `CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL,
    account_status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_email_normalized_check CHECK (
      email = lower(btrim(email)) AND position('@' IN email) > 1
    ),
    CONSTRAINT users_password_hash_format_check CHECK (
      password_hash LIKE '$argon2id$%'
      OR password_hash LIKE '$2a$%'
      OR password_hash LIKE '$2b$%'
      OR password_hash LIKE '$2y$%'
    ),
    CONSTRAINT users_role_check CHECK (role IN ('student', 'admin')),
    CONSTRAINT users_account_status_check CHECK (
      account_status IN ('active', 'disabled', 'locked')
    )
  )`,
  `CREATE INDEX users_role_status_idx ON users (role, account_status)`,
  `COMMENT ON COLUMN users.password_hash IS 'Argon2id or bcrypt encoded hash only; never plaintext.'`,
  `CREATE TABLE students (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    student_number text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX students_student_number_unique_idx
    ON students (student_number) WHERE student_number IS NOT NULL`,
  `CREATE TABLE admins (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE FUNCTION enforce_profile_account_role() RETURNS trigger
    LANGUAGE plpgsql AS $$
    DECLARE expected_role text;
    DECLARE actual_role text;
    BEGIN
      expected_role := CASE TG_TABLE_NAME
        WHEN 'students' THEN 'student'
        WHEN 'admins' THEN 'admin'
      END;
      SELECT role INTO actual_role FROM users WHERE id = NEW.user_id;
      IF actual_role IS DISTINCT FROM expected_role THEN
        RAISE EXCEPTION 'Profile type does not match account role'
          USING ERRCODE = '23514';
      END IF;
      RETURN NEW;
    END;
    $$`,
  `CREATE TRIGGER students_role_guard
    BEFORE INSERT OR UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION enforce_profile_account_role()`,
  `CREATE TRIGGER admins_role_guard
    BEFORE INSERT OR UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION enforce_profile_account_role()`,
  `CREATE FUNCTION prevent_profile_role_change() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.role IS DISTINCT FROM OLD.role AND (
        (NEW.role = 'student' AND EXISTS (
          SELECT 1 FROM admins WHERE user_id = NEW.id
        ))
        OR
        (NEW.role = 'admin' AND EXISTS (
          SELECT 1 FROM students WHERE user_id = NEW.id
        ))
      ) THEN
        RAISE EXCEPTION 'Account role conflicts with existing profile'
          USING ERRCODE = '23514';
      END IF;
      RETURN NEW;
    END;
    $$`,
  `CREATE TRIGGER users_profile_role_guard
    BEFORE UPDATE OF role ON users
    FOR EACH ROW EXECUTE FUNCTION prevent_profile_role_change()`,
  `CREATE TABLE hostels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    address text,
    capacity integer,
    is_active boolean NOT NULL DEFAULT true,
    is_demo boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT hostels_capacity_check CHECK (capacity IS NULL OR capacity >= 0)
  )`,
  `CREATE INDEX hostels_active_name_idx ON hostels (name) WHERE is_active = true`,
  `CREATE TABLE facilities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    is_demo boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE hostel_facilities (
    hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (hostel_id, facility_id)
  )`,
  `CREATE INDEX hostel_facilities_facility_idx
    ON hostel_facilities (facility_id, hostel_id)`,
  `CREATE TABLE applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_user_id uuid NOT NULL REFERENCES students(user_id) ON DELETE RESTRICT,
    hostel_preference_id uuid REFERENCES hostels(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'draft',
    full_name text NOT NULL,
    date_of_birth date NOT NULL,
    gender text NOT NULL,
    mobile_number text NOT NULL,
    contact_email text NOT NULL,
    address text NOT NULL,
    college text NOT NULL,
    course text NOT NULL,
    branch text NOT NULL,
    year_of_study smallint NOT NULL,
    roll_number text NOT NULL,
    student_number_snapshot text,
    admission_year smallint NOT NULL,
    guardian_name text NOT NULL,
    guardian_relationship text NOT NULL,
    guardian_mobile text NOT NULL,
    guardian_address text NOT NULL,
    guardian_other_information text,
    hostel_other_information text,
    submitted_at timestamptz,
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT applications_status_check CHECK (
      status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'withdrawn')
    ),
    CONSTRAINT applications_year_of_study_check CHECK (
      year_of_study BETWEEN 1 AND 20
    ),
    CONSTRAINT applications_admission_year_check CHECK (
      admission_year BETWEEN 1900 AND 2200
    ),
    CONSTRAINT applications_email_normalized_check CHECK (
      contact_email = lower(btrim(contact_email))
      AND position('@' IN contact_email) > 1
    )
  )`,
  `CREATE INDEX applications_student_created_idx
    ON applications (student_user_id, created_at DESC)`,
  `CREATE INDEX applications_status_created_idx
    ON applications (status, created_at DESC)`,
  `CREATE INDEX applications_year_status_idx
    ON applications (admission_year, status)`,
  `CREATE INDEX applications_hostel_preference_idx
    ON applications (hostel_preference_id)`,
  `CREATE TABLE application_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    uploaded_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    storage_provider text NOT NULL,
    storage_key text NOT NULL UNIQUE,
    original_filename text NOT NULL,
    content_type text NOT NULL,
    byte_size bigint NOT NULL,
    sha256_hex text,
    scan_status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT application_documents_provider_check CHECK (
      storage_provider IN ('s3_compatible', 'local_development', 'other')
    ),
    CONSTRAINT application_documents_size_check CHECK (byte_size > 0),
    CONSTRAINT application_documents_sha256_check CHECK (
      sha256_hex IS NULL OR sha256_hex ~ '^[0-9a-fA-F]{64}$'
    ),
    CONSTRAINT application_documents_scan_status_check CHECK (
      scan_status IN ('pending', 'clean', 'rejected', 'not_scanned')
    )
  )`,
  `CREATE INDEX application_documents_application_created_idx
    ON application_documents (application_id, created_at DESC)`,
  `COMMENT ON TABLE application_documents IS 'Metadata and external object-storage keys only; never store file bytes here.'`,
  `CREATE TABLE application_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    previous_status text,
    new_status text NOT NULL,
    changed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT application_history_previous_status_check CHECK (
      previous_status IS NULL OR previous_status IN (
        'draft', 'submitted', 'under_review', 'approved', 'rejected', 'withdrawn'
      )
    ),
    CONSTRAINT application_history_new_status_check CHECK (
      new_status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'withdrawn')
    )
  )`,
  `CREATE INDEX application_status_history_application_created_idx
    ON application_status_history (application_id, created_at DESC)`,
  `CREATE INDEX application_status_history_actor_idx
    ON application_status_history (changed_by_user_id, created_at DESC)`,
  `CREATE FUNCTION set_updated_at() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$`,
];

const timestampedTables = [
  "users",
  "students",
  "admins",
  "hostels",
  "facilities",
  "applications",
  "application_documents",
];

export function up(pgm) {
  upStatements.forEach((statement) => pgm.sql(statement));
  timestampedTables.forEach((table) => {
    pgm.sql(`CREATE TRIGGER ${table}_updated_at BEFORE UPDATE ON ${table}
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);
  });
}

export function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS
    application_status_history,
    application_documents,
    applications,
    hostel_facilities,
    facilities,
    hostels,
    admins,
    students,
    users
    CASCADE`);
  pgm.sql("DROP FUNCTION IF EXISTS set_updated_at() CASCADE");
  pgm.sql("DROP FUNCTION IF EXISTS prevent_profile_role_change() CASCADE");
  pgm.sql("DROP FUNCTION IF EXISTS enforce_profile_account_role() CASCADE");
}

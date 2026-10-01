export function up(pgm) {
  pgm.sql(
    `CREATE TABLE site_settings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      setting_key text NOT NULL UNIQUE,
      setting_value jsonb NOT NULL,
      is_public boolean NOT NULL DEFAULT false,
      is_demo boolean NOT NULL DEFAULT true,
      updated_by_user_id uuid REFERENCES admins(user_id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT site_settings_key_check CHECK (
        setting_key ~ '^[A-Za-z0-9._:-]{2,120}$'
      )
    )`,
  );
  pgm.sql(
    `CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON site_settings
     FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
  );
  pgm.sql(
    "COMMENT ON TABLE site_settings IS 'Private portal configuration and explicitly publishable JSON page content; demo by default.'",
  );
}

export function down(pgm) {
  pgm.sql("DROP TABLE IF EXISTS site_settings CASCADE");
}

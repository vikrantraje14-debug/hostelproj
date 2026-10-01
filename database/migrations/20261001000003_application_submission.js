const upStatements = [
  `ALTER TABLE applications ADD COLUMN reference_number text`,
  `UPDATE applications
   SET reference_number = 'GHA-' || admission_year::text || '-' ||
     upper(substr(replace(id::text, '-', ''), 1, 12))
   WHERE reference_number IS NULL`,
  `ALTER TABLE applications ALTER COLUMN reference_number SET NOT NULL`,
  `ALTER TABLE applications
   ADD CONSTRAINT applications_reference_number_unique UNIQUE (reference_number)`,
  `ALTER TABLE applications
   ADD COLUMN hostel_preference_snapshot text`,
  `CREATE UNIQUE INDEX applications_one_active_per_student_year_idx
   ON applications (student_user_id, admission_year)
   WHERE status <> 'withdrawn'`,
  `COMMENT ON COLUMN applications.reference_number IS 'Public acknowledgement reference; not a credential.'`,
  `COMMENT ON COLUMN applications.hostel_preference_snapshot IS 'Submitted preference label snapshot. Use hostel_preference_id only for a verified hostel row.'`,
];

export function up(pgm) {
  upStatements.forEach((statement) => pgm.sql(statement));
}

export function down(pgm) {
  pgm.sql("DROP INDEX IF EXISTS applications_one_active_per_student_year_idx");
  pgm.sql(
    "ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_reference_number_unique",
  );
  pgm.sql(
    "ALTER TABLE applications DROP COLUMN IF EXISTS hostel_preference_snapshot, DROP COLUMN IF EXISTS reference_number",
  );
}

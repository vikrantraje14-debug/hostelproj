const statusValues = `
  'draft', 'withdrawn', 'submitted', 'under_review',
  'document_verification', 'approved', 'rejected',
  'additional_information_required'
`;

export function up(pgm) {
  pgm.sql(
    `ALTER TABLE applications
       DROP CONSTRAINT applications_status_check,
       ADD CONSTRAINT applications_status_check
         CHECK (status IN (${statusValues}))`,
  );
  pgm.sql(
    `ALTER TABLE application_status_history
       DROP CONSTRAINT application_history_previous_status_check,
       DROP CONSTRAINT application_history_new_status_check,
       ADD CONSTRAINT application_history_previous_status_check
         CHECK (previous_status IS NULL OR previous_status IN (${statusValues})),
       ADD CONSTRAINT application_history_new_status_check
         CHECK (new_status IN (${statusValues})),
       ADD COLUMN student_remarks text`,
  );
  pgm.sql(
    `ALTER TABLE application_status_history
       ADD CONSTRAINT application_history_student_remarks_check
       CHECK (student_remarks IS NULL OR length(student_remarks) <= 1000)`,
  );
  pgm.sql(
    `CREATE FUNCTION record_application_status_history() RETURNS trigger
     LANGUAGE plpgsql AS $$
     BEGIN
       INSERT INTO application_status_history (
         application_id, previous_status, new_status, changed_by_user_id,
         student_remarks
       ) VALUES (
         NEW.id, OLD.status, NEW.status,
         NULLIF(current_setting('app.status_changed_by_user_id', true), '')::uuid,
         NULLIF(current_setting('app.status_student_remarks', true), '')
       );
       RETURN NEW;
     END;
     $$`,
  );
  pgm.sql(
    `CREATE TRIGGER applications_status_history_trigger
     AFTER UPDATE OF status ON applications
     FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
     EXECUTE FUNCTION record_application_status_history()`,
  );
}

export function down(pgm) {
  pgm.sql(
    "DROP TRIGGER IF EXISTS applications_status_history_trigger ON applications",
  );
  pgm.sql("DROP FUNCTION IF EXISTS record_application_status_history()");
  pgm.sql(
    `ALTER TABLE application_status_history
       DROP CONSTRAINT IF EXISTS application_history_student_remarks_check,
       DROP COLUMN IF EXISTS student_remarks,
       DROP CONSTRAINT IF EXISTS application_history_previous_status_check,
       DROP CONSTRAINT IF EXISTS application_history_new_status_check,
       ADD CONSTRAINT application_history_previous_status_check
         CHECK (previous_status IS NULL OR previous_status IN (
           'draft', 'submitted', 'under_review', 'approved', 'rejected', 'withdrawn'
         )),
       ADD CONSTRAINT application_history_new_status_check
         CHECK (new_status IN (
           'draft', 'submitted', 'under_review', 'approved', 'rejected', 'withdrawn'
         ))`,
  );
  pgm.sql(
    `ALTER TABLE applications
       DROP CONSTRAINT IF EXISTS applications_status_check,
       ADD CONSTRAINT applications_status_check
         CHECK (status IN (
           'draft', 'submitted', 'under_review', 'approved', 'rejected', 'withdrawn'
         ))`,
  );
}

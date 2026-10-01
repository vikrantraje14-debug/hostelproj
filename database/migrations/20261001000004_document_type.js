export function up(pgm) {
  pgm.sql(
    `ALTER TABLE application_documents
     ADD COLUMN document_type text NOT NULL DEFAULT 'supporting_document',
     ADD CONSTRAINT application_documents_type_check
       CHECK (length(btrim(document_type)) > 0)`,
  );
}

export function down(pgm) {
  pgm.sql(
    `ALTER TABLE application_documents
     DROP CONSTRAINT IF EXISTS application_documents_type_check,
     DROP COLUMN IF EXISTS document_type`,
  );
}

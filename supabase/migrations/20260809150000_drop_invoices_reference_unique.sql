-- extraQuote (job-billing "New Quote") intentionally sets invoices.reference
-- to the job's own ref (e.g. "OP-3661") for every quote on that job, so a
-- second quote on the same job always violated this unique constraint and
-- silently failed to save ("Email sent, but the quote status couldn't be
-- saved"). Reference no longer needs to be globally unique.
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_reference_key;

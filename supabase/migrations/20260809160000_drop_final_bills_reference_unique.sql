-- reference is now a per-job sequence label ("Invoice-01", "Invoice-02", ...)
-- shown in the REF field, so it legitimately repeats across different jobs'
-- first/second/etc invoice. Global uniqueness no longer applies.
ALTER TABLE final_bills DROP CONSTRAINT IF EXISTS final_bills_reference_key;

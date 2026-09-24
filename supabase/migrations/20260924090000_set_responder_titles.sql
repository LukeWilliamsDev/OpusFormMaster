-- The database role is an access role. Keep the public-facing responder title
-- accurate for named internal contacts whose business position is known.

CREATE OR REPLACE FUNCTION private.populate_third_party_note_reply_author()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  SELECT
    split_part(COALESCE(NULLIF(trim(full_name), ''), email), ' ', 1),
    CASE
      WHEN lower(COALESCE(full_name, '')) = 'toby green'
        OR lower(COALESCE(email, '')) = 'toby@opusform.co.uk' THEN 'director'
      ELSE role::text
    END
  INTO NEW.author_first_name, NEW.author_role
  FROM public.profiles
  WHERE id = NEW.author_id;
  RETURN NEW;
END;
$$;

UPDATE public.third_party_job_note_replies r
SET author_role = 'director'
FROM public.profiles p
WHERE p.id = r.author_id
  AND (lower(COALESCE(p.full_name, '')) = 'toby green'
    OR lower(COALESCE(p.email, '')) = 'toby@opusform.co.uk');

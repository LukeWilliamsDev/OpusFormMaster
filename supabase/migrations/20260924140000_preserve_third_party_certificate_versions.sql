-- Keep every third-party certificate upload as an immutable audit record while
-- exposing the latest version of each certificate type to the staff view.

CREATE OR REPLACE FUNCTION private.refresh_third_party_staff_documents(_staff_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.staff s
  SET tickets = COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', d.id,
      'type', d.ticket_type,
      'ticketNumber', d.ticket_number,
      'expiryDate', d.expiry_date,
      'verified', false,
      'documentUrl', d.file_path,
      'createdAt', d.created_at
    ) ORDER BY d.created_at)
    FROM public.third_party_staff_documents d
    WHERE d.staff_id = _staff_id
  ), '[]'::jsonb),
  uploaded_certificates = COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', d.id,
      'name', d.file_name,
      'size', d.file_size_bytes,
      'uploadedAt', d.created_at,
      'documentUrl', d.file_path
    ) ORDER BY d.created_at)
    FROM public.third_party_staff_documents d
    WHERE d.staff_id = _staff_id
  ), '[]'::jsonb)
  WHERE s.id = _staff_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.link_third_party_staff_documents()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.approved_staff_id IS NOT NULL
     AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.approved_staff_id IS DISTINCT FROM NEW.approved_staff_id) THEN
    UPDATE public.third_party_staff_documents
      SET staff_id = NEW.approved_staff_id
      WHERE submission_id = NEW.id AND staff_id IS NULL;
    PERFORM private.refresh_third_party_staff_documents(NEW.approved_staff_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.sync_third_party_staff_document()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.staff_id IS NOT NULL THEN
    PERFORM private.refresh_third_party_staff_documents(NEW.staff_id);
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE v_staff_id text;
BEGIN
  FOR v_staff_id IN
    SELECT DISTINCT staff_id
    FROM public.third_party_staff_documents
    WHERE staff_id IS NOT NULL
  LOOP
    PERFORM private.refresh_third_party_staff_documents(v_staff_id);
  END LOOP;
END;
$$;


-- ============================================================
-- 1. DOCUMENT STATUS ENUM
-- ============================================================
CREATE TYPE public.document_version_status AS ENUM ('draft', 'in_review', 'approved', 'superseded');

-- ============================================================
-- 2. DOCUMENT_VERSIONS TABLE
-- ============================================================
CREATE TABLE public.document_versions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id         uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  organisation_id     uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  version_number      integer NOT NULL DEFAULT 1,
  status              public.document_version_status NOT NULL DEFAULT 'draft',
  content_json        jsonb NOT NULL DEFAULT '{}',
  change_summary      text,
  is_immutable        boolean NOT NULL DEFAULT false,
  created_by          uuid NOT NULL REFERENCES auth.users(id),
  approved_by         uuid REFERENCES auth.users(id),
  approved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_doc_version UNIQUE (document_id, version_number)
);

CREATE INDEX idx_doc_versions_doc ON public.document_versions(document_id);
CREATE INDEX idx_doc_versions_org ON public.document_versions(organisation_id);
CREATE INDEX idx_doc_versions_status ON public.document_versions(status);

-- ============================================================
-- 3. ADD current_version_id TO documents
-- ============================================================
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS current_version_id uuid REFERENCES public.document_versions(id);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS type text;

-- ============================================================
-- 4. DOCUMENT TYPE SCHEMAS
-- ============================================================
CREATE TABLE public.document_type_schemas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid REFERENCES public.organisations(id) ON DELETE CASCADE,
  document_type       text NOT NULL,
  required_sections   text[] NOT NULL DEFAULT '{}',
  requires_signature  boolean NOT NULL DEFAULT false,
  schema_json         jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_doc_type_schema UNIQUE (organisation_id, document_type)
);

CREATE INDEX idx_doc_type_schemas_org ON public.document_type_schemas(organisation_id);

-- Seed system defaults
INSERT INTO public.document_type_schemas (organisation_id, document_type, required_sections, requires_signature, schema_json)
VALUES
  (NULL, 'risk_assessment', ARRAY['title','scope','hazards','controls','residual_risk','reviewer'], true,
    '{"required":["title","scope","hazards","controls","residual_risk"]}'),
  (NULL, 'method_statement', ARRAY['title','scope','sequence','plant_equipment','emergency','reviewer'], true,
    '{"required":["title","scope","sequence","emergency"]}'),
  (NULL, 'inspection_report', ARRAY['title','location','findings','actions','inspector'], false,
    '{"required":["title","location","findings"]}'),
  (NULL, 'toolbox_talk', ARRAY['title','scope','hazards','controls','attendees'], false,
    '{"required":["title","scope","hazards","controls"]}')
ON CONFLICT (organisation_id, document_type) DO NOTHING;

-- ============================================================
-- 5. EVIDENCE ITEMS
-- ============================================================
CREATE TABLE public.evidence_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  document_version_id uuid NOT NULL REFERENCES public.document_versions(id) ON DELETE CASCADE,
  type                text NOT NULL CHECK (type IN ('photo','note','annotation','signature','file_attachment')),
  storage_path        text,
  caption             text,
  sort_order          integer NOT NULL DEFAULT 0,
  metadata_json       jsonb NOT NULL DEFAULT '{}',
  created_by          uuid NOT NULL REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_version ON public.evidence_items(document_version_id);
CREATE INDEX idx_evidence_org ON public.evidence_items(organisation_id);
CREATE INDEX idx_evidence_sort ON public.evidence_items(document_version_id, sort_order);

-- ============================================================
-- 6. SIGNATURES
-- ============================================================
CREATE TABLE public.document_signatures (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id       uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  document_version_id   uuid NOT NULL REFERENCES public.document_versions(id) ON DELETE CASCADE,
  signed_by             uuid NOT NULL REFERENCES auth.users(id),
  role_at_time          text NOT NULL,
  full_name_at_time     text NOT NULL,
  signature_image_path  text,
  typed_signature       text,
  signed_at             timestamptz NOT NULL DEFAULT now(),
  purpose               text NOT NULL DEFAULT 'approval' CHECK (purpose IN ('approval','witness','author')),
  ip_address            inet,
  CONSTRAINT uq_sig_per_user_version UNIQUE (document_version_id, signed_by, purpose)
);

CREATE INDEX idx_sigs_version ON public.document_signatures(document_version_id);
CREATE INDEX idx_sigs_org ON public.document_signatures(organisation_id);

-- ============================================================
-- 7. EXPORTS
-- ============================================================
CREATE TABLE public.document_exports (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id       uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  document_version_id   uuid NOT NULL REFERENCES public.document_versions(id) ON DELETE CASCADE,
  status                text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  storage_path          text,
  created_by            uuid NOT NULL REFERENCES auth.users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  completed_at          timestamptz,
  error                 text
);

-- Partial unique index: at most one pending or completed export per version
CREATE UNIQUE INDEX idx_exports_idempotent ON public.document_exports(document_version_id) WHERE status IN ('pending', 'completed');
CREATE INDEX idx_exports_org ON public.document_exports(organisation_id);
CREATE INDEX idx_exports_status ON public.document_exports(status, created_at DESC);

-- ============================================================
-- 8. HELPER FUNCTIONS
-- ============================================================

-- Single-param is_org_member using auth.uid()
CREATE OR REPLACE FUNCTION public.is_org_member_current(p_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organisation_members
    WHERE profile_id = auth.uid() AND organisation_id = p_org_id AND status = 'active'
  )
$$;

-- Can manage documents (site_manager+)
CREATE OR REPLACE FUNCTION public.can_manage_documents(p_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organisation_members
    WHERE profile_id = auth.uid()
      AND organisation_id = p_org_id
      AND role IN ('owner', 'admin', 'site_manager')
      AND status = 'active'
  )
$$;

-- Can read documents (any org member)
CREATE OR REPLACE FUNCTION public.can_read_document(p_doc_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.organisation_members om ON om.organisation_id = d.organisation_id
    WHERE d.id = p_doc_id AND om.profile_id = auth.uid() AND om.status = 'active'
  )
$$;

-- Get org role for current user
CREATE OR REPLACE FUNCTION public.get_org_role(p_org_id uuid)
RETURNS member_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.organisation_members
  WHERE profile_id = auth.uid() AND organisation_id = p_org_id AND status = 'active'
  LIMIT 1
$$;

-- ============================================================
-- 9. WORKFLOW TRANSITION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.transition_document_version(
  p_version_id  uuid,
  p_to_status   text,
  p_actor_id    uuid DEFAULT auth.uid(),
  p_reject_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_version   record;
  v_role      member_role;
  v_schema    record;
  v_errors    text[] := '{}';
  v_section   text;
  v_content   jsonb;
BEGIN
  SELECT dv.*, d.organisation_id AS doc_org_id, d.type AS doc_type, d.project_id
  INTO v_version
  FROM public.document_versions dv
  JOIN public.documents d ON d.id = dv.document_id
  WHERE dv.id = p_version_id
  FOR UPDATE OF dv;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Version not found');
  END IF;

  v_role := public.get_org_role(v_version.doc_org_id);
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not a member of this organisation');
  END IF;

  CASE
    WHEN p_to_status = 'in_review' THEN
      IF v_version.status != 'draft' THEN
        RETURN jsonb_build_object('ok', false, 'error', format('Cannot request review from state: %s', v_version.status));
      END IF;
      IF v_role NOT IN ('owner', 'admin', 'site_manager') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Insufficient role to request review');
      END IF;

    WHEN p_to_status = 'approved' THEN
      IF v_version.status != 'in_review' THEN
        RETURN jsonb_build_object('ok', false, 'error', format('Cannot approve from state: %s', v_version.status));
      END IF;
      IF v_role NOT IN ('owner', 'admin') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Insufficient role to approve');
      END IF;
      -- Validation gate
      v_content := v_version.content_json;
      SELECT * INTO v_schema
      FROM public.document_type_schemas
      WHERE document_type = v_version.doc_type
        AND (organisation_id = v_version.doc_org_id OR organisation_id IS NULL)
      ORDER BY organisation_id NULLS LAST
      LIMIT 1;

      IF FOUND THEN
        FOREACH v_section IN ARRAY v_schema.required_sections LOOP
          IF v_content ->> v_section IS NULL OR trim(v_content ->> v_section) = '' THEN
            v_errors := v_errors || format('Required section missing or empty: %s', v_section);
          END IF;
        END LOOP;
        IF v_schema.requires_signature THEN
          IF NOT EXISTS (
            SELECT 1 FROM public.document_signatures
            WHERE document_version_id = p_version_id AND purpose IN ('author', 'approval')
          ) THEN
            v_errors := v_errors || 'At least one signature is required for approval';
          END IF;
        END IF;
        IF array_length(v_errors, 1) > 0 THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Validation failed', 'validation_errors', to_jsonb(v_errors));
        END IF;
      END IF;

    WHEN p_to_status = 'draft' THEN
      IF v_version.status != 'in_review' THEN
        RETURN jsonb_build_object('ok', false, 'error', format('Cannot reject from state: %s', v_version.status));
      END IF;
      IF v_role NOT IN ('owner', 'admin') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Insufficient role to reject');
      END IF;

    ELSE
      RETURN jsonb_build_object('ok', false, 'error', format('Invalid target status: %s', p_to_status));
  END CASE;

  -- Apply transition
  IF p_to_status = 'approved' THEN
    UPDATE public.document_versions
    SET status = 'approved', approved_by = p_actor_id, approved_at = now(), is_immutable = true
    WHERE id = p_version_id;
    UPDATE public.documents SET status = 'approved', current_version_id = p_version_id WHERE id = v_version.document_id;

  ELSIF p_to_status = 'in_review' THEN
    UPDATE public.document_versions SET status = 'in_review' WHERE id = p_version_id;
    UPDATE public.documents SET status = 'in_review' WHERE id = v_version.document_id;

  ELSIF p_to_status = 'draft' THEN
    UPDATE public.document_versions
    SET status = 'draft',
        content_json = content_json || jsonb_build_object('_rejection', jsonb_build_object('rejected_by', p_actor_id, 'rejected_at', now(), 'note', coalesce(p_reject_note, '')))
    WHERE id = p_version_id;
    UPDATE public.documents SET status = 'draft' WHERE id = v_version.document_id;
  END IF;

  -- Audit
  PERFORM public.log_audit_event(
    v_version.doc_org_id, 'document_version', p_version_id,
    CASE p_to_status WHEN 'in_review' THEN 'request_review' WHEN 'approved' THEN 'approve' WHEN 'draft' THEN 'reject' END,
    jsonb_build_object('document_id', v_version.document_id, 'version', v_version.version_number, 'actor', p_actor_id, 'reject_note', p_reject_note)
  );

  RETURN jsonb_build_object('ok', true, 'version_id', p_version_id, 'status', p_to_status);
END;
$$;

-- ============================================================
-- 10. CREATE NEXT VERSION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_next_document_version(
  p_document_id    uuid,
  p_change_summary text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_doc         record;
  v_max_ver     integer;
  v_new_ver_id  uuid;
  v_old_ver_id  uuid;
  v_role        member_role;
BEGIN
  SELECT * INTO v_doc FROM public.documents WHERE id = p_document_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found: %', p_document_id;
  END IF;

  v_role := public.get_org_role(v_doc.organisation_id);
  IF v_role NOT IN ('owner', 'admin', 'site_manager') THEN
    RAISE EXCEPTION 'Insufficient role to create new version';
  END IF;

  IF v_doc.status NOT IN ('approved', 'superseded') THEN
    RAISE EXCEPTION 'Can only create new version from approved document. Current: %', v_doc.status;
  END IF;

  SELECT coalesce(max(version_number), 0) INTO v_max_ver
  FROM public.document_versions WHERE document_id = p_document_id;

  v_old_ver_id := v_doc.current_version_id;

  INSERT INTO public.document_versions (document_id, organisation_id, version_number, content_json, change_summary, created_by, status, is_immutable)
  SELECT p_document_id, v_doc.organisation_id, v_max_ver + 1, content_json, p_change_summary, auth.uid(), 'draft', false
  FROM public.document_versions WHERE id = v_old_ver_id
  RETURNING id INTO v_new_ver_id;

  IF v_old_ver_id IS NOT NULL THEN
    UPDATE public.document_versions SET status = 'superseded' WHERE id = v_old_ver_id;
  END IF;

  UPDATE public.documents SET status = 'draft', current_version_id = v_new_ver_id WHERE id = p_document_id;

  PERFORM public.log_audit_event(
    v_doc.organisation_id, 'document_version', v_new_ver_id, 'create_new_version',
    jsonb_build_object('document_id', p_document_id, 'new_version', v_max_ver + 1, 'superseded_version', v_old_ver_id, 'change_summary', p_change_summary)
  );

  RETURN v_new_ver_id;
END;
$$;

-- ============================================================
-- 11. TRIGGER: Protect approved evidence items
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_protect_approved_evidence()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_immutable boolean;
BEGIN
  SELECT is_immutable INTO v_immutable
  FROM public.document_versions
  WHERE id = coalesce(NEW.document_version_id, OLD.document_version_id);

  IF v_immutable THEN
    RAISE EXCEPTION 'Cannot modify evidence for an approved (immutable) document version' USING ERRCODE = 'P0003';
  END IF;
  RETURN coalesce(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_protect_approved_evidence
  BEFORE UPDATE OR DELETE ON public.evidence_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_protect_approved_evidence();

CREATE TRIGGER trg_protect_approved_signatures
  BEFORE UPDATE OR DELETE ON public.document_signatures
  FOR EACH ROW EXECUTE FUNCTION public.trg_protect_approved_evidence();

-- ============================================================
-- 12. TRIGGER: Audit evidence + signature inserts
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_audit_evidence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.log_audit_event(
    NEW.organisation_id, TG_TABLE_NAME, NEW.id,
    CASE TG_OP WHEN 'INSERT' THEN 'upload' ELSE 'delete' END,
    jsonb_build_object('type', CASE WHEN TG_TABLE_NAME = 'evidence_items' THEN NEW.type ELSE 'signature' END, 'document_version_id', NEW.document_version_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_evidence_insert AFTER INSERT ON public.evidence_items FOR EACH ROW EXECUTE FUNCTION public.trg_audit_evidence();
CREATE TRIGGER trg_audit_signature_insert AFTER INSERT ON public.document_signatures FOR EACH ROW EXECUTE FUNCTION public.trg_audit_evidence();

-- updated_at triggers
CREATE TRIGGER trg_doc_versions_updated_at BEFORE UPDATE ON public.document_versions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_doc_type_schemas_updated_at BEFORE UPDATE ON public.document_type_schemas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 13. RLS POLICIES
-- ============================================================

-- document_versions
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions FORCE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view versions" ON public.document_versions FOR SELECT
  USING (public.is_org_member_current(organisation_id));

CREATE POLICY "Site managers can create versions" ON public.document_versions FOR INSERT
  WITH CHECK (public.can_manage_documents(organisation_id));

CREATE POLICY "Site managers can update draft versions" ON public.document_versions FOR UPDATE
  USING (public.can_manage_documents(organisation_id) AND NOT is_immutable);

-- document_type_schemas
ALTER TABLE public.document_type_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_type_schemas FORCE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read schemas" ON public.document_type_schemas FOR SELECT
  USING (organisation_id IS NULL OR public.is_org_member_current(organisation_id));

CREATE POLICY "Admins can manage schemas" ON public.document_type_schemas FOR ALL
  USING (public.is_org_admin(auth.uid(), organisation_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organisation_id));

-- evidence_items
ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_items FORCE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view evidence" ON public.evidence_items FOR SELECT
  USING (public.is_org_member_current(organisation_id));

CREATE POLICY "Managers can add evidence" ON public.evidence_items FOR INSERT
  WITH CHECK (public.can_manage_documents(organisation_id));

CREATE POLICY "Managers can delete evidence" ON public.evidence_items FOR DELETE
  USING (public.can_manage_documents(organisation_id));

-- document_signatures
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signatures FORCE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view signatures" ON public.document_signatures FOR SELECT
  USING (public.is_org_member_current(organisation_id));

CREATE POLICY "Org members can add signatures" ON public.document_signatures FOR INSERT
  WITH CHECK (public.is_org_member_current(organisation_id));

-- document_exports
ALTER TABLE public.document_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_exports FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exports or managers can view all" ON public.document_exports FOR SELECT
  USING (created_by = auth.uid() OR public.can_manage_documents(organisation_id));

CREATE POLICY "Managers can create exports" ON public.document_exports FOR INSERT
  WITH CHECK (public.can_manage_documents(organisation_id));

-- Service role can update exports (for edge function status updates)
CREATE POLICY "Service can update exports" ON public.document_exports FOR UPDATE
  USING (true)
  WITH CHECK (true);

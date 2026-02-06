export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          actor_id: string | null
          created_at: string
          description: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          organisation_id: string
          project_id: string | null
          user_agent: string | null
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          actor_id?: string | null
          created_at?: string
          description: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organisation_id: string
          project_id?: string | null
          user_agent?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          actor_id?: string | null
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organisation_id?: string
          project_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_acknowledgements: {
        Row: {
          acknowledged_at: string
          company_name: string | null
          document_id: string
          full_name: string
          id: string
          ip_address: string | null
          organisation_id: string
          profile_id: string
          signature_data: string
          user_agent: string | null
        }
        Insert: {
          acknowledged_at?: string
          company_name?: string | null
          document_id: string
          full_name: string
          id?: string
          ip_address?: string | null
          organisation_id: string
          profile_id: string
          signature_data: string
          user_agent?: string | null
        }
        Update: {
          acknowledged_at?: string
          company_name?: string | null
          document_id?: string
          full_name?: string
          id?: string
          ip_address?: string | null
          organisation_id?: string
          profile_id?: string
          signature_data?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_acknowledgements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_acknowledgements_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_acknowledgements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          acknowledgement_deadline: string | null
          ai_category: Database["public"]["Enums"]["document_category"] | null
          ai_compliance_flags: Json | null
          ai_confidence: string | null
          approved_at: string | null
          approved_by: string | null
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          description: string | null
          file_path: string
          file_size: number
          id: string
          mime_type: string
          name: string
          organisation_id: string
          parent_document_id: string | null
          project_id: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requires_acknowledgement: boolean | null
          status: string
          updated_at: string
          uploaded_by: string
          version: number
        }
        Insert: {
          acknowledgement_deadline?: string | null
          ai_category?: Database["public"]["Enums"]["document_category"] | null
          ai_compliance_flags?: Json | null
          ai_confidence?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          description?: string | null
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          name: string
          organisation_id: string
          parent_document_id?: string | null
          project_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_acknowledgement?: boolean | null
          status?: string
          updated_at?: string
          uploaded_by: string
          version?: number
        }
        Update: {
          acknowledgement_deadline?: string | null
          ai_category?: Database["public"]["Enums"]["document_category"] | null
          ai_compliance_flags?: Json | null
          ai_confidence?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          name?: string
          organisation_id?: string
          parent_document_id?: string | null
          project_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_acknowledgement?: boolean | null
          status?: string
          updated_at?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_witnesses: {
        Row: {
          created_at: string
          id: string
          incident_id: string
          organisation_id: string
          statement_date: string | null
          witness_company: string | null
          witness_contact: string | null
          witness_name: string
          witness_statement: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          incident_id: string
          organisation_id: string
          statement_date?: string | null
          witness_company?: string | null
          witness_contact?: string | null
          witness_name: string
          witness_statement?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          incident_id?: string
          organisation_id?: string
          statement_date?: string | null
          witness_company?: string | null
          witness_contact?: string | null
          witness_name?: string
          witness_statement?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_witnesses_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_witnesses_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          body_part_affected: string | null
          closed_at: string | null
          closed_by: string | null
          corrective_actions: string | null
          created_at: string
          description: string
          id: string
          immediate_actions: string | null
          incident_date: string
          incident_number: string
          incident_time: string | null
          injured_person_company: string | null
          injured_person_name: string | null
          injured_person_occupation: string | null
          injury_description: string | null
          investigated_by: string | null
          investigation_completed_at: string | null
          investigation_notes: string | null
          is_riddor_reportable: boolean | null
          location: string | null
          organisation_id: string
          photos: string[] | null
          project_id: string | null
          reported_by: string | null
          riddor_reference: string | null
          riddor_reported_at: string | null
          root_cause: string | null
          severity: Database["public"]["Enums"]["incident_severity"]
          status: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at: string
        }
        Insert: {
          body_part_affected?: string | null
          closed_at?: string | null
          closed_by?: string | null
          corrective_actions?: string | null
          created_at?: string
          description: string
          id?: string
          immediate_actions?: string | null
          incident_date: string
          incident_number: string
          incident_time?: string | null
          injured_person_company?: string | null
          injured_person_name?: string | null
          injured_person_occupation?: string | null
          injury_description?: string | null
          investigated_by?: string | null
          investigation_completed_at?: string | null
          investigation_notes?: string | null
          is_riddor_reportable?: boolean | null
          location?: string | null
          organisation_id: string
          photos?: string[] | null
          project_id?: string | null
          reported_by?: string | null
          riddor_reference?: string | null
          riddor_reported_at?: string | null
          root_cause?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at?: string
        }
        Update: {
          body_part_affected?: string | null
          closed_at?: string | null
          closed_by?: string | null
          corrective_actions?: string | null
          created_at?: string
          description?: string
          id?: string
          immediate_actions?: string | null
          incident_date?: string
          incident_number?: string
          incident_time?: string | null
          injured_person_company?: string | null
          injured_person_name?: string | null
          injured_person_occupation?: string | null
          injury_description?: string | null
          investigated_by?: string | null
          investigation_completed_at?: string | null
          investigation_notes?: string | null
          is_riddor_reportable?: boolean | null
          location?: string | null
          organisation_id?: string
          photos?: string[] | null
          project_id?: string | null
          reported_by?: string | null
          riddor_reference?: string | null
          riddor_reported_at?: string | null
          root_cause?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_investigated_by_fkey"
            columns: ["investigated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_items: {
        Row: {
          created_at: string
          id: string
          inspection_id: string
          item_number: number
          notes: string | null
          organisation_id: string
          photo_url: string | null
          question: string
          result: Database["public"]["Enums"]["inspection_result"] | null
        }
        Insert: {
          created_at?: string
          id?: string
          inspection_id: string
          item_number: number
          notes?: string | null
          organisation_id: string
          photo_url?: string | null
          question: string
          result?: Database["public"]["Enums"]["inspection_result"] | null
        }
        Update: {
          created_at?: string
          id?: string
          inspection_id?: string
          item_number?: number
          notes?: string | null
          organisation_id?: string
          photo_url?: string | null
          question?: string
          result?: Database["public"]["Enums"]["inspection_result"] | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_items_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          completed_at: string | null
          corrective_actions: string | null
          created_at: string
          description: string | null
          id: string
          inspection_date: string
          inspection_number: string
          inspection_type: Database["public"]["Enums"]["inspection_type"]
          inspector_id: string | null
          location: string | null
          next_inspection_date: string | null
          notes: string | null
          organisation_id: string
          overall_result:
            | Database["public"]["Enums"]["inspection_result"]
            | null
          photos: string[] | null
          project_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          corrective_actions?: string | null
          created_at?: string
          description?: string | null
          id?: string
          inspection_date?: string
          inspection_number: string
          inspection_type?: Database["public"]["Enums"]["inspection_type"]
          inspector_id?: string | null
          location?: string | null
          next_inspection_date?: string | null
          notes?: string | null
          organisation_id: string
          overall_result?:
            | Database["public"]["Enums"]["inspection_result"]
            | null
          photos?: string[] | null
          project_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          corrective_actions?: string | null
          created_at?: string
          description?: string | null
          id?: string
          inspection_date?: string
          inspection_number?: string
          inspection_type?: Database["public"]["Enums"]["inspection_type"]
          inspector_id?: string | null
          location?: string | null
          next_inspection_date?: string | null
          notes?: string | null
          organisation_id?: string
          overall_result?:
            | Database["public"]["Enums"]["inspection_result"]
            | null
          photos?: string[] | null
          project_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invite_token: string | null
          invited_at: string
          organisation_id: string
          profile_id: string
          role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["member_status"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_token?: string | null
          invited_at?: string
          organisation_id: string
          profile_id: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_token?: string | null
          invited_at?: string
          organisation_id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
        }
        Relationships: [
          {
            foreignKeyName: "organisation_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          logo_url: string | null
          max_projects: number | null
          name: string
          owner_id: string | null
          phone: string | null
          primary_colour: string | null
          slug: string
          storage_used_bytes: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          max_projects?: number | null
          name: string
          owner_id?: string | null
          phone?: string | null
          primary_colour?: string | null
          slug: string
          storage_used_bytes?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          max_projects?: number | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          primary_colour?: string | null
          slug?: string
          storage_used_bytes?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permit_signatures: {
        Row: {
          id: string
          ip_address: string | null
          organisation_id: string
          permit_id: string
          signature_data: string
          signature_type: string
          signed_at: string
          signer_name: string
          signer_role: string
          user_agent: string | null
        }
        Insert: {
          id?: string
          ip_address?: string | null
          organisation_id: string
          permit_id: string
          signature_data: string
          signature_type: string
          signed_at?: string
          signer_name: string
          signer_role: string
          user_agent?: string | null
        }
        Update: {
          id?: string
          ip_address?: string | null
          organisation_id?: string
          permit_id?: string
          signature_data?: string
          signature_type?: string
          signed_at?: string
          signer_name?: string
          signer_role?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permit_signatures_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permit_signatures_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permits_to_work"
            referencedColumns: ["id"]
          },
        ]
      }
      permits_to_work: {
        Row: {
          approved_by: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          completed_by: string | null
          control_measures: string | null
          created_at: string
          description: string | null
          hazards_identified: string | null
          id: string
          location: string | null
          organisation_id: string
          permit_number: string
          permit_type: Database["public"]["Enums"]["permit_type"]
          ppe_required: string[] | null
          project_id: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["permit_status"]
          title: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          work_to_be_done: string
        }
        Insert: {
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          control_measures?: string | null
          created_at?: string
          description?: string | null
          hazards_identified?: string | null
          id?: string
          location?: string | null
          organisation_id: string
          permit_number: string
          permit_type?: Database["public"]["Enums"]["permit_type"]
          ppe_required?: string[] | null
          project_id?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["permit_status"]
          title: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          work_to_be_done: string
        }
        Update: {
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          control_measures?: string | null
          created_at?: string
          description?: string | null
          hazards_identified?: string | null
          id?: string
          location?: string | null
          organisation_id?: string
          permit_number?: string
          permit_type?: Database["public"]["Enums"]["permit_type"]
          ppe_required?: string[] | null
          project_id?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["permit_status"]
          title?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          work_to_be_done?: string
        }
        Relationships: [
          {
            foreignKeyName: "permits_to_work_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_to_work_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_to_work_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_to_work_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_to_work_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_to_work_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          address: string | null
          client_name: string | null
          created_at: string
          created_by: string | null
          estimated_end_date: string | null
          id: string
          image_url: string | null
          name: string
          organisation_id: string
          principal_designer: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          estimated_end_date?: string | null
          id?: string
          image_url?: string | null
          name: string
          organisation_id: string
          principal_designer?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          estimated_end_date?: string | null
          id?: string
          image_url?: string | null
          name?: string
          organisation_id?: string
          principal_designer?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      site_access_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          organisation_id: string
          project_id: string
        }
        Insert: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organisation_id: string
          project_id: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organisation_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_access_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_access_codes_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_access_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_induction_completions: {
        Row: {
          completed_at: string
          id: string
          ip_address: string | null
          organisation_id: string
          project_id: string
          signature_data: string
          site_visit_id: string | null
          template_id: string
          user_agent: string | null
          visitor_company: string | null
          visitor_email: string | null
          visitor_name: string
          visitor_phone: string | null
        }
        Insert: {
          completed_at?: string
          id?: string
          ip_address?: string | null
          organisation_id: string
          project_id: string
          signature_data: string
          site_visit_id?: string | null
          template_id: string
          user_agent?: string | null
          visitor_company?: string | null
          visitor_email?: string | null
          visitor_name: string
          visitor_phone?: string | null
        }
        Update: {
          completed_at?: string
          id?: string
          ip_address?: string | null
          organisation_id?: string
          project_id?: string
          signature_data?: string
          site_visit_id?: string | null
          template_id?: string
          user_agent?: string | null
          visitor_company?: string | null
          visitor_email?: string | null
          visitor_name?: string
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_induction_completions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_induction_completions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_induction_completions_site_visit_id_fkey"
            columns: ["site_visit_id"]
            isOneToOne: false
            referencedRelation: "site_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_induction_completions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "site_induction_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      site_induction_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_required: boolean | null
          organisation_id: string
          question: string
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean | null
          organisation_id: string
          question: string
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean | null
          organisation_id?: string
          question?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_induction_items_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_induction_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "site_induction_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      site_induction_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organisation_id: string
          project_id: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organisation_id: string
          project_id: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organisation_id?: string
          project_id?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_induction_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_induction_templates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_induction_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visits: {
        Row: {
          checked_in_at: string
          checked_out_at: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          has_signed_induction: boolean | null
          id: string
          notes: string | null
          organisation_id: string
          profile_id: string | null
          project_id: string
          purpose: string | null
          site_access_code_id: string
          visitor_company: string | null
          visitor_email: string | null
          visitor_name: string
          visitor_phone: string | null
        }
        Insert: {
          checked_in_at?: string
          checked_out_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          has_signed_induction?: boolean | null
          id?: string
          notes?: string | null
          organisation_id: string
          profile_id?: string | null
          project_id: string
          purpose?: string | null
          site_access_code_id: string
          visitor_company?: string | null
          visitor_email?: string | null
          visitor_name: string
          visitor_phone?: string | null
        }
        Update: {
          checked_in_at?: string
          checked_out_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          has_signed_induction?: boolean | null
          id?: string
          notes?: string | null
          organisation_id?: string
          profile_id?: string | null
          project_id?: string
          purpose?: string | null
          site_access_code_id?: string
          visitor_company?: string | null
          visitor_email?: string | null
          visitor_name?: string
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_visits_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_site_access_code_id_fkey"
            columns: ["site_access_code_id"]
            isOneToOne: false
            referencedRelation: "site_access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      toolbox_talk_attendees: {
        Row: {
          attendee_company: string | null
          attendee_name: string
          attendee_trade: string | null
          created_at: string
          id: string
          organisation_id: string
          profile_id: string | null
          signature_data: string | null
          signed_at: string | null
          toolbox_talk_id: string
        }
        Insert: {
          attendee_company?: string | null
          attendee_name: string
          attendee_trade?: string | null
          created_at?: string
          id?: string
          organisation_id: string
          profile_id?: string | null
          signature_data?: string | null
          signed_at?: string | null
          toolbox_talk_id: string
        }
        Update: {
          attendee_company?: string | null
          attendee_name?: string
          attendee_trade?: string | null
          created_at?: string
          id?: string
          organisation_id?: string
          profile_id?: string | null
          signature_data?: string | null
          signed_at?: string | null
          toolbox_talk_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "toolbox_talk_attendees_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talk_attendees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talk_attendees_toolbox_talk_id_fkey"
            columns: ["toolbox_talk_id"]
            isOneToOne: false
            referencedRelation: "toolbox_talks"
            referencedColumns: ["id"]
          },
        ]
      }
      toolbox_talk_templates: {
        Row: {
          category: Database["public"]["Enums"]["toolbox_talk_category"]
          content: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          is_system_template: boolean | null
          organisation_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["toolbox_talk_category"]
          content: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          organisation_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["toolbox_talk_category"]
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          organisation_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "toolbox_talk_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talk_templates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      toolbox_talks: {
        Row: {
          category: Database["public"]["Enums"]["toolbox_talk_category"]
          completed_at: string | null
          content: string
          created_at: string
          delivered_at: string
          delivered_by: string
          id: string
          location: string | null
          notes: string | null
          organisation_id: string
          project_id: string | null
          status: string
          template_id: string | null
          title: string
          weather_conditions: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["toolbox_talk_category"]
          completed_at?: string | null
          content: string
          created_at?: string
          delivered_at?: string
          delivered_by: string
          id?: string
          location?: string | null
          notes?: string | null
          organisation_id: string
          project_id?: string | null
          status?: string
          template_id?: string | null
          title: string
          weather_conditions?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["toolbox_talk_category"]
          completed_at?: string | null
          content?: string
          created_at?: string
          delivered_at?: string
          delivered_by?: string
          id?: string
          location?: string | null
          notes?: string | null
          organisation_id?: string
          project_id?: string | null
          status?: string
          template_id?: string | null
          title?: string
          weather_conditions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toolbox_talks_delivered_by_fkey"
            columns: ["delivered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talks_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "toolbox_talk_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_unique_slug: { Args: { base_name: string }; Returns: string }
      get_user_org_id: { Args: never; Returns: string }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      activity_type:
        | "project_created"
        | "project_updated"
        | "project_archived"
        | "document_uploaded"
        | "document_approved"
        | "document_rejected"
        | "document_deleted"
        | "member_invited"
        | "member_joined"
        | "member_role_changed"
        | "member_deactivated"
        | "site_access_created"
        | "site_visit_checkin"
        | "site_visit_checkout"
        | "settings_updated"
        | "subscription_changed"
      document_category:
        | "rams"
        | "method_statement"
        | "safety_plan"
        | "coshh"
        | "induction"
        | "permit"
        | "inspection"
        | "certificate"
        | "insurance"
        | "other"
        | "risk_assessment"
        | "fire_safety"
        | "meeting_minutes"
        | "drawing"
      incident_severity:
        | "near_miss"
        | "minor_injury"
        | "major_injury"
        | "dangerous_occurrence"
        | "fatality"
      incident_status:
        | "reported"
        | "under_investigation"
        | "action_required"
        | "closed"
        | "riddor_reportable"
      inspection_result: "pass" | "fail" | "requires_action" | "not_applicable"
      inspection_type:
        | "scaffold"
        | "excavation"
        | "lifting_equipment"
        | "electrical"
        | "fire_safety"
        | "housekeeping"
        | "ppe_compliance"
        | "general_site"
      member_role:
        | "owner"
        | "admin"
        | "site_manager"
        | "contractor"
        | "client_viewer"
      member_status: "invited" | "active" | "deactivated"
      permit_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "active"
        | "completed"
        | "cancelled"
        | "expired"
      permit_type:
        | "hot_work"
        | "confined_space"
        | "excavation"
        | "electrical_isolation"
        | "working_at_height"
        | "roof_work"
        | "demolition"
        | "lifting_operations"
        | "general"
      project_status: "active" | "completed" | "archived"
      subscription_status: "active" | "past_due" | "cancelled" | "trialing"
      subscription_tier: "starter" | "professional" | "enterprise"
      toolbox_talk_category:
        | "working_at_height"
        | "manual_handling"
        | "fire_safety"
        | "electrical_safety"
        | "excavations"
        | "confined_spaces"
        | "ppe"
        | "housekeeping"
        | "hand_tools"
        | "power_tools"
        | "scaffolding"
        | "lifting_operations"
        | "hazardous_substances"
        | "noise"
        | "dust"
        | "asbestos"
        | "slips_trips_falls"
        | "vehicle_safety"
        | "environmental"
        | "emergency_procedures"
        | "mental_health"
        | "general_safety"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_type: [
        "project_created",
        "project_updated",
        "project_archived",
        "document_uploaded",
        "document_approved",
        "document_rejected",
        "document_deleted",
        "member_invited",
        "member_joined",
        "member_role_changed",
        "member_deactivated",
        "site_access_created",
        "site_visit_checkin",
        "site_visit_checkout",
        "settings_updated",
        "subscription_changed",
      ],
      document_category: [
        "rams",
        "method_statement",
        "safety_plan",
        "coshh",
        "induction",
        "permit",
        "inspection",
        "certificate",
        "insurance",
        "other",
        "risk_assessment",
        "fire_safety",
        "meeting_minutes",
        "drawing",
      ],
      incident_severity: [
        "near_miss",
        "minor_injury",
        "major_injury",
        "dangerous_occurrence",
        "fatality",
      ],
      incident_status: [
        "reported",
        "under_investigation",
        "action_required",
        "closed",
        "riddor_reportable",
      ],
      inspection_result: ["pass", "fail", "requires_action", "not_applicable"],
      inspection_type: [
        "scaffold",
        "excavation",
        "lifting_equipment",
        "electrical",
        "fire_safety",
        "housekeeping",
        "ppe_compliance",
        "general_site",
      ],
      member_role: [
        "owner",
        "admin",
        "site_manager",
        "contractor",
        "client_viewer",
      ],
      member_status: ["invited", "active", "deactivated"],
      permit_status: [
        "draft",
        "pending_approval",
        "approved",
        "active",
        "completed",
        "cancelled",
        "expired",
      ],
      permit_type: [
        "hot_work",
        "confined_space",
        "excavation",
        "electrical_isolation",
        "working_at_height",
        "roof_work",
        "demolition",
        "lifting_operations",
        "general",
      ],
      project_status: ["active", "completed", "archived"],
      subscription_status: ["active", "past_due", "cancelled", "trialing"],
      subscription_tier: ["starter", "professional", "enterprise"],
      toolbox_talk_category: [
        "working_at_height",
        "manual_handling",
        "fire_safety",
        "electrical_safety",
        "excavations",
        "confined_spaces",
        "ppe",
        "housekeeping",
        "hand_tools",
        "power_tools",
        "scaffolding",
        "lifting_operations",
        "hazardous_substances",
        "noise",
        "dust",
        "asbestos",
        "slips_trips_falls",
        "vehicle_safety",
        "environmental",
        "emergency_procedures",
        "mental_health",
        "general_safety",
        "other",
      ],
    },
  },
} as const

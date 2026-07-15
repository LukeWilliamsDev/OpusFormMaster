export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          created_at: string;
          details: Json | null;
          id: string;
          target_id: string;
          target_type: string;
          tenant_id: string;
          user_email: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          details?: Json | null;
          id?: string;
          target_id: string;
          target_type: string;
          tenant_id: string;
          user_email?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          details?: Json | null;
          id?: string;
          target_id?: string;
          target_type?: string;
          tenant_id?: string;
          user_email?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      document_requests: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          expires_at: string;
          id: string;
          requested_certs: string[];
          tenant_id: string;
          worker_id: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          expires_at?: string;
          id?: string;
          requested_certs: string[];
          tenant_id: string;
          worker_id?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          expires_at?: string;
          id?: string;
          requested_certs?: string[];
          tenant_id?: string;
          worker_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "document_requests_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_requests_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      job_attachments: {
        Row: {
          file_name: string;
          file_url: string;
          id: string;
          job_id: string;
          type: string;
          uploaded_at: string | null;
          uploaded_by: string;
        };
        Insert: {
          file_name: string;
          file_url: string;
          id?: string;
          job_id: string;
          type: string;
          uploaded_at?: string | null;
          uploaded_by: string;
        };
        Update: {
          file_name?: string;
          file_url?: string;
          id?: string;
          job_id?: string;
          type?: string;
          uploaded_at?: string | null;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_attachments_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      job_diary: {
        Row: {
          created_at: string | null;
          date: string;
          hs_checklist: Json;
          id: string;
          job_id: string;
          notes: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          date?: string;
          hs_checklist?: Json;
          id?: string;
          job_id: string;
          notes?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          date?: string;
          hs_checklist?: Json;
          id?: string;
          job_id?: string;
          notes?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "job_diary_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      job_document_requests: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          expires_at: string;
          id: string;
          job_id: string;
          token: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          expires_at?: string;
          id?: string;
          job_id: string;
          token?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          expires_at?: string;
          id?: string;
          job_id?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_document_requests_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          contract_max_pours: number;
          created_at: string;
          current_pours: number;
          id: string;
          job_ref: string;
          main_contractor: string | null;
          postcode: string | null;
          schedule_value: number;
          site_name: string;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          contract_max_pours?: number;
          created_at?: string;
          current_pours?: number;
          id: string;
          job_ref: string;
          main_contractor?: string | null;
          postcode?: string | null;
          schedule_value?: number;
          site_name: string;
          status?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          contract_max_pours?: number;
          created_at?: string;
          current_pours?: number;
          id?: string;
          job_ref?: string;
          main_contractor?: string | null;
          postcode?: string | null;
          schedule_value?: number;
          site_name?: string;
          status?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          phone_number: string | null;
          role: Database["public"]["Enums"]["app_role"];
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          phone_number?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          phone_number?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      quotes: {
        Row: {
          client_info: Json;
          created_at: string;
          date: string;
          id: string;
          is_sent: boolean;
          items: Json;
          reference: string;
          tenant_id: string;
          totals: Json;
          updated_at: string;
          vat_rate: number;
        };
        Insert: {
          client_info: Json;
          created_at?: string;
          date?: string;
          id?: string;
          is_sent?: boolean;
          items: Json;
          reference: string;
          tenant_id: string;
          totals: Json;
          updated_at?: string;
          vat_rate?: number;
        };
        Update: {
          client_info?: Json;
          created_at?: string;
          date?: string;
          id?: string;
          is_sent?: boolean;
          items?: Json;
          reference?: string;
          tenant_id?: string;
          totals?: Json;
          updated_at?: string;
          vat_rate?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      shifts: {
        Row: {
          created_at: string;
          date: string;
          id: string;
          job_id: string;
          tenant_id: string;
          updated_at: string;
          worker_id: string;
        };
        Insert: {
          created_at?: string;
          date: string;
          id: string;
          job_id: string;
          tenant_id: string;
          updated_at?: string;
          worker_id: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: string;
          job_id?: string;
          tenant_id?: string;
          updated_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shifts_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      smtp_config: {
        Row: {
          id: number;
          key: string;
          updated_at: string | null;
          value: string;
        };
        Insert: {
          id?: number;
          key: string;
          updated_at?: string | null;
          value: string;
        };
        Update: {
          id?: number;
          key?: string;
          updated_at?: string | null;
          value?: string;
        };
        Relationships: [];
      };
      staff: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          is_archived: boolean;
          name: string;
          phone: string | null;
          postcode: string | null;
          role: string;
          tenant_id: string;
          tickets: Json;
          updated_at: string;
          uploaded_certificates: Json;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id: string;
          is_archived?: boolean;
          name: string;
          phone?: string | null;
          postcode?: string | null;
          role: string;
          tenant_id: string;
          tickets?: Json;
          updated_at?: string;
          uploaded_certificates?: Json;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          is_archived?: boolean;
          name?: string;
          phone?: string | null;
          postcode?: string | null;
          role?: string;
          tenant_id?: string;
          tickets?: Json;
          updated_at?: string;
          uploaded_certificates?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "staff_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenants: {
        Row: {
          created_at: string;
          id: string;
          lemon_squeezy_customer_id: string | null;
          name: string;
          slug: string;
          stripe_customer_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          lemon_squeezy_customer_id?: string | null;
          name: string;
          slug: string;
          stripe_customer_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          lemon_squeezy_customer_id?: string | null;
          name?: string;
          slug?: string;
          stripe_customer_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      decrypted_smtp_config: {
        Row: {
          key: string | null;
          value: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      check_email_registered: { Args: { _email: string }; Returns: boolean };
      log_anonymous_audit: {
        Args: {
          p_action: string;
          p_details: Json;
          p_target_id: string;
          p_target_type: string;
          p_user_email: string;
        };
        Returns: undefined;
      };
      submit_worker_documents: {
        Args: { p_new_tickets: Json; p_request_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "dispatcher" | "operative";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "dispatcher", "operative"],
    },
  },
} as const;

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      blacklist_words: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          kind: string | null
          updated_at: string
          word: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string | null
          updated_at?: string
          word: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string | null
          updated_at?: string
          word?: string
        }
        Relationships: []
      }
      credits: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      keyword_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      meta_offers: {
        Row: {
          active_ads_count: number
          active_days: number
          ad_archive_id: string
          ad_snapshot_url: string | null
          ad_start_date: string | null
          category: string
          country: string
          created_at: string
          creative_type: string
          creative_url: string | null
          description: string | null
          first_seen: string
          headline: string | null
          id: string
          is_active: boolean
          language: string
          last_seen: string
          link_url: string | null
          page_id: string
          page_name: string
          page_url: string | null
          product_type: string | null
          quality_score: number
          search_term: string | null
          status: string
          structure: string | null
          updated_at: string
        }
        Insert: {
          active_ads_count?: number
          active_days?: number
          ad_archive_id: string
          ad_snapshot_url?: string | null
          ad_start_date?: string | null
          category: string
          country?: string
          created_at?: string
          creative_type?: string
          creative_url?: string | null
          description?: string | null
          first_seen?: string
          headline?: string | null
          id?: string
          is_active?: boolean
          language?: string
          last_seen?: string
          link_url?: string | null
          page_id: string
          page_name: string
          page_url?: string | null
          product_type?: string | null
          quality_score?: number
          search_term?: string | null
          status?: string
          structure?: string | null
          updated_at?: string
        }
        Update: {
          active_ads_count?: number
          active_days?: number
          ad_archive_id?: string
          ad_snapshot_url?: string | null
          ad_start_date?: string | null
          category?: string
          country?: string
          created_at?: string
          creative_type?: string
          creative_url?: string | null
          description?: string | null
          first_seen?: string
          headline?: string | null
          id?: string
          is_active?: boolean
          language?: string
          last_seen?: string
          link_url?: string | null
          page_id?: string
          page_name?: string
          page_url?: string | null
          product_type?: string | null
          quality_score?: number
          search_term?: string | null
          status?: string
          structure?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      meta_refresh_ads_raw: {
        Row: {
          ad_archive_id: string
          ad_snapshot_url: string | null
          category: string | null
          created_at: string
          language_hint: string | null
          page_id: string
          page_name: string | null
          raw: Json
          run_id: string
          term: string | null
        }
        Insert: {
          ad_archive_id: string
          ad_snapshot_url?: string | null
          category?: string | null
          created_at?: string
          language_hint?: string | null
          page_id: string
          page_name?: string | null
          raw: Json
          run_id: string
          term?: string | null
        }
        Update: {
          ad_archive_id?: string
          ad_snapshot_url?: string | null
          category?: string | null
          created_at?: string
          language_hint?: string | null
          page_id?: string
          page_name?: string | null
          raw?: Json
          run_id?: string
          term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_refresh_ads_raw_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "meta_refresh_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_refresh_jobs: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          kind: string
          payload: Json
          run_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          kind: string
          payload?: Json
          run_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          kind?: string
          payload?: Json
          run_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_refresh_jobs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "meta_refresh_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_refresh_runs: {
        Row: {
          details: Json | null
          error: string | null
          finished_at: string | null
          id: string
          offers_upserted: number
          pages_seen: number
          phase: string
          started_at: string
          status: string
        }
        Insert: {
          details?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: string
          offers_upserted?: number
          pages_seen?: number
          phase?: string
          started_at?: string
          status?: string
        }
        Update: {
          details?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: string
          offers_upserted?: number
          pages_seen?: number
          phase?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      meta_refresh_snapshots: {
        Row: {
          ad_archive_id: string
          attempts: number
          created_at: string
          error: string | null
          image_url: string | null
          link_url: string | null
          run_id: string
          snapshot_url: string | null
          video_url: string | null
        }
        Insert: {
          ad_archive_id: string
          attempts?: number
          created_at?: string
          error?: string | null
          image_url?: string | null
          link_url?: string | null
          run_id: string
          snapshot_url?: string | null
          video_url?: string | null
        }
        Update: {
          ad_archive_id?: string
          attempts?: number
          created_at?: string
          error?: string | null
          image_url?: string | null
          link_url?: string | null
          run_id?: string
          snapshot_url?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_refresh_snapshots_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "meta_refresh_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      mining_logs: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          kind: string
          status: string
          summary: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          kind?: string
          status?: string
          summary?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          kind?: string
          status?: string
          summary?: string | null
        }
        Relationships: []
      }
      mining_settings: {
        Row: {
          ads_limit: number
          auto_refresh: boolean
          countries: string[]
          created_at: string
          id: string
          languages: string[]
          max_pages: number
          page_size: number
          per_keyword_limit: number
          singleton: boolean
          updated_at: string
        }
        Insert: {
          ads_limit?: number
          auto_refresh?: boolean
          countries?: string[]
          created_at?: string
          id?: string
          languages?: string[]
          max_pages?: number
          page_size?: number
          per_keyword_limit?: number
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          ads_limit?: number
          auto_refresh?: boolean
          countries?: string[]
          created_at?: string
          id?: string
          languages?: string[]
          max_pages?: number
          page_size?: number
          per_keyword_limit?: number
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_cents?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          logo_url: string | null
          platform_name: string
          singleton: boolean
          status: string
          support_email: string | null
          support_whatsapp: string | null
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          logo_url?: string | null
          platform_name?: string
          singleton?: boolean
          status?: string
          support_email?: string | null
          support_whatsapp?: string | null
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          logo_url?: string | null
          platform_name?: string
          singleton?: boolean
          status?: string
          support_email?: string | null
          support_whatsapp?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          first_name: string | null
          id: string
          is_suspended: boolean
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          is_suspended?: boolean
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_suspended?: boolean
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      search_keywords: {
        Row: {
          category: string | null
          country: string
          created_at: string
          id: string
          is_active: boolean
          language: string
          niche: string | null
          priority: number
          updated_at: string
          weight: number
          word: string
        }
        Insert: {
          category?: string | null
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          niche?: string | null
          priority?: number
          updated_at?: string
          weight?: number
          word: string
        }
        Update: {
          category?: string | null
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          niche?: string | null
          priority?: number
          updated_at?: string
          weight?: number
          word?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          kind: string | null
          metadata: Json | null
          result: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          kind?: string | null
          metadata?: Json | null
          result?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          kind?: string | null
          metadata?: Json | null
          result?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_refresh_jobs: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          kind: string
          payload: Json
          run_id: string
          started_at: string | null
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "meta_refresh_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_active_offer_pages: {
        Args: never
        Returns: {
          active_ads_count: number
          active_days: number
          ad_archive_id: string
          ad_snapshot_url: string | null
          ad_start_date: string | null
          category: string
          country: string
          created_at: string
          creative_type: string
          creative_url: string | null
          description: string | null
          first_seen: string
          headline: string | null
          id: string
          is_active: boolean
          language: string
          last_seen: string
          link_url: string | null
          page_id: string
          page_name: string
          page_url: string | null
          product_type: string | null
          quality_score: number
          search_term: string | null
          status: string
          structure: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "meta_offers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      mining_cleanup_run: { Args: { p_run_id: string }; Returns: undefined }
      mining_count_pages_seen: { Args: { p_run_id: string }; Returns: number }
      mining_create_run: { Args: { p_started_at?: string }; Returns: string }
      mining_deactivate_stale: {
        Args: { p_started_at: string }
        Returns: number
      }
      mining_enqueue_jobs: { Args: { p_jobs: Json }; Returns: undefined }
      mining_get_page_counts: {
        Args: { p_run_id: string }
        Returns: {
          cnt: number
          page_id: string
        }[]
      }
      mining_get_raw_for_snapshot: {
        Args: { p_run_id: string }
        Returns: {
          ad_archive_id: string
          ad_snapshot_url: string
        }[]
      }
      mining_get_raw_ids: {
        Args: { p_run_id: string }
        Returns: {
          ad_archive_id: string
        }[]
      }
      mining_get_raw_rows: {
        Args: { p_ids: string[]; p_run_id: string }
        Returns: {
          ad_archive_id: string
          ad_snapshot_url: string | null
          category: string | null
          created_at: string
          language_hint: string | null
          page_id: string
          page_name: string | null
          raw: Json
          run_id: string
          term: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "meta_refresh_ads_raw"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      mining_get_run_started_at: { Args: { p_run_id: string }; Returns: string }
      mining_get_snapshot_rows: {
        Args: { p_ids: string[]; p_run_id: string }
        Returns: {
          ad_archive_id: string
          attempts: number
          created_at: string
          error: string | null
          image_url: string | null
          link_url: string | null
          run_id: string
          snapshot_url: string | null
          video_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "meta_refresh_snapshots"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      mining_is_admin: { Args: { p_user_id: string }; Returns: boolean }
      mining_job_update_status: {
        Args: { p_error: string; p_job_id: string; p_status: string }
        Returns: undefined
      }
      mining_log: {
        Args: {
          p_details: Json
          p_kind: string
          p_status: string
          p_summary: string
        }
        Returns: undefined
      }
      mining_remaining_count: {
        Args: { p_kind: string; p_run_id: string }
        Returns: number
      }
      mining_sum_job_logs: {
        Args: { p_run_id: string }
        Returns: {
          search_errors: number
          upserts: number
        }[]
      }
      mining_update_run: {
        Args: {
          p_details?: Json
          p_error?: string
          p_finished_at?: string
          p_offers_upserted?: number
          p_pages_seen?: number
          p_phase?: string
          p_run_id: string
          p_status: string
        }
        Returns: undefined
      }
      mining_upsert_offers: { Args: { p_rows: Json }; Returns: number }
      mining_upsert_raw: { Args: { p_rows: Json }; Returns: undefined }
      mining_upsert_snapshots: { Args: { p_rows: Json }; Returns: undefined }
      try_advance_run_phase: {
        Args: { p_from_phase: string; p_run_id: string; p_to_phase: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "starter" | "plus" | "pro" | "admin"
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
      app_role: ["starter", "plus", "pro", "admin"],
    },
  },
} as const

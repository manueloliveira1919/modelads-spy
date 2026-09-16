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
      ai_operation_costs: {
        Row: {
          created_at: string
          credit_cost: number
          daily_limit: number | null
          feature_key: string | null
          id: string
          is_active: boolean
          label: string
          operation_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_cost?: number
          daily_limit?: number | null
          feature_key?: string | null
          id?: string
          is_active?: boolean
          label: string
          operation_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_cost?: number
          daily_limit?: number | null
          feature_key?: string | null
          id?: string
          is_active?: boolean
          label?: string
          operation_key?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      credit_ledger: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          created_by: string | null
          description: string | null
          entry_type: string
          id: string
          operation_key: string | null
          reference_id: string | null
          source: string | null
          tool_key: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_type: string
          id?: string
          operation_key?: string | null
          reference_id?: string | null
          source?: string | null
          tool_key?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_type?: string
          id?: string
          operation_key?: string | null
          reference_id?: string | null
          source?: string | null
          tool_key?: string | null
          user_id?: string
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
          offer_id: string | null
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
          offer_id?: string | null
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
          offer_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "meta_offers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
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
          available_at: string
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
          available_at?: string
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
          available_at?: string
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
          keywords_per_run: number
          languages: string[]
          max_pages: number
          meta_api_delay_ms: number
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
          keywords_per_run?: number
          languages?: string[]
          max_pages?: number
          meta_api_delay_ms?: number
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
          keywords_per_run?: number
          languages?: string[]
          max_pages?: number
          meta_api_delay_ms?: number
          page_size?: number
          per_keyword_limit?: number
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          active_days: number
          ads_count: number
          category: string | null
          commercial_quality: string | null
          confidence: number
          created_at: string
          first_ad_start: string | null
          first_qualified_at: string | null
          first_seen: string
          group_key: string
          id: string
          landing_key: string | null
          language: string | null
          last_seen: string
          page_id: string
          page_name: string | null
          product_title: string | null
          product_type: string | null
          qualified: boolean
          quality_checked_at: string | null
          quality_reasons: Json | null
          reject_reason: string | null
          status: string
          structure: string | null
          updated_at: string
          visible: boolean
        }
        Insert: {
          active_days?: number
          ads_count?: number
          category?: string | null
          commercial_quality?: string | null
          confidence?: number
          created_at?: string
          first_ad_start?: string | null
          first_qualified_at?: string | null
          first_seen?: string
          group_key: string
          id?: string
          landing_key?: string | null
          language?: string | null
          last_seen?: string
          page_id: string
          page_name?: string | null
          product_title?: string | null
          product_type?: string | null
          qualified?: boolean
          quality_checked_at?: string | null
          quality_reasons?: Json | null
          reject_reason?: string | null
          status?: string
          structure?: string | null
          updated_at?: string
          visible?: boolean
        }
        Update: {
          active_days?: number
          ads_count?: number
          category?: string | null
          commercial_quality?: string | null
          confidence?: number
          created_at?: string
          first_ad_start?: string | null
          first_qualified_at?: string | null
          first_seen?: string
          group_key?: string
          id?: string
          landing_key?: string | null
          language?: string | null
          last_seen?: string
          page_id?: string
          page_name?: string | null
          product_title?: string | null
          product_type?: string | null
          qualified?: boolean
          quality_checked_at?: string | null
          quality_reasons?: Json | null
          reject_reason?: string | null
          status?: string
          structure?: string | null
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      plan_features: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          plan_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          plan_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          plan_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
        ]
      }
      plans: {
        Row: {
          availability: string
          code: string
          created_at: string
          description: string | null
          display_price: string | null
          id: string
          is_active: boolean
          monthly_credits: number
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          availability?: string
          code: string
          created_at?: string
          description?: string | null
          display_price?: string | null
          id?: string
          is_active?: boolean
          monthly_credits?: number
          name: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          availability?: string
          code?: string
          created_at?: string
          description?: string | null
          display_price?: string | null
          id?: string
          is_active?: boolean
          monthly_credits?: number
          name?: string
          price_cents?: number
          sort_order?: number
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
      quiz_elements: {
        Row: {
          content: Json
          created_at: string
          id: string
          position: number
          section_id: string
          settings: Json
          type: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          position?: number
          section_id: string
          settings?: Json
          type: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          position?: number
          section_id?: string
          settings?: Json
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_elements_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "quiz_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          quiz_id: string
          session_id: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          quiz_id: string
          session_id: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          quiz_id?: string
          session_id?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_leads_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sections: {
        Row: {
          created_at: string
          id: string
          position: number
          quiz_id: string
          settings: Json
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          quiz_id: string
          settings?: Json
          title?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          quiz_id?: string
          settings?: Json
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sections_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json
          slug: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json
          slug: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json
          slug?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_keywords: {
        Row: {
          category: string | null
          country: string
          created_at: string
          cycle_no: number
          id: string
          is_active: boolean
          language: string
          last_mined_at: string | null
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
          cycle_no?: number
          id?: string
          is_active?: boolean
          language?: string
          last_mined_at?: string | null
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
          cycle_no?: number
          id?: string
          is_active?: boolean
          language?: string
          last_mined_at?: string | null
          niche?: string | null
          priority?: number
          updated_at?: string
          weight?: number
          word?: string
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          attachment_path: string | null
          author_id: string | null
          body: string
          created_at: string
          id: string
          is_admin: boolean
          ticket_id: string
        }
        Insert: {
          attachment_path?: string | null
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_admin?: boolean
          ticket_id: string
        }
        Update: {
          attachment_path?: string | null
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          attachment_path: string | null
          created_at: string
          email: string
          id: string
          last_message_at: string
          message: string | null
          name: string
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attachment_path?: string | null
          created_at?: string
          email: string
          id?: string
          last_message_at?: string
          message?: string | null
          name: string
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attachment_path?: string | null
          created_at?: string
          email?: string
          id?: string
          last_message_at?: string
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
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_code: string
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          subscription_expires_at: string | null
          subscription_started_at: string | null
          subscription_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_code?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_code?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_credits: {
        Args: { p_amount: number; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      claim_refresh_jobs: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          available_at: string
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
      consume_ai_credits: {
        Args: {
          p_description?: string
          p_operation_key: string
          p_reference_id?: string
        }
        Returns: Json
      }
      current_plan_code: { Args: { _user_id: string }; Returns: string }
      get_my_entitlements: { Args: never; Returns: Json }
      get_offer_row: {
        Args: { p_id: string }
        Returns: {
          active_ads_count: number
          active_days: number
          ad_archive_id: string
          ad_snapshot_url: string
          ad_start_date: string
          category: string
          creative_type: string
          creative_url: string
          description: string
          headline: string
          id: string
          language: string
          link_url: string
          page_id: string
          page_name: string
          page_url: string
          product_type: string
          status: string
          structure: string
        }[]
      }
      get_public_quiz: { Args: { p_slug: string }; Returns: Json }
      has_feature: {
        Args: { _feature_key: string; _user_id: string }
        Returns: boolean
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
          offer_id: string | null
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
      list_active_offers: {
        Args: { p_sort?: string }
        Returns: {
          active_ads_count: number
          active_days: number
          ad_archive_id: string
          ad_snapshot_url: string
          ad_start_date: string
          category: string
          creative_type: string
          creative_url: string
          description: string
          headline: string
          id: string
          language: string
          link_url: string
          page_id: string
          page_name: string
          page_url: string
          product_type: string
          status: string
          structure: string
        }[]
      }
      list_offer_ads: {
        Args: { p_id: string }
        Returns: {
          active_days: number
          ad_archive_id: string
          ad_start_date: string
          creative_type: string
          creative_url: string
          description: string
          headline: string
          id: string
          link_url: string
        }[]
      }
      mining_cancel_run: { Args: { p_run_id: string }; Returns: undefined }
      mining_cleanup_run: { Args: { p_run_id: string }; Returns: undefined }
      mining_count_pages_seen: { Args: { p_run_id: string }; Returns: number }
      mining_create_run: { Args: { p_started_at?: string }; Returns: string }
      mining_deactivate_stale:
        | { Args: { p_started_at: string }; Returns: number }
        | {
            Args: { p_coverage?: string; p_started_at: string }
            Returns: number
          }
      mining_enqueue_jobs: { Args: { p_jobs: Json }; Returns: undefined }
      mining_ensure_classify_jobs: {
        Args: { p_run_id: string }
        Returns: undefined
      }
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
      mining_partial_finalize: {
        Args: { p_run_id: string }
        Returns: undefined
      }
      mining_remaining_count: {
        Args: { p_kind: string; p_run_id: string }
        Returns: number
      }
      mining_requeue_job: {
        Args: { p_available_at?: string; p_job_id: string }
        Returns: undefined
      }
      mining_run_breakdown: { Args: { p_run_id: string }; Returns: Json }
      mining_run_progress: { Args: { p_run_id: string }; Returns: Json }
      mining_sum_job_logs: {
        Args: { p_run_id: string }
        Returns: {
          search_errors: number
          upserts: number
        }[]
      }
      mining_timeout_run: {
        Args: { p_age_minutes?: number }
        Returns: undefined
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
      offer_canonical_category: { Args: { p: string }; Returns: string }
      offer_group_key: {
        Args: { p_link: string; p_page_id: string; p_title: string }
        Returns: string
      }
      offer_is_entertainment:
        | {
            Args: { p_landing: string; p_page: string; p_title: string }
            Returns: boolean
          }
        | {
            Args: {
              p_desc?: string
              p_landing: string
              p_page: string
              p_title: string
            }
            Returns: boolean
          }
      offer_is_whatsapp: {
        Args: { p_link: string; p_text: string }
        Returns: boolean
      }
      offer_norm_link: { Args: { p: string }; Returns: string }
      offer_norm_title: { Args: { p: string }; Returns: string }
      offer_title_similarity: {
        Args: { a: string[]; b: string[] }
        Returns: number
      }
      offer_title_tokens: { Args: { p: string }; Returns: string[] }
      offers_attach_ads: { Args: { p_rows: Json }; Returns: Json }
      offers_merge_duplicates: { Args: never; Returns: number }
      offers_quality_snapshot: {
        Args: { p_ids?: string[] }
        Returns: {
          active_days: number
          ads: Json
          ads_count: number
          category: string
          id: string
          landing_key: string
          language: string
          page_name: string
          product_title: string
          qualified: boolean
          visible: boolean
        }[]
      }
      offers_recompute: { Args: { p_ids?: string[] }; Returns: undefined }
      offers_refresh_visibility: { Args: never; Returns: number }
      offers_set_quality: { Args: { p_rows: Json }; Returns: number }
      quiz_slug_available: {
        Args: { p_exclude_id?: string; p_slug: string }
        Returns: boolean
      }
      quiz_suggest_slug: {
        Args: { p_exclude_id?: string; p_slug: string }
        Returns: string
      }
      submit_quiz_lead: {
        Args: {
          p_email?: string
          p_name?: string
          p_quiz_id: string
          p_session_id: string
          p_whatsapp?: string
        }
        Returns: string
      }
      try_advance_run_phase: {
        Args: { p_from_phase: string; p_run_id: string; p_to_phase: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "starter" | "plus" | "pro" | "admin" | "premium"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["starter", "plus", "pro", "admin", "premium"],
    },
  },
} as const

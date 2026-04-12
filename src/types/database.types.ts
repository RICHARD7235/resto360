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
      accounting_snapshots: {
        Row: {
          budget_ca: number | null
          budget_charges: number | null
          ca_ht: number
          ca_ttc: number
          charges_fixes: number
          charges_variables: number
          couverts: number
          created_at: string
          ebitda: number
          food_cost: number
          id: string
          marge_brute: number
          masse_salariale: number
          period: string
          resultat_net: number
          ticket_moyen: number
        }
        Insert: {
          budget_ca?: number | null
          budget_charges?: number | null
          ca_ht: number
          ca_ttc: number
          charges_fixes: number
          charges_variables: number
          couverts: number
          created_at?: string
          ebitda: number
          food_cost: number
          id?: string
          marge_brute: number
          masse_salariale: number
          period: string
          resultat_net: number
          ticket_moyen: number
        }
        Update: {
          budget_ca?: number | null
          budget_charges?: number | null
          ca_ht?: number
          ca_ttc?: number
          charges_fixes?: number
          charges_variables?: number
          couverts?: number
          created_at?: string
          ebitda?: number
          food_cost?: number
          id?: string
          marge_brute?: number
          masse_salariale?: number
          period?: string
          resultat_net?: number
          ticket_moyen?: number
        }
        Relationships: []
      }
      bank_statements: {
        Row: {
          account_label: string | null
          bank_name: string | null
          file_name: string | null
          id: string
          imported_at: string
          imported_by: string | null
          restaurant_id: string
          statement_date: string
        }
        Insert: {
          account_label?: string | null
          bank_name?: string | null
          file_name?: string | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          restaurant_id: string
          statement_date: string
        }
        Update: {
          account_label?: string | null
          bank_name?: string | null
          file_name?: string | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          restaurant_id?: string
          statement_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statements_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          category: string
          id: string
          is_reconciled: boolean
          label: string
          reconciled_at: string | null
          reconciled_with: string | null
          restaurant_id: string
          statement_id: string
          transaction_date: string
          value_date: string | null
        }
        Insert: {
          amount: number
          category?: string
          id?: string
          is_reconciled?: boolean
          label: string
          reconciled_at?: string | null
          reconciled_with?: string | null
          restaurant_id: string
          statement_id: string
          transaction_date: string
          value_date?: string | null
        }
        Update: {
          amount?: number
          category?: string
          id?: string
          is_reconciled?: boolean
          label?: string
          reconciled_at?: string | null
          reconciled_with?: string | null
          restaurant_id?: string
          statement_id?: string
          transaction_date?: string
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "bank_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register_closings: {
        Row: {
          closing_date: string
          cover_count: number
          created_at: string
          created_by: string | null
          extra_data: Json
          id: string
          notes: string | null
          restaurant_id: string
          source: string
          ticket_count: number
          total_cash: number
          total_cb: number
          total_check: number
          total_ht: number
          total_other: number
          total_ticket_resto: number
          total_ttc: number
          vat_10: number
          vat_20: number
          vat_5_5: number
        }
        Insert: {
          closing_date: string
          cover_count?: number
          created_at?: string
          created_by?: string | null
          extra_data?: Json
          id?: string
          notes?: string | null
          restaurant_id: string
          source: string
          ticket_count?: number
          total_cash?: number
          total_cb?: number
          total_check?: number
          total_ht: number
          total_other?: number
          total_ticket_resto?: number
          total_ttc: number
          vat_10?: number
          vat_20?: number
          vat_5_5?: number
        }
        Update: {
          closing_date?: string
          cover_count?: number
          created_at?: string
          created_by?: string | null
          extra_data?: Json
          id?: string
          notes?: string | null
          restaurant_id?: string
          source?: string
          ticket_count?: number
          total_cash?: number
          total_cb?: number
          total_check?: number
          total_ht?: number
          total_other?: number
          total_ticket_resto?: number
          total_ttc?: number
          vat_10?: number
          vat_20?: number
          vat_5_5?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_closings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_closings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_stats: {
        Row: {
          avg_ticket: number | null
          covers: number | null
          created_at: string | null
          date: string
          id: string
          occupancy_rate: number | null
          reservations_count: number | null
          restaurant_id: string
          revenue: number | null
        }
        Insert: {
          avg_ticket?: number | null
          covers?: number | null
          created_at?: string | null
          date: string
          id?: string
          occupancy_rate?: number | null
          reservations_count?: number | null
          restaurant_id: string
          revenue?: number | null
        }
        Update: {
          avg_ticket?: number | null
          covers?: number | null
          created_at?: string | null
          date?: string
          id?: string
          occupancy_rate?: number | null
          reservations_count?: number | null
          restaurant_id?: string
          revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_stats_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_categories: {
        Row: {
          icon: string | null
          id: string
          label: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          icon?: string | null
          id?: string
          label: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          icon?: string | null
          id?: string
          label?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      document_notifications: {
        Row: {
          channel: string | null
          document_id: string
          id: string
          notification_type: string
          payload: Json | null
          recipient_role: string | null
          scheduled_for: string | null
          sent_at: string | null
        }
        Insert: {
          channel?: string | null
          document_id: string
          id?: string
          notification_type: string
          payload?: Json | null
          recipient_role?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
        }
        Update: {
          channel?: string | null
          document_id?: string
          id?: string
          notification_type?: string
          payload?: Json | null
          recipient_role?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_notifications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_notifications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_with_status"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_notes: string | null
          document_id: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          storage_path: string
          uploaded_at: string | null
          uploaded_by: string | null
          version_number: number
        }
        Insert: {
          change_notes?: string | null
          document_id: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          version_number: number
        }
        Update: {
          change_notes?: string | null
          document_id?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_with_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by: string | null
          current_version_id: string | null
          description: string | null
          expires_at: string | null
          id: string
          issued_at: string | null
          issuer: string | null
          reference_number: string | null
          restaurant_id: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_version_id?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issuer?: string | null
          reference_number?: string | null
          restaurant_id: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_version_id?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issuer?: string | null
          reference_number?: string | null
          restaurant_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_legacy_pre_m12: {
        Row: {
          created_at: string | null
          expiry_date: string | null
          file_url: string | null
          id: string
          name: string
          restaurant_id: string
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          name: string
          restaurant_id: string
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          name?: string
          restaurant_id?: string
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_positions: {
        Row: {
          created_at: string
          department: string
          id: string
          reports_to_position_id: string | null
          required_skills: string[]
          responsibilities: string[]
          restaurant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department: string
          id?: string
          reports_to_position_id?: string | null
          required_skills?: string[]
          responsibilities?: string[]
          restaurant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          reports_to_position_id?: string | null
          required_skills?: string[]
          responsibilities?: string[]
          restaurant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_positions_reports_to_position_id_fkey"
            columns: ["reports_to_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_positions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          acquired_days: number
          carried_over: number
          created_at: string
          id: string
          leave_type: string
          staff_member_id: string
          taken_days: number
          updated_at: string
          year: number
        }
        Insert: {
          acquired_days?: number
          carried_over?: number
          created_at?: string
          id?: string
          leave_type: string
          staff_member_id: string
          taken_days?: number
          updated_at?: string
          year: number
        }
        Update: {
          acquired_days?: number
          carried_over?: number
          created_at?: string
          id?: string
          leave_type?: string
          staff_member_id?: string
          taken_days?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          staff_member_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          staff_member_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          staff_member_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_registers: {
        Row: {
          description: string | null
          id: string
          label: string
          last_updated_at: string | null
          restaurant_id: string
          slug: string
          source_module: string | null
          source_url: string | null
          status: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          label: string
          last_updated_at?: string | null
          restaurant_id: string
          slug: string
          source_module?: string | null
          source_url?: string | null
          status?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          label?: string
          last_updated_at?: string | null
          restaurant_id?: string
          slug?: string
          source_module?: string | null
          source_url?: string | null
          status?: string | null
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          channel: string
          clicks_count: number
          created_at: string
          created_by: string | null
          id: string
          message: string
          name: string
          opens_count: number
          recipients_count: number
          restaurant_id: string
          scheduled_at: string | null
          segment_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          channel: string
          clicks_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          name: string
          opens_count?: number
          recipients_count?: number
          restaurant_id: string
          scheduled_at?: string | null
          segment_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          clicks_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          name?: string
          opens_count?: number
          recipients_count?: number
          restaurant_id?: string
          scheduled_at?: string | null
          segment_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "marketing_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_promotions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string
          id: string
          is_active: boolean
          max_uses: number | null
          restaurant_id: string
          starts_at: string
          updated_at: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          ends_at: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          restaurant_id: string
          starts_at: string
          updated_at?: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          restaurant_id?: string
          starts_at?: string
          updated_at?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketing_promotions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_segments: {
        Row: {
          created_at: string
          description: string | null
          estimated_count: number
          id: string
          name: string
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_count?: number
          id?: string
          name: string
          restaurant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_count?: number
          id?: string
          name?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_segments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_social_posts: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          platform: string
          published_at: string | null
          restaurant_id: string
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          platform: string
          published_at?: string | null
          restaurant_id: string
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          platform?: string
          published_at?: string | null
          restaurant_id?: string
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_social_posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_social_posts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string | null
          default_course: number
          default_station_id: string | null
          id: string
          name: string
          restaurant_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          default_course?: number
          default_station_id?: string | null
          id?: string
          name: string
          restaurant_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          default_course?: number
          default_station_id?: string | null
          id?: string
          name?: string
          restaurant_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_default_station_id_fkey"
            columns: ["default_station_id"]
            isOneToOne: false
            referencedRelation: "preparation_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          course: string
          created_at: string | null
          id: string
          is_default: boolean | null
          is_required: boolean | null
          label: string | null
          menu_id: string
          product_id: string | null
          sort_order: number | null
        }
        Insert: {
          course?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          is_required?: boolean | null
          label?: string | null
          menu_id: string
          product_id?: string | null
          sort_order?: number | null
        }
        Update: {
          course?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          is_required?: boolean | null
          label?: string | null
          menu_id?: string
          product_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          available_days: string[] | null
          available_end: string | null
          available_start: string | null
          created_at: string | null
          description: string | null
          id: string
          is_available: boolean | null
          name: string
          price: number
          restaurant_id: string
          sort_order: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          available_days?: string[] | null
          available_end?: string | null
          available_start?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_available?: boolean | null
          name: string
          price?: number
          restaurant_id: string
          sort_order?: number | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          available_days?: string[] | null
          available_end?: string | null
          available_start?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_available?: boolean | null
          name?: string
          price?: number
          restaurant_id?: string
          sort_order?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menus_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_cancellations: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string
          id: string
          order_id: string | null
          order_item_id: string | null
          reason: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by: string
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          reason: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_cancellations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_cancellations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_cancellations_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          course_number: number
          created_at: string | null
          id: string
          menu_id: string | null
          menu_name: string | null
          notes: string | null
          order_id: string
          payment_id: string | null
          preparation_ticket_id: string | null
          product_id: string | null
          product_name: string
          quantity: number
          status: string | null
          unit_price: number
        }
        Insert: {
          course_number?: number
          created_at?: string | null
          id?: string
          menu_id?: string | null
          menu_name?: string | null
          notes?: string | null
          order_id: string
          payment_id?: string | null
          preparation_ticket_id?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number
          status?: string | null
          unit_price: number
        }
        Update: {
          course_number?: number
          created_at?: string | null
          id?: string
          menu_id?: string | null
          menu_name?: string | null
          notes?: string | null
          order_id?: string
          payment_id?: string | null
          preparation_ticket_id?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          status?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "order_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_preparation_ticket_id_fkey"
            columns: ["preparation_ticket_id"]
            isOneToOne: false
            referencedRelation: "preparation_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments: {
        Row: {
          amount: number
          created_by: string | null
          id: string
          label: string | null
          method: string
          order_id: string
          paid_at: string | null
        }
        Insert: {
          amount: number
          created_by?: string | null
          id?: string
          label?: string | null
          method: string
          order_id: string
          paid_at?: string | null
        }
        Update: {
          amount?: number
          created_by?: string | null
          id?: string
          label?: string | null
          method?: string
          order_id?: string
          paid_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cleared_at: string | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          id: string
          notes: string | null
          order_type: string | null
          paid_amount: number | null
          restaurant_id: string
          server_id: string | null
          status: string | null
          table_number: string | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          cleared_at?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          id?: string
          notes?: string | null
          order_type?: string | null
          paid_amount?: number | null
          restaurant_id: string
          server_id?: string | null
          status?: string | null
          table_number?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          cleared_at?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          id?: string
          notes?: string | null
          order_type?: string | null
          paid_amount?: number | null
          restaurant_id?: string
          server_id?: string | null
          status?: string | null
          table_number?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_advances: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          notes: string | null
          payment_method: string
          restaurant_id: string
          staff_member_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          payment_method: string
          restaurant_id: string
          staff_member_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          payment_method?: string
          restaurant_id?: string
          staff_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_advances_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_advances_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      preparation_stations: {
        Row: {
          color: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          restaurant_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          restaurant_id: string
        }
        Update: {
          color?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preparation_stations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      preparation_tickets: {
        Row: {
          course_number: number
          created_at: string
          fired_at: string | null
          id: string
          order_id: string
          position: number | null
          ready_at: string | null
          started_at: string | null
          station_id: string
          status: string
        }
        Insert: {
          course_number?: number
          created_at?: string
          fired_at?: string | null
          id?: string
          order_id: string
          position?: number | null
          ready_at?: string | null
          started_at?: string | null
          station_id: string
          status?: string
        }
        Update: {
          course_number?: number
          created_at?: string
          fired_at?: string | null
          id?: string
          order_id?: string
          position?: number | null
          ready_at?: string | null
          started_at?: string | null
          station_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "preparation_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preparation_tickets_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "preparation_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allergens: string[] | null
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          price: number
          restaurant_id: string
          sort_order: number | null
          station_id: string | null
          updated_at: string | null
        }
        Insert: {
          allergens?: string[] | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          price?: number
          restaurant_id: string
          sort_order?: number | null
          station_id?: string | null
          updated_at?: string | null
        }
        Update: {
          allergens?: string[] | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          price?: number
          restaurant_id?: string
          sort_order?: number | null
          station_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "preparation_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          restaurant_id: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          restaurant_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          restaurant_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          catalog_item_id: string | null
          created_at: string
          id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number
          stock_item_id: string
          unit_price: number
        }
        Insert: {
          catalog_item_id?: string | null
          created_at?: string
          id?: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received?: number
          stock_item_id: string
          unit_price: number
        }
        Update: {
          catalog_item_id?: string | null
          created_at?: string
          id?: string
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number
          stock_item_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "supplier_catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          restaurant_id: string
          status: string
          supplier_id: string
          total_ht: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          restaurant_id: string
          status?: string
          supplier_id: string
          total_ht?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          restaurant_id?: string
          status?: string
          supplier_id?: string
          total_ht?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      qhs_nonconformities: {
        Row: {
          action_corrective: string | null
          date_constat: string
          description: string
          gravite: number
          id: string
          instance_id: string | null
          restaurant_id: string
          statut: Database["public"]["Enums"]["qhs_nc_statut"]
          template_id: string | null
          traite_at: string | null
          traite_par: string | null
          zone_id: string | null
        }
        Insert: {
          action_corrective?: string | null
          date_constat?: string
          description: string
          gravite: number
          id?: string
          instance_id?: string | null
          restaurant_id: string
          statut?: Database["public"]["Enums"]["qhs_nc_statut"]
          template_id?: string | null
          traite_at?: string | null
          traite_par?: string | null
          zone_id?: string | null
        }
        Update: {
          action_corrective?: string | null
          date_constat?: string
          description?: string
          gravite?: number
          id?: string
          instance_id?: string | null
          restaurant_id?: string
          statut?: Database["public"]["Enums"]["qhs_nc_statut"]
          template_id?: string | null
          traite_at?: string | null
          traite_par?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qhs_nonconformities_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "qhs_task_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qhs_nonconformities_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qhs_nonconformities_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "qhs_task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qhs_nonconformities_traite_par_fkey"
            columns: ["traite_par"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qhs_nonconformities_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "qhs_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      qhs_settings: {
        Row: {
          delai_alerte_manager_min: number
          delai_creation_nc_min: number
          email_rapport_quotidien: string | null
          restaurant_id: string
          service_midi_debut: string
          service_midi_fin: string
          service_soir_debut: string
          service_soir_fin: string
          updated_at: string
        }
        Insert: {
          delai_alerte_manager_min?: number
          delai_creation_nc_min?: number
          email_rapport_quotidien?: string | null
          restaurant_id: string
          service_midi_debut?: string
          service_midi_fin?: string
          service_soir_debut?: string
          service_soir_fin?: string
          updated_at?: string
        }
        Update: {
          delai_alerte_manager_min?: number
          delai_creation_nc_min?: number
          email_rapport_quotidien?: string | null
          restaurant_id?: string
          service_midi_debut?: string
          service_midi_fin?: string
          service_soir_debut?: string
          service_soir_fin?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qhs_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      qhs_task_instances: {
        Row: {
          created_at: string
          creneau_debut: string
          creneau_fin: string
          date_prevue: string
          id: string
          restaurant_id: string
          statut: Database["public"]["Enums"]["qhs_instance_statut"]
          template_id: string
          validation_id: string | null
        }
        Insert: {
          created_at?: string
          creneau_debut: string
          creneau_fin: string
          date_prevue: string
          id?: string
          restaurant_id: string
          statut?: Database["public"]["Enums"]["qhs_instance_statut"]
          template_id: string
          validation_id?: string | null
        }
        Update: {
          created_at?: string
          creneau_debut?: string
          creneau_fin?: string
          date_prevue?: string
          id?: string
          restaurant_id?: string
          statut?: Database["public"]["Enums"]["qhs_instance_statut"]
          template_id?: string
          validation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qhs_task_instances_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qhs_task_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "qhs_task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qhs_task_instances_validation_id_fkey"
            columns: ["validation_id"]
            isOneToOne: false
            referencedRelation: "qhs_task_validations"
            referencedColumns: ["id"]
          },
        ]
      }
      qhs_task_templates: {
        Row: {
          actif: boolean
          assigned_role: string | null
          assigned_user_id: string | null
          created_at: string
          description: string | null
          frequency: Database["public"]["Enums"]["qhs_frequency"]
          id: string
          jour_mois: number | null
          jour_semaine: number | null
          libelle: string
          mois_annee: number | null
          photo_required: boolean
          produit_utilise: string | null
          restaurant_id: string | null
          service_creneau:
            | Database["public"]["Enums"]["qhs_service_creneau"]
            | null
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          actif?: boolean
          assigned_role?: string | null
          assigned_user_id?: string | null
          created_at?: string
          description?: string | null
          frequency: Database["public"]["Enums"]["qhs_frequency"]
          id?: string
          jour_mois?: number | null
          jour_semaine?: number | null
          libelle: string
          mois_annee?: number | null
          photo_required?: boolean
          produit_utilise?: string | null
          restaurant_id?: string | null
          service_creneau?:
            | Database["public"]["Enums"]["qhs_service_creneau"]
            | null
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          actif?: boolean
          assigned_role?: string | null
          assigned_user_id?: string | null
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["qhs_frequency"]
          id?: string
          jour_mois?: number | null
          jour_semaine?: number | null
          libelle?: string
          mois_annee?: number | null
          photo_required?: boolean
          produit_utilise?: string | null
          restaurant_id?: string | null
          service_creneau?:
            | Database["public"]["Enums"]["qhs_service_creneau"]
            | null
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qhs_task_templates_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qhs_task_templates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qhs_task_templates_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "qhs_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      qhs_task_validations: {
        Row: {
          commentaire: string | null
          id: string
          instance_id: string
          photo_url: string | null
          pin_used_hash: string
          user_id: string
          validated_at: string
        }
        Insert: {
          commentaire?: string | null
          id?: string
          instance_id: string
          photo_url?: string | null
          pin_used_hash: string
          user_id: string
          validated_at?: string
        }
        Update: {
          commentaire?: string | null
          id?: string
          instance_id?: string
          photo_url?: string | null
          pin_used_hash?: string
          user_id?: string
          validated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_qhs_validations_instance"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "qhs_task_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qhs_task_validations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      qhs_zones: {
        Row: {
          actif: boolean
          code: string
          created_at: string
          critique: boolean
          id: string
          nom: string
          restaurant_id: string
        }
        Insert: {
          actif?: boolean
          code: string
          created_at?: string
          critique?: boolean
          id?: string
          nom: string
          restaurant_id: string
        }
        Update: {
          actif?: boolean
          code?: string
          created_at?: string
          critique?: boolean
          id?: string
          nom?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qhs_zones_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          created_at: string | null
          id: string
          name: string
          quantity: number
          recipe_id: string
          sort_order: number | null
          stock_item_id: string | null
          supplier_id: string | null
          unit: string
          unit_cost: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          quantity?: number
          recipe_id: string
          sort_order?: number | null
          stock_item_id?: string | null
          supplier_id?: string | null
          unit?: string
          unit_cost?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          quantity?: number
          recipe_id?: string
          sort_order?: number | null
          stock_item_id?: string | null
          supplier_id?: string | null
          unit?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          cook_time_min: number | null
          created_at: string | null
          description: string | null
          id: string
          instructions: string | null
          name: string
          notes: string | null
          portions: number
          prep_time_min: number | null
          product_id: string | null
          restaurant_id: string
          updated_at: string | null
        }
        Insert: {
          cook_time_min?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          instructions?: string | null
          name: string
          notes?: string | null
          portions?: number
          prep_time_min?: number | null
          product_id?: string | null
          restaurant_id: string
          updated_at?: string | null
        }
        Update: {
          cook_time_min?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          instructions?: string | null
          name?: string
          notes?: string | null
          portions?: number
          prep_time_min?: number | null
          product_id?: string | null
          restaurant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          date: string
          end_time: string | null
          id: string
          notes: string | null
          party_size: number
          restaurant_id: string
          status: string | null
          table_number: string | null
          time: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          date: string
          end_time?: string | null
          id?: string
          notes?: string | null
          party_size?: number
          restaurant_id: string
          status?: string | null
          table_number?: string | null
          time: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          date?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          party_size?: number
          restaurant_id?: string
          status?: string | null
          table_number?: string | null
          time?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          capacity: number | null
          created_at: string | null
          height: number | null
          id: string
          is_active: boolean | null
          name: string
          pos_x: number | null
          pos_y: number | null
          restaurant_id: string
          shape: string | null
          sort_order: number | null
          width: number | null
          zone: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          pos_x?: number | null
          pos_y?: number | null
          restaurant_id: string
          shape?: string | null
          sort_order?: number | null
          width?: number | null
          zone?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          pos_x?: number | null
          pos_y?: number | null
          restaurant_id?: string
          shape?: string | null
          sort_order?: number | null
          width?: number | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          auto_fire_delay_minutes: number | null
          created_at: string | null
          email: string | null
          id: string
          legal_form: string | null
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json | null
          siret: string | null
          trade_name: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          auto_fire_delay_minutes?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          legal_form?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          settings?: Json | null
          siret?: string | null
          trade_name?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          auto_fire_delay_minutes?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          legal_form?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          settings?: Json | null
          siret?: string | null
          trade_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_avatar_url: string | null
          author_name: string
          comment: string | null
          created_at: string
          external_id: string | null
          external_url: string | null
          id: string
          rating: number
          responded_by: string | null
          response: string | null
          response_date: string | null
          restaurant_id: string
          review_date: string
          source: string
          status: string
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          author_avatar_url?: string | null
          author_name: string
          comment?: string | null
          created_at?: string
          external_id?: string | null
          external_url?: string | null
          id?: string
          rating: number
          responded_by?: string | null
          response?: string | null
          response_date?: string | null
          restaurant_id: string
          review_date: string
          source: string
          status?: string
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string
          comment?: string | null
          created_at?: string
          external_id?: string | null
          external_url?: string | null
          id?: string
          rating?: number
          responded_by?: string | null
          response?: string | null
          response_date?: string | null
          restaurant_id?: string
          review_date?: string
          source?: string
          status?: string
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_delete: boolean
          can_read: boolean
          can_write: boolean
          created_at: string
          id: string
          module: string
          restaurant_id: string
          role: string
        }
        Insert: {
          can_delete?: boolean
          can_read?: boolean
          can_write?: boolean
          created_at?: string
          id?: string
          module: string
          restaurant_id: string
          role: string
        }
        Update: {
          can_delete?: boolean
          can_read?: boolean
          can_write?: boolean
          created_at?: string
          id?: string
          module?: string
          restaurant_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_templates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_weeks: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          restaurant_id: string
          status: string
          template_id: string | null
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          restaurant_id: string
          status?: string
          template_id?: string | null
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          restaurant_id?: string
          status?: string
          template_id?: string | null
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_weeks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_weeks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_weeks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "schedule_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_minutes: number
          created_at: string
          date: string
          end_time: string
          id: string
          notes: string | null
          period: string
          schedule_week_id: string
          shift_type: string
          staff_member_id: string
          start_time: string
        }
        Insert: {
          break_minutes?: number
          created_at?: string
          date: string
          end_time: string
          id?: string
          notes?: string | null
          period: string
          schedule_week_id: string
          shift_type?: string
          staff_member_id: string
          start_time: string
        }
        Update: {
          break_minutes?: number
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          notes?: string | null
          period?: string
          schedule_week_id?: string
          shift_type?: string
          staff_member_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_schedule_week_id_fkey"
            columns: ["schedule_week_id"]
            isOneToOne: false
            referencedRelation: "schedule_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_documents: {
        Row: {
          created_at: string
          date: string | null
          expiry_date: string | null
          file_url: string
          id: string
          name: string
          restaurant_id: string
          staff_member_id: string
          type: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          expiry_date?: string | null
          file_url: string
          id?: string
          name: string
          restaurant_id: string
          staff_member_id: string
          type: string
        }
        Update: {
          created_at?: string
          date?: string | null
          expiry_date?: string | null
          file_url?: string
          id?: string
          name?: string
          restaurant_id?: string
          staff_member_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_documents_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_documents_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          address: string | null
          birth_date: string | null
          contract_hours: number | null
          contract_type: string | null
          created_at: string | null
          department: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          end_date: string | null
          full_name: string
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          job_position_id: string | null
          manager_id: string | null
          phone: string | null
          pin_hash: string | null
          profile_id: string | null
          restaurant_id: string
          role: string
          social_security_number: string | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          contract_hours?: number | null
          contract_type?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          end_date?: string | null
          full_name: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          job_position_id?: string | null
          manager_id?: string | null
          phone?: string | null
          pin_hash?: string | null
          profile_id?: string | null
          restaurant_id: string
          role: string
          social_security_number?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          contract_hours?: number | null
          contract_type?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          end_date?: string | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          job_position_id?: string | null
          manager_id?: string | null
          phone?: string | null
          pin_hash?: string | null
          profile_id?: string | null
          restaurant_id?: string
          role?: string
          social_security_number?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_job_position_id_fkey"
            columns: ["job_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          alert_threshold: number
          category: string | null
          created_at: string | null
          current_quantity: number
          id: string
          is_active: boolean
          last_order_date: string | null
          min_threshold: number | null
          name: string
          optimal_quantity: number
          restaurant_id: string
          supplier_id: string | null
          tracking_mode: string
          unit: string
          unit_cost: number
          updated_at: string | null
        }
        Insert: {
          alert_threshold?: number
          category?: string | null
          created_at?: string | null
          current_quantity?: number
          id?: string
          is_active?: boolean
          last_order_date?: string | null
          min_threshold?: number | null
          name: string
          optimal_quantity?: number
          restaurant_id: string
          supplier_id?: string | null
          tracking_mode?: string
          unit?: string
          unit_cost?: number
          updated_at?: string | null
        }
        Update: {
          alert_threshold?: number
          category?: string | null
          created_at?: string | null
          current_quantity?: number
          id?: string
          is_active?: boolean
          last_order_date?: string | null
          min_threshold?: number | null
          name?: string
          optimal_quantity?: number
          restaurant_id?: string
          supplier_id?: string | null
          tracking_mode?: string
          unit?: string
          unit_cost?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          stock_item_id: string
          type: string
          unit_cost: number | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          stock_item_id: string
          type: string
          unit_cost?: number | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          stock_item_id?: string
          type?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_catalog_items: {
        Row: {
          category: string | null
          created_at: string
          currency: string
          id: string
          is_available: boolean
          label: string
          last_price_update: string
          reference: string | null
          supplier_id: string
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_available?: boolean
          label: string
          last_price_update?: string
          reference?: string | null
          supplier_id: string
          unit: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_available?: boolean
          label?: string
          last_price_update?: string
          reference?: string | null
          supplier_id?: string
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_catalog_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          category: string | null
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          restaurant_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          restaurant_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          restaurant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      template_shifts: {
        Row: {
          break_minutes: number
          day_of_week: number
          end_time: string
          id: string
          period: string
          staff_member_id: string
          start_time: string
          template_id: string
        }
        Insert: {
          break_minutes?: number
          day_of_week: number
          end_time: string
          id?: string
          period: string
          staff_member_id: string
          start_time: string
          template_id: string
        }
        Update: {
          break_minutes?: number
          day_of_week?: number
          end_time?: string
          id?: string
          period?: string
          staff_member_id?: string
          start_time?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_shifts_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_shifts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "schedule_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          break_minutes: number
          clock_in: string | null
          clock_out: string | null
          created_at: string
          date: string
          id: string
          is_manual: boolean
          notes: string | null
          period: string
          restaurant_id: string
          staff_member_id: string
          validated_by: string | null
        }
        Insert: {
          break_minutes?: number
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date: string
          id?: string
          is_manual?: boolean
          notes?: string | null
          period: string
          restaurant_id: string
          staff_member_id: string
          validated_by?: string | null
        }
        Update: {
          break_minutes?: number
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          id?: string
          is_manual?: boolean
          notes?: string | null
          period?: string
          restaurant_id?: string
          staff_member_id?: string
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_entries: {
        Row: {
          amount: number
          category: string
          created_at: string
          entry_date: string
          id: string
          label: string
          restaurant_id: string
          source_id: string | null
          source_module: string | null
          type: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          entry_date: string
          id?: string
          label: string
          restaurant_id: string
          source_id?: string | null
          source_module?: string | null
          type: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          entry_date?: string
          id?: string
          label?: string
          restaurant_id?: string
          source_id?: string | null
          source_module?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      vat_periods: {
        Row: {
          declared_at: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          restaurant_id: string
          status: string
          vat_10_collected: number
          vat_20_collected: number
          vat_5_5_collected: number
          vat_deductible: number
          vat_due: number
        }
        Insert: {
          declared_at?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          restaurant_id: string
          status?: string
          vat_10_collected?: number
          vat_20_collected?: number
          vat_5_5_collected?: number
          vat_deductible?: number
          vat_due?: number
        }
        Update: {
          declared_at?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          restaurant_id?: string
          status?: string
          vat_10_collected?: number
          vat_20_collected?: number
          vat_5_5_collected?: number
          vat_deductible?: number
          vat_due?: number
        }
        Relationships: [
          {
            foreignKeyName: "vat_periods_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      documents_with_status: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by: string | null
          current_version_id: string | null
          days_until_expiry: number | null
          description: string | null
          expires_at: string | null
          id: string | null
          issued_at: string | null
          issuer: string | null
          reference_number: string | null
          restaurant_id: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          urgency_level: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_version_id?: string | null
          days_until_expiry?: never
          description?: string | null
          expires_at?: string | null
          id?: string | null
          issued_at?: string | null
          issuer?: string | null
          reference_number?: string | null
          restaurant_id?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          urgency_level?: never
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_version_id?: string | null
          days_until_expiry?: never
          description?: string | null
          expires_at?: string | null
          id?: string | null
          issued_at?: string | null
          issuer?: string | null
          reference_number?: string | null
          restaurant_id?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          urgency_level?: never
        }
        Relationships: [
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_user_restaurant_id: { Args: never; Returns: string }
      qhs_generate_instances: { Args: never; Returns: number }
      seed_default_permissions: {
        Args: { p_restaurant_id: string }
        Returns: undefined
      }
    }
    Enums: {
      qhs_frequency:
        | "quotidien"
        | "hebdo"
        | "mensuel"
        | "trimestriel"
        | "annuel"
      qhs_instance_statut:
        | "a_faire"
        | "en_cours"
        | "validee"
        | "en_retard"
        | "non_conforme"
      qhs_nc_statut: "ouverte" | "en_cours" | "cloturee"
      qhs_service_creneau:
        | "avant_midi"
        | "apres_midi"
        | "avant_soir"
        | "apres_soir"
        | "fin_journee"
        | "libre"
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
      qhs_frequency: ["quotidien", "hebdo", "mensuel", "trimestriel", "annuel"],
      qhs_instance_statut: [
        "a_faire",
        "en_cours",
        "validee",
        "en_retard",
        "non_conforme",
      ],
      qhs_nc_statut: ["ouverte", "en_cours", "cloturee"],
      qhs_service_creneau: [
        "avant_midi",
        "apres_midi",
        "avant_soir",
        "apres_soir",
        "fin_journee",
        "libre",
      ],
    },
  },
} as const

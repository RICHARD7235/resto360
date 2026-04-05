export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          name: string;
          trade_name: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          siret: string | null;
          legal_form: string | null;
          logo_url: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          trade_name?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          siret?: string | null;
          legal_form?: string | null;
          logo_url?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          trade_name?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          siret?: string | null;
          legal_form?: string | null;
          logo_url?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          restaurant_id: string | null;
          full_name: string | null;
          role: string;
          avatar_url: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          restaurant_id?: string | null;
          full_name?: string | null;
          role?: string;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string | null;
          full_name?: string | null;
          role?: string;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          restaurant_id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          price: number;
          cost_price: number | null;
          allergens: string[] | null;
          is_available: boolean;
          image_url: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          price: number;
          cost_price?: number | null;
          allergens?: string[] | null;
          is_available?: boolean;
          image_url?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          category_id?: string | null;
          name?: string;
          description?: string | null;
          price?: number;
          cost_price?: number | null;
          allergens?: string[] | null;
          is_available?: boolean;
          image_url?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
          id: string;
          restaurant_id: string;
          customer_name: string;
          customer_phone: string | null;
          customer_email: string | null;
          party_size: number;
          date: string;
          time: string;
          end_time: string | null;
          status: string;
          table_number: string | null;
          notes: string | null;
          type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          customer_name: string;
          customer_phone?: string | null;
          customer_email?: string | null;
          party_size?: number;
          date: string;
          time: string;
          end_time?: string | null;
          status?: string;
          table_number?: string | null;
          notes?: string | null;
          type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          customer_name?: string;
          customer_phone?: string | null;
          customer_email?: string | null;
          party_size?: number;
          date?: string;
          time?: string;
          end_time?: string | null;
          status?: string;
          table_number?: string | null;
          notes?: string | null;
          type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          restaurant_id: string;
          table_number: string | null;
          status: string;
          total: number;
          notes: string | null;
          server_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_number?: string | null;
          status?: string;
          total?: number;
          notes?: string | null;
          server_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          table_number?: string | null;
          status?: string;
          total?: number;
          notes?: string | null;
          server_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          notes: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity?: number;
          unit_price: number;
          notes?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          unit_price?: number;
          notes?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          contact_name: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          category: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          contact_name?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          category?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          contact_name?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          category?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      staff_members: {
        Row: {
          id: string;
          restaurant_id: string;
          profile_id: string | null;
          full_name: string;
          role: string;
          phone: string | null;
          email: string | null;
          contract_type: string | null;
          hourly_rate: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          profile_id?: string | null;
          full_name: string;
          role: string;
          phone?: string | null;
          email?: string | null;
          contract_type?: string | null;
          hourly_rate?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          profile_id?: string | null;
          full_name?: string;
          role?: string;
          phone?: string | null;
          email?: string | null;
          contract_type?: string | null;
          hourly_rate?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_stats: {
        Row: {
          id: string;
          restaurant_id: string;
          date: string;
          revenue: number;
          covers: number;
          avg_ticket: number;
          reservations_count: number;
          occupancy_rate: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          date: string;
          revenue?: number;
          covers?: number;
          avg_ticket?: number;
          reservations_count?: number;
          occupancy_rate?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          date?: string;
          revenue?: number;
          covers?: number;
          avg_ticket?: number;
          reservations_count?: number;
          occupancy_rate?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      stock_items: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          category: string | null;
          unit: string;
          current_quantity: number;
          min_threshold: number;
          supplier_id: string | null;
          last_order_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          category?: string | null;
          unit?: string;
          current_quantity?: number;
          min_threshold?: number;
          supplier_id?: string | null;
          last_order_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          category?: string | null;
          unit?: string;
          current_quantity?: number;
          min_threshold?: number;
          supplier_id?: string | null;
          last_order_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          type: string | null;
          file_url: string | null;
          expiry_date: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          type?: string | null;
          file_url?: string | null;
          expiry_date?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          type?: string | null;
          file_url?: string | null;
          expiry_date?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_user_restaurant_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

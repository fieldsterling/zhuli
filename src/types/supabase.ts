// =========================================================================
// Supabase 数据库类型（与服务端 SQL 迁移 001/002 保持一致）
// 说明：所有表均带 zhuli_ 前缀。仅定义当前已用到/即将用到的表，按需扩充。
// 当前表结构可能有未启用的字段（如 orders/tasks 的关联），使用按行注释。
// =========================================================================

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
      zhuli_users: {
        Row: {
          id: string;
          phone: string | null;
          nickname: string | null;
          role: string;
          avatar_url: string | null;
          company_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          phone?: string | null;
          nickname?: string | null;
          role?: string;
          avatar_url?: string | null;
          company_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          phone?: string | null;
          nickname?: string | null;
          role?: string;
          avatar_url?: string | null;
          company_name?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "zhuli_users_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      zhuli_products: {
        Row: {
          id: string;
          supplier_id: string;
          title: string;
          category: string | null;
          material: string | null;
          weight_grams: number | null;
          labor_fee: number | null;
          supply_price: number;
          platform_price: number | null;
          images: string[];
          video_url: string | null;
          stock: number;
          cert_required: boolean;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          supplier_id: string;
          title: string;
          category?: string | null;
          material?: string | null;
          weight_grams?: number | null;
          labor_fee?: number | null;
          supply_price: number;
          platform_price?: number | null;
          images?: string[];
          video_url?: string | null;
          stock?: number;
          cert_required?: boolean;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          supplier_id?: string;
          title?: string;
          category?: string | null;
          material?: string | null;
          weight_grams?: number | null;
          labor_fee?: number | null;
          supply_price?: number;
          platform_price?: number | null;
          images?: string[];
          video_url?: string | null;
          stock?: number;
          cert_required?: boolean;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "zhuli_products_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "zhuli_suppliers";
            referencedColumns: ["id"];
          }
        ];
      };
      zhuli_suppliers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          contact_name: string | null;
          contact_phone: string | null;
          category: string[];
          stall_address: string | null;
          rating: number;
          status: string;
          bank_info: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          category?: string[];
          stall_address?: string | null;
          rating?: number;
          status?: string;
          bank_info?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          category?: string[];
          stall_address?: string | null;
          rating?: number;
          status?: string;
          bank_info?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "zhuli_suppliers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "zhuli_users";
            referencedColumns: ["id"];
          }
        ];
      };
      zhuli_orders: {
        Row: {
          id: string;
          order_no: string;
          user_id: string;
          type: string;
          status: string;
          total_amount: number | null;
          platform_fee: number | null;
          address: Json | null;
          supplier_id: string | null;
          buyer_id: string | null;
          payment_intent: string | null;
          tracking_no: string | null;
          qc_cert_no: string | null;
          qc_cert_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_no: string;
          user_id: string;
          type?: string;
          status?: string;
          total_amount?: number | null;
          platform_fee?: number | null;
          address?: Json | null;
          supplier_id?: string | null;
          buyer_id?: string | null;
          payment_intent?: string | null;
          tracking_no?: string | null;
          qc_cert_no?: string | null;
          qc_cert_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_no?: string;
          user_id?: string;
          type?: string;
          status?: string;
          total_amount?: number | null;
          platform_fee?: number | null;
          address?: Json | null;
          supplier_id?: string | null;
          buyer_id?: string | null;
          payment_intent?: string | null;
          tracking_no?: string | null;
          qc_cert_no?: string | null;
          qc_cert_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "zhuli_orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "zhuli_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "zhuli_orders_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "zhuli_suppliers";
            referencedColumns: ["id"];
          }
        ];
      };
      zhuli_order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          quantity: number;
          unit_price: number;
          snapshot: Json | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          quantity: number;
          unit_price: number;
          snapshot?: Json | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          quantity?: number;
          unit_price?: number;
          snapshot?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "zhuli_order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "zhuli_orders";
            referencedColumns: ["id"];
          }
        ];
      };
      zhuli_tasks: {
        Row: {
          id: string;
          user_id: string;
          buyer_id: string | null;
          type: string;
          description: string | null;
          reference_images: string[];
          budget_min: number | null;
          budget_max: number | null;
          commission: number | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          buyer_id?: string | null;
          type?: string;
          description?: string | null;
          reference_images?: string[];
          budget_min?: number | null;
          budget_max?: number | null;
          commission?: number | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          buyer_id?: string | null;
          type?: string;
          description?: string | null;
          reference_images?: string[];
          budget_min?: number | null;
          budget_max?: number | null;
          commission?: number | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "zhuli_tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "zhuli_users";
            referencedColumns: ["id"];
          }
        ];
      };
      zhuli_categories: {
        Row: {
          id: string;
          name: string;
          sort: number;
          active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          sort?: number;
          active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          sort?: number;
          active?: boolean;
        };
        Relationships: [];
      };
      zhuli_addresses: {
        Row: {
          id: string;
          user_id: string;
          receiver: string;
          phone: string;
          province: string | null;
          city: string | null;
          district: string | null;
          detail: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          receiver: string;
          phone: string;
          province?: string | null;
          city?: string | null;
          district?: string | null;
          detail?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          receiver?: string;
          phone?: string;
          province?: string | null;
          city?: string | null;
          district?: string | null;
          detail?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "zhuli_addresses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "zhuli_users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      zhuli_health: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
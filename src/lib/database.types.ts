/**
 * Supabase Database Types for Atlas Finance
 *
 * NOTE: In production, generate this file automatically with:
 *   npx supabase gen types typescript --project-id <your-project-id> > src/lib/database.types.ts
 *
 * This is a manual type definition to get started.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      societes: {
        Row: {
          id: string;
          nom: string;
          code: string;
          description: string;
          email: string;
          telephone: string;
          address: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['societes']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['societes']['Insert']>;
      };
      devises: {
        Row: {
          id: string;
          code: string;
          nom: string;
          symbole: string;
          taux_change: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['devises']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['devises']['Insert']>;
      };
      permissions: {
        Row: {
          id: string;
          code: string;
          name: string;
          module: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['permissions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['permissions']['Insert']>;
      };
      roles: {
        Row: {
          id: string;
          code: 'admin' | 'manager' | 'accountant' | 'user';
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['roles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['roles']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          username: string | null;
          first_name: string;
          last_name: string;
          phone: string | null;
          photo_url: string | null;
          role_id: string | null;
          company_id: string | null;
          is_2fa_enabled: boolean;
          last_login_ip: string | null;
          failed_login_attempts: number;
          account_locked_until: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      fiscal_years: {
        Row: {
          id: string;
          company_id: string;
          code: string;
          name: string;
          start_date: string;
          end_date: string;
          is_closed: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['fiscal_years']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['fiscal_years']['Insert']>;
      };
      chart_of_accounts: {
        Row: {
          id: string;
          company_id: string;
          code: string;
          name: string;
          account_class: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
          account_type: 'DETAIL' | 'TOTAL' | 'AUXILIARY';
          parent_account_id: string | null;
          level: number;
          normal_balance: 'DEBIT' | 'CREDIT';
          is_reconcilable: boolean;
          is_auxiliary: boolean;
          allow_direct_entry: boolean;
          is_multi_currency: boolean;
          default_currency: string;
          ifrs_mapping: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['chart_of_accounts']['Row'], 'id' | 'created_at' | 'updated_at' | 'account_class' | 'level'>;
        Update: Partial<Database['public']['Tables']['chart_of_accounts']['Insert']>;
      };
      journals: {
        Row: {
          id: string;
          company_id: string;
          code: string;
          name: string;
          journal_type: 'AC' | 'VE' | 'BQ' | 'CA' | 'OD' | 'AN' | 'SAL' | 'DEC' | 'REG' | 'CLO';
          default_debit_account_id: string | null;
          default_credit_account_id: string | null;
          numbering_prefix: string;
          last_number: number;
          require_validation: boolean;
          require_attachment: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['journals']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['journals']['Insert']>;
      };
      journal_entries: {
        Row: {
          id: string;
          company_id: string;
          fiscal_year_id: string;
          journal_id: string;
          piece_number: string;
          reference: string;
          entry_date: string;
          value_date: string | null;
          description: string;
          total_debit: number;
          total_credit: number;
          is_balanced: boolean;
          is_validated: boolean;
          validation_date: string | null;
          validated_by: string | null;
          source_document: string;
          attachment_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['journal_entries']['Row'], 'id' | 'created_at' | 'updated_at' | 'total_debit' | 'total_credit' | 'is_balanced'>;
        Update: Partial<Database['public']['Tables']['journal_entries']['Insert']>;
      };
      journal_entry_lines: {
        Row: {
          id: string;
          entry_id: string;
          account_id: string;
          debit_amount: number;
          credit_amount: number;
          label: string;
          third_party_id: string | null;
          currency: string;
          currency_amount: number | null;
          exchange_rate: number | null;
          reconciliation_code: string;
          is_reconciled: boolean;
          reconciliation_date: string | null;
          line_number: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['journal_entry_lines']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['journal_entry_lines']['Insert']>;
      };
      tiers: {
        Row: {
          id: string;
          company_id: string;
          code: string;
          type_tiers: string;
          raison_sociale: string;
          nom_commercial: string | null;
          sigle: string | null;
          forme_juridique: string | null;
          email: string | null;
          telephone: string | null;
          statut: string;
          tags: Json;
          created_at: string;
          updated_at: string;
          [key: string]: unknown;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      customers: {
        Row: {
          id: string;
          company_id: string;
          code: string;
          customer_type: string;
          legal_name: string;
          commercial_name: string;
          status: string;
          credit_score: number;
          risk_level: string;
          current_outstanding: number;
          tags: Json;
          created_at: string;
          updated_at: string;
          [key: string]: unknown;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      suppliers: {
        Row: {
          id: string;
          company_id: string;
          code: string;
          supplier_type: string;
          legal_name: string;
          commercial_name: string;
          status: string;
          supplier_rating: string;
          current_outstanding: number;
          tags: Json;
          created_at: string;
          updated_at: string;
          [key: string]: unknown;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      workspaces: {
        Row: {
          id: string;
          role: string;
          name: string;
          description: string;
          icon: string;
          color: string;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['workspaces']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['workspaces']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_user_company_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      user_has_permission: {
        Args: { p_permission_code: string };
        Returns: boolean;
      };
      get_next_piece_number: {
        Args: {
          p_company_id: string;
          p_journal_id: string;
          p_fiscal_year_id: string;
        };
        Returns: string;
      };
      get_account_balance: {
        Args: {
          p_account_id: string;
          p_date: string;
        };
        Returns: number;
      };
      get_trial_balance: {
        Args: {
          p_company_id: string;
          p_start: string;
          p_end: string;
        };
        Returns: {
          account_id: string;
          account_code: string;
          account_name: string;
          debit: number;
          credit: number;
        }[];
      };
    };
    Enums: {
      role_code: 'admin' | 'manager' | 'accountant' | 'user';
      account_class: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
      account_type: 'DETAIL' | 'TOTAL' | 'AUXILIARY';
      balance_direction: 'DEBIT' | 'CREDIT';
      journal_type: 'AC' | 'VE' | 'BQ' | 'CA' | 'OD' | 'AN' | 'SAL' | 'DEC' | 'REG' | 'CLO';
    };
  };
}

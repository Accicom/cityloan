import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Ensure URL is properly formatted
const formattedUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;

export const supabase = createClient(formattedUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Database = {
  public: {
    Tables: {
      assessments: {
        Row: {
          id: string;
          advisor_id: string;
          client_cuit: string;
          client_name?: string;
          assessment_result: 'eligible' | 'not_eligible' | 'pending';
          bcra_debt_data?: any;
          bcra_historical_data?: any;
          bcra_eligibility_status?: 'BCRA_APTO' | 'BCRA_NO_APTO' | 'BCRA_PENDING';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          advisor_id: string;
          client_cuit: string;
          client_name?: string;
          assessment_result: 'eligible' | 'not_eligible' | 'pending';
          bcra_debt_data?: any;
          bcra_historical_data?: any;
          bcra_eligibility_status?: 'BCRA_APTO' | 'BCRA_NO_APTO' | 'BCRA_PENDING';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          advisor_id?: string;
          client_cuit?: string;
          client_name?: string;
          assessment_result?: 'eligible' | 'not_eligible' | 'pending';
          bcra_debt_data?: any;
          bcra_historical_data?: any;
          bcra_eligibility_status?: 'BCRA_APTO' | 'BCRA_NO_APTO' | 'BCRA_PENDING';
          updated_at?: string;
        };
      };
      loan_operations: {
        Row: {
          id: string;
          operation_number: string;
          assessment_id: string;
          advisor_id: string;
          client_cuit: string;
          client_name?: string;
          status: 'pending' | 'in_progress' | 'completed' | 'rejected';
          current_stage: 'contact_info' | 'documents' | 'veraz_data' | 'verification';
          contact_info: any;
          documents: any;
          veraz_data: any;
          verification_data: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          operation_number: string;
          assessment_id: string;
          advisor_id: string;
          client_cuit: string;
          client_name?: string;
          status?: 'pending' | 'in_progress' | 'completed' | 'rejected';
          current_stage?: 'contact_info' | 'documents' | 'veraz_data' | 'verification';
          contact_info?: any;
          documents?: any;
          veraz_data?: any;
          verification_data?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          operation_number?: string;
          assessment_id?: string;
          advisor_id?: string;
          client_cuit?: string;
          client_name?: string;
          status?: 'pending' | 'in_progress' | 'completed' | 'rejected';
          current_stage?: 'contact_info' | 'documents' | 'veraz_data' | 'verification';
          contact_info?: any;
          documents?: any;
          veraz_data?: any;
          verification_data?: any;
          updated_at?: string;
        };
      };
    };
  };
};
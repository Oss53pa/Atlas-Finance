export interface Organization {
  id: string;
  name: string;
  slug: string;
  billing_email?: string;
  logo_url?: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  stripe_customer_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Solution {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  price_monthly_xof: number;
  price_yearly_xof: number;
  price_monthly_eur: number;
  price_yearly_eur: number;
  features: string[];
  is_active: boolean;
  display_order: number;
}

export interface Subscription {
  id: string;
  organization_id: string;
  solution_id: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';
  payment_method?: 'mobile_money' | 'stripe' | 'free';
  payment_reference?: string;
  trial_ends_at?: string;
  current_period_start: string;
  current_period_end?: string;
  stripe_subscription_id?: string;
  seats_limit: number;
  seats_used: number;
  activated_at?: string;
  created_at: string;
  // Joined
  solution?: Solution;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role_code: string;
  token: string;
  invited_by?: string;
  accepted_at?: string;
  expires_at: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role_code: string;
  is_active: boolean;
  created_at: string;
}

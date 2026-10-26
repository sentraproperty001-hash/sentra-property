export type Role = 'super_admin' | 'admin' | 'internal_agent' | 'partner_agent';

export type PropertyStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';

export type Property = {
  id: string;
  owner_agent_id: string;
  title: string;
  slug: string;
  description: string;
  property_type: 'rumah' | 'tanah' | 'ruko' | 'apartemen';
  listing_type: 'jual' | 'sewa';
  price: number;
  province: string;
  city: string;
  district: string;
  village: string;
  address: string;
  land_area: number;
  building_area: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  parking_spaces: number;
  image: string;
  status: PropertyStatus;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: Role;
  status: 'active' | 'inactive';
  joined_at: string;
  avatar?: string;
};

export type Lead = {
  id: string;
  property_id?: string;
  property_title?: string;
  assigned_agent_id?: string;
  full_name: string;
  phone: string;
  email?: string;
  message: string;
  status: 'new' | 'contacted' | 'qualified' | 'closed';
  notes?: string;
  created_at: string;
  updated_at?: string;
};

export type ActivityLog = {
  id: string;
  user_id: string;
  user_name: string;
  user_role: Role;
  action: 'create' | 'update' | 'delete' | 'submit_review' | 'approve' | 'reject' | 'lead_contacted' | 'status_change';
  entity_type: 'property' | 'lead' | 'agent';
  entity_id: string;
  entity_title: string;
  details?: string;
  created_at: string;
};

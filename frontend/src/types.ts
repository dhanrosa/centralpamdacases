export type Role = 'admin' | 'supervisor' | 'agent';
export type ConversationStatus = 'new' | 'in_progress' | 'closed';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface AuthUser extends Omit<User, 'active'> {}

export interface ConversationListItem {
  id: string;
  status: ConversationStatus;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  contact_name: string | null;
  phone_number: string;
  last_message_at: string | null;
  last_message_body: string | null;
  last_message_direction: 'inbound' | 'outbound' | null;
}

export interface ConversationDetail {
  id: string;
  status: ConversationStatus;
  contact_name: string | null;
  phone_number: string;
  assigned_user_name: string | null;
}

export interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  message_type: string;
  status: string;
  created_at: string;
}

export interface Note {
  id: string;
  note: string;
  author_name: string | null;
  created_at: string;
}


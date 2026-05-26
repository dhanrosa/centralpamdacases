export type Role = 'admin' | 'supervisor' | 'agent';
export type ConversationStatus = 'new' | 'in_progress' | 'closed';

export interface User {
  id: string;
  name: string;
  username: string;
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
  phone: string;
  last_message_at: string | null;
  last_message_body: string | null;
  last_message_direction: 'inbound' | 'outbound' | null;
}

export interface ConversationDetail {
  id: string;
  status: ConversationStatus;
  contact_name: string | null;
  phone: string;
  wa_id: string;
  assigned_user_name: string | null;
  assigned_user_id: string | null;
}

export interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  type: string;
  status: string;
  sent_by_user_name: string | null;
  created_at: string;
}

export interface Note {
  id: string;
  note: string;
  author_name: string | null;
  created_at: string;
}

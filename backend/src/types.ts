import type { Request } from 'express';

export type Role = 'admin' | 'supervisor' | 'agent';

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  rawBody?: Buffer;
}

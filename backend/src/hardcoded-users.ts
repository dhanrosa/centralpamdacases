import type { AuthUser } from './types.js';

interface HardcodedUser extends AuthUser {
  password: string;
  active: boolean;
  created_at: string;
}

export const hardcodedUsers: HardcodedUser[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Administrador',
    username: 'dhanrosa',
    password: 'dan!1311',
    role: 'admin',
    active: true,
    created_at: '2026-05-26T00:00:00.000Z'
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Atendente 1',
    username: 'atendente1',
    password: '123456',
    role: 'agent',
    active: true,
    created_at: '2026-05-26T00:00:00.000Z'
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Atendente 2',
    username: 'atendente2',
    password: '123456',
    role: 'agent',
    active: true,
    created_at: '2026-05-26T00:00:00.000Z'
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Atendente 3',
    username: 'atendente3',
    password: '123456',
    role: 'agent',
    active: true,
    created_at: '2026-05-26T00:00:00.000Z'
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Atendente 4',
    username: 'atendente4',
    password: '123456',
    role: 'agent',
    active: true,
    created_at: '2026-05-26T00:00:00.000Z'
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    name: 'Atendente 5',
    username: 'atendente5',
    password: '123456',
    role: 'agent',
    active: true,
    created_at: '2026-05-26T00:00:00.000Z'
  }
];

export function findHardcodedUser(username: string) {
  return hardcodedUsers.find((user) => user.username === username.toLowerCase() && user.active);
}

export function toPublicUser(user: HardcodedUser): AuthUser & { active: boolean; created_at: string } {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    active: user.active,
    created_at: user.created_at
  };
}

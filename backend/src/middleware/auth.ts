import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config.js';
import { findHardcodedUser, toPublicUser } from '../hardcoded-users.js';
import type { AuthRequest, AuthUser, Role } from '../types.js';

const internalUser = toPublicUser(findHardcodedUser('dhanrosa')!);

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    req.user = {
      id: internalUser.id,
      name: internalUser.name,
      username: internalUser.username,
      role: internalUser.role
    };
    return next();
  }

  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as AuthUser;
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: 'Token invalido ou expirado.' });
  }
}

export function requireRole(roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Login necessario.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permissao insuficiente.' });
    }

    return next();
  };
}

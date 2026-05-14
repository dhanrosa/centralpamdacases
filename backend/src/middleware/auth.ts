import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config.js';
import type { AuthRequest, AuthUser, Role } from '../types.js';

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
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
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permissao insuficiente.' });
    }

    return next();
  };
}


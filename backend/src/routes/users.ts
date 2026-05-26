import { Router } from 'express';
import { hardcodedUsers, toPublicUser } from '../hardcoded-users.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/', (_req, res) => {
  return res.json(hardcodedUsers.map(toPublicUser).sort((a, b) => a.name.localeCompare(b.name)));
});

usersRouter.post('/', requireRole(['admin']), (_req, res) => {
  return res.status(405).json({ message: 'Usuarios fixos no codigo. Edite backend/src/hardcoded-users.ts para alterar acessos.' });
});

usersRouter.patch('/:id', requireRole(['admin']), (_req, res) => {
  return res.status(405).json({ message: 'Usuarios fixos no codigo. Edite backend/src/hardcoded-users.ts para alterar acessos.' });
});

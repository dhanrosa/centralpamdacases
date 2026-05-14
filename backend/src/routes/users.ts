import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createUserSchema, updateUserSchema, uuidSchema } from '../utils/validators.js';

export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole(['admin', 'supervisor']));

usersRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(
      'select id, name, email, role, active, created_at from users order by name asc'
    );
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
});

usersRouter.post('/', requireRole(['admin']), async (req, res, next) => {
  try {
    const input = createUserSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const { rows } = await query(
      `insert into users (name, email, password_hash, role, active)
       values ($1, $2, $3, $4, $5)
       returning id, name, email, role, active, created_at`,
      [input.name, input.email, passwordHash, input.role, input.active]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    return next(error);
  }
});

usersRouter.patch('/:id', requireRole(['admin']), async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const input = updateUserSchema.parse(req.body);
    const current = await query('select id from users where id = $1', [id]);

    if (current.rowCount === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : undefined;
    const { rows } = await query(
      `update users
       set name = coalesce($2, name),
           email = coalesce($3, email),
           role = coalesce($4, role),
           active = coalesce($5, active),
           password_hash = coalesce($6, password_hash),
           updated_at = now()
       where id = $1
       returning id, name, email, role, active, created_at, updated_at`,
      [id, input.name, input.email, input.role, input.active, passwordHash]
    );
    return res.json(rows[0]);
  } catch (error) {
    return next(error);
  }
});


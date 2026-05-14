import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { noteSchema, updateConversationSchema, uuidSchema } from '../utils/validators.js';
import type { AuthRequest } from '../types.js';

export const conversationsRouter = Router();

conversationsRouter.use(requireAuth);

conversationsRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `select c.id, c.status, c.assigned_user_id, c.last_message_at, c.created_at,
              ct.name as contact_name, ct.phone_number,
              u.name as assigned_user_name,
              lm.body as last_message_body,
              lm.direction as last_message_direction
       from conversations c
       join contacts ct on ct.id = c.contact_id
       left join users u on u.id = c.assigned_user_id
       left join lateral (
         select body, direction
         from messages m
         where m.conversation_id = c.id
         order by m.created_at desc
         limit 1
       ) lm on true
       order by coalesce(c.last_message_at, c.created_at) desc`
    );
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
});

conversationsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const conversation = await query(
      `select c.*, ct.name as contact_name, ct.phone_number, u.name as assigned_user_name
       from conversations c
       join contacts ct on ct.id = c.contact_id
       left join users u on u.id = c.assigned_user_id
       where c.id = $1`,
      [id]
    );

    if (conversation.rowCount === 0) {
      return res.status(404).json({ message: 'Conversa não encontrada.' });
    }

    const messages = await query(
      `select id, direction, provider_message_id, body, message_type, status, created_at
       from messages
       where conversation_id = $1
       order by created_at asc`,
      [id]
    );

    const notes = await query(
      `select n.id, n.note, n.created_at, u.name as author_name
       from conversation_notes n
       left join users u on u.id = n.user_id
       where n.conversation_id = $1
       order by n.created_at desc`,
      [id]
    );

    return res.json({ conversation: conversation.rows[0], messages: messages.rows, notes: notes.rows });
  } catch (error) {
    return next(error);
  }
});

conversationsRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const input = updateConversationSchema.parse(req.body);
    const hasAssignedUser = Object.prototype.hasOwnProperty.call(input, 'assignedUserId');
    const { rows } = await query(
      `update conversations
       set status = coalesce($2, status),
           assigned_user_id = case when $3::boolean then $4::uuid else assigned_user_id end,
           updated_at = now()
       where id = $1
       returning *`,
      [id, input.status, hasAssignedUser, input.assignedUserId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Conversa não encontrada.' });
    }

    return res.json(rows[0]);
  } catch (error) {
    return next(error);
  }
});

conversationsRouter.post('/:id/notes', async (req: AuthRequest, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const input = noteSchema.parse(req.body);
    const { rows } = await query(
      `insert into conversation_notes (conversation_id, user_id, note)
       values ($1, $2, $3)
       returning id, conversation_id, user_id, note, created_at`,
      [id, req.user?.id ?? null, input.note]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    return next(error);
  }
});

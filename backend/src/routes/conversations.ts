import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { emitSocketEvent } from '../socket.js';
import { noteSchema, updateConversationSchema, uuidSchema } from '../utils/validators.js';
import type { AuthRequest } from '../types.js';

export const conversationsRouter = Router();

conversationsRouter.use(requireAuth);

conversationsRouter.get('/', async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : null;
    const assignedUserId = typeof req.query.assigned_user_id === 'string' ? req.query.assigned_user_id : null;
    const { rows } = await query(
      `select c.id, c.status, c.assigned_user_id, c.last_message_at, c.created_at,
              ct.name as contact_name, ct.phone,
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
       where ($1::text is null or c.status::text = $1)
         and ($2::uuid is null or c.assigned_user_id = $2)
       order by coalesce(c.last_message_at, c.created_at) desc`,
      [status, assignedUserId]
    );
    return res.json(rows);
  } catch (error) {
    return res.json([]);
  }
});

conversationsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const conversation = await query(
      `select c.*, ct.name as contact_name, ct.phone, ct.wa_id, u.name as assigned_user_name
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
      `select m.id, m.direction, m.wa_message_id, m.body, m.type, m.status, m.created_at,
              m.sent_by_user_id, u.name as sent_by_user_name
       from messages m
       left join users u on u.id = m.sent_by_user_id
       where conversation_id = $1
       order by m.created_at asc`,
      [id]
    );

    const notes = await query(
      `select n.id, n.note, n.created_at, u.name as author_name
       from internal_notes n
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

conversationsRouter.get('/:id/messages', async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const { rows } = await query(
      `select m.id, m.conversation_id, m.wa_message_id, m.direction, m.type, m.body,
              m.from_wa_id, m.to_wa_id, m.sent_by_user_id, u.name as sent_by_user_name,
              m.status, m.created_at
       from messages m
       left join users u on u.id = m.sent_by_user_id
       where m.conversation_id = $1
       order by m.created_at asc`,
      [id]
    );

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
});

conversationsRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const input = updateConversationSchema.parse(req.body);
    const hasAssignedUser = Object.prototype.hasOwnProperty.call(input, 'assigned_user_id');
    const { rows } = await query(
      `update conversations
       set status = coalesce($2, status),
           assigned_user_id = case when $3::boolean then $4::uuid else assigned_user_id end,
           updated_at = now()
       where id = $1
       returning *`,
      [id, input.status, hasAssignedUser, input.assigned_user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Conversa não encontrada.' });
    }

    emitSocketEvent('conversation:updated', { id });
    return res.json(rows[0]);
  } catch (error) {
    return next(error);
  }
});

conversationsRouter.post('/:id/assign', async (req: AuthRequest, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const assignedUserId = req.body.assigned_user_id ? uuidSchema.parse(req.body.assigned_user_id) : req.user?.id;
    const { rows } = await query(
      `update conversations
       set assigned_user_id = $2,
           status = case when status = 'new' then 'in_progress'::conversation_status else status end,
           updated_at = now()
       where id = $1
       returning *`,
      [id, assignedUserId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Conversa nao encontrada.' });
    }

    emitSocketEvent('conversation:updated', { id });
    return res.json(rows[0]);
  } catch (error) {
    return next(error);
  }
});

conversationsRouter.post('/:id/status', async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const input = updateConversationSchema.pick({ status: true }).required().parse(req.body);
    const { rows } = await query(
      `update conversations
       set status = $2,
           updated_at = now()
       where id = $1
       returning *`,
      [id, input.status]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Conversa nao encontrada.' });
    }

    emitSocketEvent('conversation:updated', { id });
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
      `insert into internal_notes (conversation_id, user_id, note)
       values ($1, $2, $3)
       returning id, conversation_id, user_id, note, created_at`,
      [id, req.user?.id ?? null, input.note]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    return next(error);
  }
});

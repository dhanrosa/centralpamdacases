import { Router } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config.js';
import { findHardcodedUser, toPublicUser } from '../hardcoded-users.js';
import { authLimiter } from '../middleware/security.js';
import { loginSchema } from '../utils/validators.js';

export const authRouter = Router();

authRouter.post('/login', authLimiter, async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = findHardcodedUser(input.username);

    if (!user || user.password !== input.password) {
      return res.status(401).json({ message: 'Usuario ou senha invalidos.' });
    }

    const payload = toPublicUser(user);
    const signOptions: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
    const token = jwt.sign(
      {
        id: payload.id,
        name: payload.name,
        username: payload.username,
        role: payload.role
      },
      env.JWT_SECRET,
      signOptions
    );

    return res.json({ token, user: payload });
  } catch (error) {
    return next(error);
  }
});

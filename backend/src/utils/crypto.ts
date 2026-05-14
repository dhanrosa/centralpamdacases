import crypto from 'crypto';
import { env } from '../config.js';

export function isValidMetaSignature(rawBody: Buffer | undefined, signature: string | undefined) {
  if (!env.WHATSAPP_APP_SECRET) {
    return true;
  }

  if (!rawBody || !signature?.startsWith('sha256=')) {
    return false;
  }

  const expected = `sha256=${crypto
    .createHmac('sha256', env.WHATSAPP_APP_SECRET)
    .update(rawBody)
    .digest('hex')}`;

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

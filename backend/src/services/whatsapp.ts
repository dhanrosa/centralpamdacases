import { env } from '../config.js';

interface SendTextParams {
  to: string;
  text: string;
}

export async function sendWhatsAppTextMessage({ to, text }: SendTextParams) {
  const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: text
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message ?? 'Falha ao enviar mensagem pela Cloud API.');
  }

  return data as { messages?: Array<{ id: string }> };
}


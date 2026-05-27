import { env } from '../config.js';

interface SendTextParams {
  to: string;
  text: string;
}

export class WhatsAppCloudApiError extends Error {
  constructor(
    message: string,
    public details: {
      url?: string;
      requestBody?: unknown;
      responseStatus?: number;
      responseBody?: unknown;
      causeMessage?: string;
    } = {}
  ) {
    super(message);
  }
}

function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, '');
}

function validateConfig() {
  const token = env.WHATSAPP_TOKEN || env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = env.PHONE_NUMBER_ID || env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token) {
    throw new WhatsAppCloudApiError('WHATSAPP_TOKEN ausente nas variaveis de ambiente.');
  }

  if (!phoneNumberId) {
    throw new WhatsAppCloudApiError('PHONE_NUMBER_ID ausente nas variaveis de ambiente.');
  }

  return { token, phoneNumberId };
}

export async function sendWhatsAppTextMessage({ to, text }: SendTextParams) {
  const { token, phoneNumberId } = validateConfig();
  const normalizedTo = normalizePhoneNumber(to);

  if (!normalizedTo || normalizedTo.length < 10) {
    throw new WhatsAppCloudApiError('Numero de destino invalido. Use DDI, DDD e numero, sem espacos ou simbolos.', {
      requestBody: { to, normalizedTo }
    });
  }

  const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;
  const requestBody = {
    messaging_product: 'whatsapp',
    to: normalizedTo,
    type: 'text',
    text: {
      body: text
    }
  };

  console.log('WhatsApp Cloud API request', {
    url,
    body: requestBody
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    let responseBody: unknown = responseText;

    try {
      responseBody = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseBody = responseText;
    }

    console.log('WhatsApp Cloud API response', {
      status: response.status,
      body: responseBody
    });

    if (!response.ok) {
      const metaMessage =
        typeof responseBody === 'object' && responseBody && 'error' in responseBody
          ? String((responseBody as any).error?.message ?? 'Erro retornado pela Meta.')
          : 'Erro retornado pela Meta.';

      throw new WhatsAppCloudApiError(metaMessage, {
        url,
        requestBody,
        responseStatus: response.status,
        responseBody
      });
    }

    return responseBody as { messages?: Array<{ id: string }> };
  } catch (error) {
    if (error instanceof WhatsAppCloudApiError) {
      console.error('WhatsApp Cloud API error', error.details);
      throw error;
    }

    const causeMessage = error instanceof Error ? error.message : String(error);
    console.error('WhatsApp Cloud API fetch failed', {
      url,
      body: requestBody,
      error: causeMessage
    });
    throw new WhatsAppCloudApiError('Falha de rede ao chamar a WhatsApp Cloud API.', {
      url,
      requestBody,
      causeMessage
    });
  }
}

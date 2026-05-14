# Configuração do webhook na Meta

Este projeto usa somente a WhatsApp Business Cloud API oficial. Ele não lê WhatsApp Web, não captura QR Code e não guarda sessão de navegador.

## URL pública

Em produção, publique o backend com HTTPS. A URL do webhook terá este formato:

```text
https://seu-dominio.com/webhook
```

Para testes locais, use um túnel HTTPS temporário, por exemplo ngrok ou Cloudflare Tunnel.

## Variáveis necessárias

Configure no backend:

```env
WHATSAPP_VERIFY_TOKEN=um-token-criado-por-voce
WHATSAPP_APP_SECRET=app-secret-do-aplicativo-meta
WHATSAPP_PHONE_NUMBER_ID=id-do-numero
WHATSAPP_ACCESS_TOKEN=token-da-cloud-api
```

O token de acesso nunca deve ir para o frontend.

## Painel da Meta

1. Acesse o aplicativo no Meta for Developers.
2. Entre em WhatsApp > Configuration.
3. Em Callback URL, informe `https://seu-dominio.com/webhook`.
4. Em Verify token, informe o mesmo valor de `WHATSAPP_VERIFY_TOKEN`.
5. Clique em Verify and save.
6. Assine o campo `messages`.

## Validação

A Meta fará uma chamada `GET /webhook` com `hub.mode`, `hub.verify_token` e `hub.challenge`. O backend responde o `challenge` quando o token confere.

## Recebimento

Mensagens chegam por `POST /webhook`. O backend valida `x-hub-signature-256` quando `WHATSAPP_APP_SECRET` está configurado, cria ou atualiza contato, conversa e mensagem recebida.


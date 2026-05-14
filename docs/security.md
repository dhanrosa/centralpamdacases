# Boas práticas de segurança

- Use HTTPS em produção.
- Gere um `JWT_SECRET` longo e aleatório.
- Guarde `WHATSAPP_ACCESS_TOKEN` somente no backend.
- Configure `WHATSAPP_APP_SECRET` para validar a assinatura dos webhooks.
- Crie usuários individuais para cada atendente.
- Use papéis: `admin`, `supervisor` e `agent`.
- Revise logs sem registrar tokens ou senhas.
- Use banco com backup e conexões SSL em produção.
- Restrinja `CORS_ORIGIN` ao domínio real do frontend.


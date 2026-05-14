# Painel de atendimento WhatsApp oficial

Sistema web em português do Brasil para atendimento via WhatsApp usando a WhatsApp Business Cloud API oficial da Meta. O projeto não usa automação do WhatsApp Web, QR Code, sessão de navegador ou acesso não oficial a mensagens criptografadas.

## Estrutura

```text
/frontend   React + TypeScript + Vite
/backend    Node.js + Express + TypeScript
/database   Schema SQL PostgreSQL/Supabase
/docs       Instruções de webhook e segurança
```

## Requisitos

- Node.js 20+
- PostgreSQL ou Supabase
- Conta Meta Developer com WhatsApp Business Cloud API

## Instalação

1. Instale as dependências:

```bash
npm install
```

2. Crie o banco e execute:

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

No Supabase, cole o conteúdo de `database/schema.sql` no SQL Editor.

3. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

4. Preencha `.env` com `DATABASE_URL`, `JWT_SECRET`, dados da Cloud API e `CORS_ORIGIN`.

5. Rode em desenvolvimento:

```bash
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:4000`

## Acesso ao painel

O painel abre direto em `/conversas`, sem tela de login.

Para produção, recomenda-se recolocar autenticação ou proteger o acesso por VPN, proxy autenticado, firewall e HTTPS.

## Rotas principais do backend

- `GET /webhook`: validação do webhook da Meta.
- `POST /webhook`: recebimento de mensagens e status.
- `POST /messages/send`: envio oficial de texto pela Cloud API.
- `GET /api/conversations`: lista de conversas.
- `GET /api/conversations/:id`: histórico completo por conversa.
- `POST /api/conversations/:id/notes`: observações internas.
- `GET /api/users`: atendentes.
- `POST /api/users`: cadastro de atendentes.
- `GET /api/settings`: configurações visíveis.

## Configuração do webhook

Veja [docs/meta-webhook.md](docs/meta-webhook.md).

## Produção

- Publique backend e frontend em HTTPS.
- Configure `CORS_ORIGIN` com o domínio real do frontend.
- Use um token de longa duração ou integração segura da Meta.
- Configure `WHATSAPP_APP_SECRET` para validar assinatura de webhook.
- Nunca exponha `WHATSAPP_ACCESS_TOKEN` em código frontend, logs públicos ou repositório.

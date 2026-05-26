# Central interna WhatsApp Cloud API

Painel interno para atendimento via WhatsApp Business Cloud API oficial da Meta. O projeto nao usa WhatsApp Web, QR Code, automacao de navegador ou bibliotecas nao oficiais.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Banco: PostgreSQL ou Supabase
- Tempo real: Socket.io

## Variaveis de ambiente

Copie `.env.example` para `.env` na raiz do projeto:

```powershell
Copy-Item .env.example .env
```

Preencha:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173
WHATSAPP_API_VERSION=v25.0
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
VITE_API_URL=http://localhost:4000/api
```

O `WHATSAPP_ACCESS_TOKEN` fica somente no backend. O frontend sempre chama o backend para enviar mensagens.

## Banco de dados

O login nao depende do banco. As credenciais ficam fixas em `backend/src/hardcoded-users.ts`.

O banco ainda e usado para contatos, conversas, mensagens e observacoes. Execute o schema quando for receber/enviar atendimentos reais:

```powershell
psql $env:DATABASE_URL -f database/schema.sql
```

No Supabase, rode `database/schema.sql` no SQL Editor.

O arquivo `database/seed.sql` e opcional; ele apenas espelha os mesmos usuarios fixos no banco para consultas futuras.

## Usuarios fixos

- `dhanrosa` / `dan!1311` - admin
- `atendente1` / `123456`
- `atendente2` / `123456`
- `atendente3` / `123456`
- `atendente4` / `123456`
- `atendente5` / `123456`

Para alterar usuarios ou senhas, edite `backend/src/hardcoded-users.ts` e reinicie o backend.

## Rodar localmente

Instale dependencias:

```powershell
npm install
```

Rode backend e frontend juntos:

```powershell
npm run dev
```

URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Healthcheck: `http://localhost:4000/health`

Tambem e possivel rodar separado:

```powershell
npm run dev --workspace backend
npm run dev --workspace frontend
```

## Webhook Meta

Configure no painel da Meta:

- Callback URL: `https://SEU_BACKEND/api/webhook`
- Verify token: o mesmo valor de `WHATSAPP_VERIFY_TOKEN`
- Evento: `messages`

Tambem existe compatibilidade com `/webhook`, mas prefira `/api/webhook` para manter tudo sob `/api`.

## Rotas principais

- `POST /api/auth/login`
- `GET /api/webhook`
- `POST /api/webhook`
- `GET /api/conversations`
- `GET /api/conversations/:id/messages`
- `POST /api/conversations/:id/assign`
- `POST /api/conversations/:id/status`
- `POST /api/conversations/:id/notes`
- `POST /api/messages/send`

## Deploy futuro

- Frontend: Vercel com `VITE_API_URL=https://SEU_BACKEND/api`
- Backend: Railway ou Render com PostgreSQL/Supabase
- Configure `CORS_ORIGIN` com o dominio real do frontend
- Use HTTPS e configure `WHATSAPP_APP_SECRET` para validar assinatura do webhook
- Nunca coloque token da Meta no frontend, repositorio ou logs publicos

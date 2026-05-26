import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { sendWhatsAppTextMessage } from './services/whatsapp.js';
import { addOutboundMessage, getConversation, listConversations, storeStats } from './whatsapp-store.js';

const sessionCookie = 'central_pamda_session';
const sessionValue = 'central-pamda-admin-session';
const adminUsername = 'dhanrosa';
const adminPassword = 'dan!1311';

export const adminRouter = Router();

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseCookies(header: string | undefined) {
  return Object.fromEntries(
    (header ?? '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, ...value] = part.split('=');
        return [key, decodeURIComponent(value.join('='))];
      })
  );
}

function isLoggedIn(req: Request) {
  return parseCookies(req.headers.cookie)[sessionCookie] === sessionValue;
}

function sessionCookieHeader(req: Request) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return `${sessionCookie}=${encodeURIComponent(sessionValue)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${
    secure ? '; Secure' : ''
  }`;
}

function clearSessionCookieHeader(req: Request) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return `${sessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}

function requireSession(req: Request, res: Response, next: NextFunction) {
  if (isLoggedIn(req)) {
    return next();
  }

  return res.redirect('/login');
}

function page(title: string, body: string, active = '') {
  const nav = [
    ['Dashboard', '/dashboard', 'dashboard'],
    ['Conversas', '/conversas', 'conversas'],
    ['Usuarios', '/usuarios', 'usuarios'],
    ['Configuracoes', '/configuracoes', 'configuracoes']
  ];

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} - Central Pamda Cases</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #eef5f2;
        color: #10211c;
      }

      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; }
      a { color: inherit; text-decoration: none; }
      button, input, textarea { font: inherit; }
      .shell { min-height: 100vh; display: grid; grid-template-columns: 260px 1fr; }
      .sidebar { background: #10211c; color: #fff; padding: 24px; display: flex; flex-direction: column; gap: 24px; }
      .brand { display: flex; gap: 12px; align-items: center; }
      .mark { width: 42px; height: 42px; border-radius: 8px; display: grid; place-items: center; background: #16845c; font-weight: 800; }
      .brand span, .profile span { color: #a9c4ba; font-size: 13px; }
      .nav { display: grid; gap: 8px; }
      .nav a, .logout button { border-radius: 8px; padding: 12px; color: #d9eee6; background: transparent; border: 0; text-align: left; width: 100%; cursor: pointer; }
      .nav a.active, .nav a:hover, .logout button:hover { background: #1d3b32; }
      .profile { margin-top: auto; display: grid; gap: 12px; }
      .content { padding: 28px; min-width: 0; }
      .page { max-width: 1180px; margin: 0 auto; }
      .page-header { display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-bottom: 22px; }
      h1 { font-size: 30px; margin: 0 0 6px; letter-spacing: 0; }
      h2, p { margin-top: 0; }
      .muted { color: #65736e; margin-bottom: 0; }
      .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
      .card, .panel, .conversation, .message, .login-card { background: #fff; border: 1px solid #dbe5e2; border-radius: 8px; }
      .card { padding: 18px; }
      .card strong { display: block; font-size: 24px; margin-top: 8px; }
      .panel { padding: 18px; }
      .conversation { display: grid; grid-template-columns: 220px 1fr auto; gap: 16px; align-items: center; padding: 16px; margin-bottom: 10px; }
      .badge { display: inline-flex; justify-content: center; min-width: 92px; border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 800; }
      .aberto { background: #dff7ea; color: #13573e; }
      .pendente { background: #fff0c2; color: #6a4b00; }
      .finalizado { background: #dce7e1; color: #34453f; }
      .chat { height: calc(100vh - 56px); display: grid; grid-template-rows: auto 1fr auto; }
      .messages { overflow: auto; padding: 18px; background: #f7faf9; display: flex; flex-direction: column; gap: 12px; }
      .message { max-width: min(72%, 620px); padding: 12px 14px; }
      .message.sent { align-self: flex-end; background: #dff7ea; border-color: #bce7cf; }
      .message span { color: #65736e; font-size: 12px; }
      .composer { display: grid; grid-template-columns: 1fr auto; gap: 10px; padding-top: 14px; }
      input, textarea { width: 100%; border: 1px solid #cbd8d4; border-radius: 8px; padding: 12px 14px; }
      textarea { min-height: 54px; resize: vertical; }
      .primary { border: 0; border-radius: 8px; background: #16845c; color: #fff; font-weight: 800; padding: 12px 18px; cursor: pointer; }
      .login-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      .login-card { width: min(100%, 440px); padding: 28px; }
      .login-card label { display: grid; gap: 8px; margin-bottom: 14px; }
      .alert { border-radius: 8px; background: #ffe4df; color: #7a1d10; padding: 12px 14px; margin-bottom: 16px; }
      code { font-weight: 800; }
      @media (max-width: 900px) {
        .shell { grid-template-columns: 1fr; }
        .sidebar { position: sticky; top: 0; z-index: 5; padding: 14px; }
        .nav { grid-template-columns: repeat(4, 1fr); }
        .content { padding: 16px; }
        .grid, .conversation { grid-template-columns: 1fr; }
        .chat { height: auto; min-height: 70vh; }
      }
    </style>
  </head>
  <body>
    ${body.startsWith('<main class="login-page"') ? body : `<div class="shell">
      <aside class="sidebar">
        <div class="brand"><div class="mark">P</div><div><strong>Central Pamda Cases</strong><br><span>Atendimento WhatsApp</span></div></div>
        <nav class="nav">
          ${nav.map(([label, href, key]) => `<a class="${active === key ? 'active' : ''}" href="${href}">${label}</a>`).join('')}
        </nav>
        <div class="profile"><div><strong>dhanrosa</strong><br><span>administrador</span></div><form class="logout" method="post" action="/api/logout"><button>Sair</button></form></div>
      </aside>
      <main class="content">${body}</main>
    </div>`}
  </body>
</html>`;
}

function landingPage(req: Request, res: Response) {
  if (req.query['hub.mode'] || req.query['hub.verify_token'] || req.query['hub.challenge']) {
    return false;
  }

  return res.type('html').send(page('Inicio', `<section class="page">
    <header class="page-header">
      <div>
        <h1>Central Pamda Cases</h1>
        <p class="muted">Backend online</p>
      </div>
      <a class="primary" href="/login">Entrar no painel</a>
    </header>
    <div class="panel">
      <p class="muted">Webhook WhatsApp</p>
      <code>/api/webhook</code>
    </div>
  </section>`));
}

adminRouter.get('/login', (req, res) => {
  if (isLoggedIn(req)) {
    return res.redirect('/dashboard');
  }

  const hasError = req.query.error === '1';
  return res.type('html').send(page('Login', `<main class="login-page">
    <form class="login-card" method="post" action="/api/login">
      <div class="mark">P</div>
      <h1>Central Pamda Cases</h1>
      <p class="muted">Acesso administrativo interno</p>
      ${hasError ? '<div class="alert">Usuario ou senha invalidos.</div>' : ''}
      <label>Usuario<input name="username" autocomplete="username" required /></label>
      <label>Senha<input name="password" type="password" autocomplete="current-password" required /></label>
      <button class="primary" type="submit">Entrar</button>
    </form>
  </main>`));
});

adminRouter.post('/api/login', (req, res) => {
  const { username, password } = req.body ?? {};

  if (username === adminUsername && password === adminPassword) {
    res.setHeader('Set-Cookie', sessionCookieHeader(req));
    if (req.is('application/json')) {
      return res.json({ ok: true });
    }
    return res.redirect('/dashboard');
  }

  if (req.is('application/json')) {
    return res.status(401).json({ message: 'Usuario ou senha invalidos.' });
  }

  return res.redirect('/login?error=1');
});

adminRouter.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', clearSessionCookieHeader(req));
  return res.redirect('/login');
});

adminRouter.get('/dashboard', requireSession, (_req, res) => {
  const stats = storeStats();
  return res.type('html').send(page('Dashboard', `<section class="page">
    <header class="page-header"><div><h1>Dashboard</h1><p class="muted">Resumo operacional do atendimento.</p></div></header>
    <div class="grid">
      <article class="card"><span>Backend</span><strong>Online</strong></article>
      <article class="card"><span>Webhook WhatsApp</span><strong>Ativo</strong></article>
      <article class="card"><span>Total de conversas</span><strong>${stats.totalConversations}</strong></article>
      <article class="card"><span>Mensagens recebidas</span><strong>${stats.receivedMessages}</strong></article>
    </div>
  </section>`, 'dashboard'));
});

adminRouter.get('/conversas', requireSession, (_req, res) => {
  const conversations = listConversations();
  return res.type('html').send(page('Conversas', `<section class="page">
    <header class="page-header"><div><h1>Conversas</h1><p class="muted">Mensagens recebidas via WhatsApp Cloud API.</p></div></header>
    ${
      conversations.length
        ? conversations
            .map(
              (item) => `<a class="conversation" href="/conversas/${encodeURIComponent(item.id)}">
          <div><strong>${escapeHtml(item.name)}</strong><br><span class="muted">${escapeHtml(item.phone)}</span></div>
          <p class="muted">${escapeHtml(item.lastMessage)}</p>
          <div><span class="muted">${escapeHtml(item.time)}</span><br><span class="badge ${item.status}">${item.status}</span></div>
        </a>`
            )
            .join('')
        : '<div class="panel"><p class="muted">Nenhuma conversa recebida ainda. Envie uma mensagem para o numero conectado ao WhatsApp Cloud API.</p></div>'
    }
  </section>`, 'conversas'));
});

adminRouter.get('/conversas/:id', requireSession, (req, res) => {
  const conversation = getConversation(req.params.id);
  if (!conversation) {
    return res.status(404).type('html').send(page('Conversa nao encontrada', `<section class="page">
      <header class="page-header"><div><h1>Conversa nao encontrada</h1><p class="muted">Esta conversa ainda nao existe neste runtime.</p></div></header>
      <a class="primary" href="/conversas">Voltar</a>
    </section>`, 'conversas'));
  }

  return res.type('html').send(page('Conversa', `<section class="page chat">
    <header class="page-header"><div><h1>${escapeHtml(conversation.name)}</h1><p class="muted">${escapeHtml(conversation.phone)}</p></div><span class="badge ${conversation.status}">${conversation.status}</span></header>
    <div id="messages" class="messages">
      ${conversation.messages
        .map((item) => `<article class="message ${item.direction === 'sent' ? 'sent' : ''}"><p>${escapeHtml(item.text)}</p><span>${escapeHtml(item.time)}${item.status ? ` - ${escapeHtml(item.status)}` : ''}</span></article>`)
        .join('')}
    </div>
    <form id="composer" class="composer" method="post" action="/conversas/${encodeURIComponent(conversation.id)}/send">
      <textarea id="reply" name="body" placeholder="Digite uma resposta"></textarea>
      <button class="primary" type="submit">Enviar</button>
    </form>
  </section>`, 'conversas'));
});

adminRouter.post('/conversas/:id/send', requireSession, async (req, res) => {
  const conversation = getConversation(req.params.id);
  const body = String(req.body?.body ?? '').trim();

  if (!conversation || !body) {
    return res.redirect('/conversas');
  }

  try {
    const result = await sendWhatsAppTextMessage({ to: conversation.waId, text: body });
    addOutboundMessage(conversation.waId, body, result.messages?.[0]?.id);
  } catch (error) {
    console.error('Falha ao enviar mensagem real pelo WhatsApp Cloud API', error);
    addOutboundMessage(conversation.waId, `${body} (falha no envio pela Cloud API)`);
  }

  return res.redirect(`/conversas/${encodeURIComponent(conversation.id)}`);
});

adminRouter.get('/usuarios', requireSession, (_req, res) => {
  return res.type('html').send(page('Usuarios', `<section class="page">
    <header class="page-header"><div><h1>Usuarios</h1><p class="muted">Usuarios fixos no codigo nesta versao.</p></div></header>
    <div class="panel">
      <p><strong>usuario:</strong> dhanrosa</p>
      <p><strong>perfil:</strong> administrador</p>
      <p class="muted">Usuarios fixos no codigo nesta versao</p>
    </div>
  </section>`, 'usuarios'));
});

adminRouter.get('/configuracoes', requireSession, (_req, res) => {
  const status = (value: string | undefined) => (value ? 'configurado' : 'ausente');
  return res.type('html').send(page('Configuracoes', `<section class="page">
    <header class="page-header"><div><h1>Configuracoes</h1><p class="muted">Dados seguros, sem exibir tokens.</p></div></header>
    <div class="panel">
      <p><strong>URL do webhook:</strong> <code>/api/webhook</code></p>
      <p><strong>WHATSAPP_TOKEN:</strong> ${status(process.env.WHATSAPP_TOKEN ?? process.env.WHATSAPP_ACCESS_TOKEN)}</p>
      <p><strong>WHATSAPP_PHONE_NUMBER_ID:</strong> ${status(process.env.WHATSAPP_PHONE_NUMBER_ID)}</p>
      <p><strong>WHATSAPP_VERIFY_TOKEN:</strong> ${status(process.env.WHATSAPP_VERIFY_TOKEN)}</p>
    </div>
  </section>`, 'configuracoes'));
});

export function renderLandingPage(req: Request, res: Response) {
  return landingPage(req, res);
}

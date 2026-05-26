import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { sendWhatsAppTextMessage, WhatsAppCloudApiError } from './services/whatsapp.js';
import { addOutboundMessage, createConversation, getConversation, listConversations, storeStats } from './whatsapp-store.js';

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

function initials(name: string) {
  return escapeHtml(name.trim().slice(0, 1).toUpperCase() || 'P');
}

function whatsappShell(title: string, listHtml: string, chatHtml: string, activeConversationId = '') {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} - Central Pamda Cases</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #111b16;
        color: #e9edef;
      }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; overflow: hidden; }
      a { color: inherit; text-decoration: none; }
      button, input, textarea { font: inherit; }
      .wa-app { height: 100vh; display: grid; grid-template-columns: 56px 380px minmax(0, 1fr); background: #111b16; }
      .rail { background: #202c26; border-right: 1px solid #263832; display: flex; flex-direction: column; align-items: center; padding: 10px 8px; gap: 14px; }
      .rail a, .rail button { width: 40px; height: 40px; border: 0; border-radius: 999px; display: grid; place-items: center; background: transparent; color: #aebac1; cursor: pointer; }
      .rail a.active, .rail a:hover, .rail button:hover { background: #2a3933; color: #00a884; }
      .rail .bottom { margin-top: auto; }
      .wa-list { background: #111b16; border-right: 1px solid #263832; min-width: 0; display: grid; grid-template-rows: auto auto 1fr; }
      .wa-list-header { padding: 20px 20px 12px; display: flex; align-items: center; justify-content: space-between; }
      .wa-list-header h1 { margin: 0; font-size: 24px; letter-spacing: 0; }
      .wa-search { margin: 0 16px 10px; background: #202c26; border-radius: 999px; padding: 10px 14px; color: #aebac1; }
      .wa-search input { width: 100%; border: 0; outline: 0; background: transparent; color: #e9edef; }
      .start-form { margin: 0 16px 12px; display: grid; grid-template-columns: 1fr; gap: 8px; }
      .start-form input { border: 0; outline: 0; border-radius: 8px; background: #202c26; color: #e9edef; padding: 10px 12px; }
      .start-form button { border: 0; border-radius: 8px; background: #00a884; color: #06241d; font-weight: 800; padding: 10px 12px; cursor: pointer; }
      .wa-items { overflow: auto; padding: 4px 8px 12px; }
      .wa-item { display: grid; grid-template-columns: 52px 1fr auto; gap: 12px; align-items: center; border-radius: 8px; padding: 10px 12px; margin-bottom: 4px; }
      .wa-item:hover, .wa-item.active { background: #2a2f2d; }
      .avatar { width: 48px; height: 48px; border-radius: 999px; display: grid; place-items: center; background: #6b5328; color: #fff2c8; font-weight: 800; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
      .wa-item strong { display: block; color: #f3f5f6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .preview, .time { color: #aebac1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .status-pill { display: inline-flex; justify-content: center; min-width: 72px; margin-top: 6px; border-radius: 999px; padding: 4px 8px; font-size: 11px; font-weight: 800; }
      .aberto { background: #005c4b; color: #d9fff5; }
      .pendente { background: #7a5f16; color: #fff3c4; }
      .finalizado { background: #33423c; color: #d7e4df; }
      .wa-chat { min-width: 0; display: grid; grid-template-rows: 66px 1fr auto; background: #0b1410; }
      .chat-header { background: #202c26; border-bottom: 1px solid #263832; display: flex; align-items: center; justify-content: space-between; padding: 10px 18px; }
      .chat-person { display: flex; align-items: center; gap: 12px; min-width: 0; }
      .chat-person strong { display: block; color: #f3f5f6; }
      .chat-person span { color: #aebac1; font-size: 13px; }
      .chat-actions { color: #aebac1; display: flex; gap: 18px; font-size: 22px; }
      .chat-bg { position: relative; overflow: auto; padding: 28px 8%; background-color: #0b1410; }
      .chat-bg::before { content: ""; position: fixed; inset: 66px 0 62px 436px; pointer-events: none; opacity: .18; background-image:
        url("data:image/svg+xml,%3Csvg width='240' height='240' viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23d9eee6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='58' cy='58' r='20'/%3E%3Ccircle cx='42' cy='38' r='8'/%3E%3Ccircle cx='74' cy='38' r='8'/%3E%3Ccircle cx='50' cy='56' r='4'/%3E%3Ccircle cx='66' cy='56' r='4'/%3E%3Cpath d='M56 65 q2 4 6 0'/%3E%3Cpath d='M142 26 c18 30 18 64 0 102'/%3E%3Cpath d='M156 22 c18 34 18 72 0 116'/%3E%3Cpath d='M130 58 h36 M128 88 h40 M130 118 h36'/%3E%3Cpath d='M32 150 c28-8 54 0 76 24'/%3E%3Cpath d='M48 162 c8-18 24-30 48-36'/%3E%3Cpath d='M166 170 c18-22 38-28 58-18 c-20 4-34 16-42 36 c-4-10-10-16-16-18z'/%3E%3Cpath d='M28 214 h184'/%3E%3Cpath d='M108 190 c16-12 34-12 52 0'/%3E%3C/g%3E%3C/svg%3E");
        background-size: 240px 240px; }
      .day { width: max-content; margin: 0 auto 20px; background: #1f2c26; color: #aebac1; border-radius: 8px; padding: 6px 12px; font-size: 12px; position: relative; }
      .secure { width: min(520px, 100%); margin: 0 auto 28px; text-align: center; background: #182d36; color: #6fe6d2; border-radius: 8px; padding: 10px 14px; font-size: 12px; position: relative; }
      .bubble { position: relative; max-width: min(62%, 720px); width: max-content; min-width: 92px; margin-bottom: 10px; border-radius: 8px; padding: 8px 10px 6px; box-shadow: 0 1px 1px rgba(0,0,0,.22); }
      .bubble.received { background: #202c26; color: #e9edef; }
      .bubble.sent { background: #005c4b; color: #e9edef; margin-left: auto; }
      .bubble p { margin: 0 0 4px; white-space: pre-wrap; word-break: break-word; }
      .bubble span { display: block; color: #b7c5c0; font-size: 11px; text-align: right; }
      .composer { background: #202c26; padding: 10px 14px; display: grid; grid-template-columns: 42px 1fr 46px; gap: 10px; align-items: end; }
      .composer .plus, .composer button { border: 0; background: transparent; color: #aebac1; font-size: 28px; cursor: pointer; }
      textarea { width: 100%; min-height: 42px; max-height: 120px; resize: vertical; border: 0; outline: 0; border-radius: 8px; padding: 12px 14px; background: #2a3942; color: #e9edef; }
      .empty-chat { height: 100%; display: grid; place-items: center; text-align: center; color: #aebac1; padding: 24px; }
      @media (max-width: 900px) {
        body { overflow: auto; }
        .wa-app { min-height: 100vh; height: auto; grid-template-columns: 1fr; }
        .rail { flex-direction: row; justify-content: center; }
        .rail .bottom { margin-top: 0; margin-left: auto; }
        .wa-list { min-height: 360px; }
        .chat-bg::before { inset: 0; }
        .wa-chat { min-height: 70vh; }
        .bubble { max-width: 86%; }
      }
    </style>
  </head>
  <body>
    <div class="wa-app">
      <aside class="rail">
        <a class="active" href="/conversas" title="Conversas">☘</a>
        <a href="/dashboard" title="Dashboard">⌂</a>
        <a href="/usuarios" title="Usuarios">◎</a>
        <a href="/configuracoes" title="Configuracoes">⚙</a>
        <form class="bottom" method="post" action="/api/logout"><button title="Sair">↩</button></form>
      </aside>
      <section class="wa-list">
        <header class="wa-list-header"><h1>Conversas</h1><span>⋮</span></header>
        <label class="wa-search"><input placeholder="Pesquisar ou começar uma nova conversa" /></label>
        <form class="start-form" id="start-conversation">
          <input name="name" placeholder="Nome opcional" />
          <input name="phone" placeholder="Telefone com DDI e DDD. Ex: 5511999999999" required />
          <button type="submit">Iniciar conversa</button>
        </form>
        <div class="wa-items">${listHtml}</div>
      </section>
      <section class="wa-chat">${chatHtml}</section>
    </div>
    <script>
      var activeConversationId = ${JSON.stringify(activeConversationId)};
      function escapeText(value) {
        return String(value || '').replace(/[&<>"']/g, function (char) {
          return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char];
        });
      }
      function renderConversationList(items) {
        var container = document.querySelector('.wa-items');
        if (!container) return;
        if (!items.length) {
          container.innerHTML = '<div class="preview" style="padding:18px">Nenhuma conversa recebida ainda.</div>';
          return;
        }
        container.innerHTML = items.map(function (item) {
          var active = item.id === activeConversationId ? ' active' : '';
          var initial = escapeText((item.name || item.phone || 'P').trim().slice(0, 1).toUpperCase());
          return '<a class="wa-item' + active + '" href="/conversas/' + encodeURIComponent(item.id) + '">' +
            '<div class="avatar">' + initial + '</div>' +
            '<div><strong>' + escapeText(item.name) + '</strong><div class="preview">' + escapeText(item.last_message || item.phone) + '</div></div>' +
            '<div><div class="time">' + escapeText(item.time) + '</div><span class="status-pill ' + escapeText(item.status) + '">' + escapeText(item.status) + '</span></div>' +
          '</a>';
        }).join('');
      }
      function loadConversations() {
        fetch('/api/conversations').then(function (response) {
          if (!response.ok) throw new Error('Falha ao carregar conversas');
          return response.json();
        }).then(renderConversationList).catch(function (error) {
          console.error(error);
        });
      }
      function renderMessages(data) {
        var container = document.getElementById('chat-messages');
        if (!container) return;
        container.innerHTML = '<div class="day">Hoje</div><div class="secure">Esta empresa usa a WhatsApp Cloud API oficial da Meta para gerenciar esta conversa.</div>' +
          data.messages.map(function (item) {
            var type = item.direction === 'sent' ? 'sent' : 'received';
            return '<article class="bubble ' + type + '"><p>' + escapeText(item.text) + '</p><span>' + escapeText(item.time) + (item.status ? ' ✓ ' + escapeText(item.status) : '') + '</span></article>';
          }).join('');
        container.scrollTop = container.scrollHeight;
      }
      function loadMessages() {
        if (!activeConversationId) return;
        fetch('/api/conversations/' + encodeURIComponent(activeConversationId) + '/messages').then(function (response) {
          if (!response.ok) throw new Error('Falha ao carregar mensagens');
          return response.json();
        }).then(renderMessages).catch(function (error) {
          console.error(error);
        });
      }
      var startForm = document.getElementById('start-conversation');
      if (startForm) {
        startForm.addEventListener('submit', function (event) {
          event.preventDefault();
          var formData = new FormData(startForm);
          fetch('/api/conversations/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.get('name'),
              phone: formData.get('phone')
            })
          }).then(function (response) {
            if (!response.ok) throw new Error('Falha ao iniciar conversa');
            return response.json();
          }).then(function (conversation) {
            window.location.href = '/conversas/' + encodeURIComponent(conversation.id);
          }).catch(function (error) {
            alert(error.message);
          });
        });
      }
      loadConversations();
      loadMessages();
      setInterval(loadConversations, 8000);
      setInterval(loadMessages, 5000);
    </script>
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

adminRouter.get('/api/conversations', requireSession, (_req, res) => {
  return res.json(
    listConversations().map((item) => ({
      id: item.id,
      wa_id: item.waId,
      name: item.name,
      phone: item.phone,
      last_message: item.lastMessage,
      time: item.time,
      status: item.status
    }))
  );
});

adminRouter.get('/api/conversations/:id/messages', requireSession, (req, res) => {
  const conversation = getConversation(req.params.id);

  if (!conversation) {
    return res.status(404).json({ message: 'Conversa nao encontrada.' });
  }

  return res.json({
    conversation: {
      id: conversation.id,
      wa_id: conversation.waId,
      name: conversation.name,
      phone: conversation.phone,
      status: conversation.status
    },
    messages: conversation.messages.map((item) => ({
      id: item.id,
      wa_message_id: item.waMessageId,
      direction: item.direction,
      text: item.text,
      time: item.time,
      timestamp: item.timestamp,
      status: item.status
    }))
  });
});

adminRouter.post('/api/conversations/start', requireSession, (req, res) => {
  const phone = String(req.body?.phone ?? '').trim();
  const name = String(req.body?.name ?? '').trim();

  if (!phone) {
    return res.status(400).json({ message: 'Informe o telefone com DDI e DDD.' });
  }

  const conversation = createConversation(phone, name);
  return res.status(201).json({
    id: conversation.id,
    wa_id: conversation.waId,
    name: conversation.name,
    phone: conversation.phone,
    status: conversation.status
  });
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
  const listHtml = conversations.length
    ? conversations
        .map(
          (item) => `<a class="wa-item" href="/conversas/${encodeURIComponent(item.id)}">
            <div class="avatar">${initials(item.name)}</div>
            <div><strong>${escapeHtml(item.name)}</strong><div class="preview">${escapeHtml(item.lastMessage || item.phone)}</div></div>
            <div><div class="time">${escapeHtml(item.time)}</div><span class="status-pill ${item.status}">${item.status}</span></div>
          </a>`
        )
        .join('')
    : '<div class="preview" style="padding:18px">Nenhuma conversa recebida ainda.</div>';
  const chatHtml = `<div class="empty-chat"><div><h2>Central Pamda Cases</h2><p>Selecione uma conversa para iniciar o atendimento.</p><p>O fundo do chat combina elementos de panda e bambu.</p></div></div>`;
  return res.type('html').send(whatsappShell('Conversas', listHtml, chatHtml));
});

adminRouter.get('/conversas/:id', requireSession, (req, res) => {
  const conversation = getConversation(req.params.id);
  if (!conversation) {
    return res.redirect('/conversas');
  }

  const conversations = listConversations();
  const listHtml = conversations
    .map(
      (item) => `<a class="wa-item ${item.id === conversation.id ? 'active' : ''}" href="/conversas/${encodeURIComponent(item.id)}">
        <div class="avatar">${initials(item.name)}</div>
        <div><strong>${escapeHtml(item.name)}</strong><div class="preview">${escapeHtml(item.lastMessage || item.phone)}</div></div>
        <div><div class="time">${escapeHtml(item.time)}</div><span class="status-pill ${item.status}">${item.status}</span></div>
      </a>`
    )
    .join('');
  const chatHtml = `<header class="chat-header">
      <div class="chat-person"><div class="avatar">${initials(conversation.name)}</div><div><strong>${escapeHtml(conversation.name)}</strong><span>${escapeHtml(conversation.phone)}</span></div></div>
      <div class="chat-actions"><span>⌕</span><span>⋮</span></div>
    </header>
    <div class="chat-bg" id="chat-messages">
      <div class="day">Hoje</div>
      <div class="secure">Esta empresa usa a WhatsApp Cloud API oficial da Meta para gerenciar esta conversa.</div>
      ${conversation.messages
        .map((item) => `<article class="bubble ${item.direction === 'sent' ? 'sent' : 'received'}"><p>${escapeHtml(item.text)}</p><span>${escapeHtml(item.time)}${item.status ? ` ✓ ${escapeHtml(item.status)}` : ''}</span></article>`)
        .join('')}
    </div>
    <form class="composer" method="post" action="/conversas/${encodeURIComponent(conversation.id)}/send">
      <div class="plus">+</div>
      <textarea name="body" placeholder="Digite uma mensagem"></textarea>
      <button type="submit">➤</button>
    </form>`;
  return res.type('html').send(whatsappShell(conversation.name, listHtml, chatHtml, conversation.id));
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
    const errorMessage =
      error instanceof WhatsAppCloudApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Erro desconhecido ao enviar pela Cloud API.';
    addOutboundMessage(conversation.waId, `${body}\n\nErro Meta: ${errorMessage}`, undefined, 'failed');
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

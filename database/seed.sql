-- Opcional: o login usa credenciais fixas em backend/src/hardcoded-users.ts.
-- Este seed apenas espelha os usuarios no banco para consultas administrativas futuras.

insert into users (id, name, username, password_hash, role)
values
  ('11111111-1111-4111-8111-111111111111', 'Administrador', 'dhanrosa', '$2a$12$pdHuZOru2xB6ea7dxpjiR.hYYQmohlcMhu4uyd1t/YM3RXzvRvDgy', 'admin'),
  ('22222222-2222-4222-8222-222222222222', 'Atendente 1', 'atendente1', '$2a$12$WK/tAWp1Kbr35sDhLhxBzev0J0wdDez3Gzsj9K0ONFuJLI8jXczLi', 'agent'),
  ('33333333-3333-4333-8333-333333333333', 'Atendente 2', 'atendente2', '$2a$12$bZ2WnCptOqqUgVUOq2rO0uXH06uy0AAr29KH9okRN.IGtqj2bACZK', 'agent'),
  ('44444444-4444-4444-8444-444444444444', 'Atendente 3', 'atendente3', '$2a$12$SbQ/759pslmvxhqHy0olFu2CV3DQadzMwBxCRi1e3WHZOOF8sqkHS', 'agent'),
  ('55555555-5555-4555-8555-555555555555', 'Atendente 4', 'atendente4', '$2a$12$0biFt2g74yho1W5GRlyIzOgcyw7z14OZvCX43jE6iIhihvLk/49cG', 'agent'),
  ('66666666-6666-4666-8666-666666666666', 'Atendente 5', 'atendente5', '$2a$12$.ceKjB7JCMxk1lgK6fkBXOjTd0tHB3zI/s7wOIFUXhU3RDdwIlQ.y', 'agent')
on conflict (username) do update
set name = excluded.name,
    password_hash = excluded.password_hash,
    role = excluded.role,
    active = true;

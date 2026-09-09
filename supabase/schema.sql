-- ============================================================================
-- Residencial Catalunha — schema completo do Supabase
-- ============================================================================
-- Cole este arquivo inteiro no SQL Editor do seu projeto Supabase
-- (https://supabase.com/dashboard/project/gufmoutiybfmatfuigcq/sql/new) e clique em "Run".
--
-- Isso APAGA (DROP) e recria do zero as tabelas do app. Rode apenas uma vez
-- (ou de novo, sempre que quiser resetar os dados para o estado inicial).
--
-- Depois de rodar este script, crie o usuário de login manualmente em
-- Authentication → Users → "Add user" (veja instruções no chat / README):
--   email:    catalunha@residencialcatalunha.local
--   senha:    (a senha combinada)
--   marque "Auto Confirm User"
-- ============================================================================

-- 1. Limpeza -------------------------------------------------------------
drop table if exists public.pagamentos cascade;
drop table if exists public.movimentacoes cascade;
drop table if exists public.despesas cascade;
drop table if exists public.unidades cascade;
drop table if exists public.categorias cascade;
drop table if exists public.config cascade;

-- 2. Tabelas ---------------------------------------------------------------

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  rateio_diferenciado_cobertura boolean not null default false,
  cor text not null default '#8a9bad',
  criado_em timestamptz not null default now()
);

create table public.unidades (
  id uuid primary key default gen_random_uuid(),
  identificacao text not null,
  morador text not null default '',
  email text not null default '',
  telefone text not null default '',
  tipo text not null default 'padrao' check (tipo in ('padrao', 'cobertura')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.despesas (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias (id) on delete restrict,
  descricao text not null,
  valor numeric(12, 2) not null,
  competencia text not null, -- formato AAAA-MM
  tipo text not null default 'unica' check (tipo in ('unica', 'recorrente', 'parcelada')),
  grupo_id uuid,
  parcela_atual int,
  parcela_total int,
  fornecedor_nome text not null default '',
  fornecedor_contato text not null default '',
  observacoes text not null default '',
  -- Data de vencimento (opcional), só para lembrete/exibição.
  vencimento date,
  -- Controle de pagamento ao fornecedor: só deduz do saldo de caixa quando true.
  pago boolean not null default false,
  criado_em timestamptz not null default now()
);
create index despesas_competencia_idx on public.despesas (competencia);
create index despesas_grupo_idx on public.despesas (grupo_id);

create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references public.unidades (id) on delete cascade,
  competencia text not null, -- formato AAAA-MM
  valor_pago numeric(12, 2) not null default 0,
  data_pagamento date,
  forma_pagamento text not null default '',
  observacoes text not null default '',
  criado_em timestamptz not null default now(),
  unique (unidade_id, competencia)
);
create index pagamentos_competencia_idx on public.pagamentos (competencia);

create table public.movimentacoes (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  descricao text not null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  valor numeric(12, 2) not null,
  criado_em timestamptz not null default now()
);

create table public.config (
  id smallint primary key default 1,
  nome_condominio text not null default 'Residencial Catalunha',
  endereco text not null default '',
  -- Taxa fixa de condomínio, igual para toda unidade, todo mês (não é rateada).
  valor_condominio numeric(12, 2) not null default 400,
  -- Regra do rateio diferenciado DA ÁGUA (única categoria rateada): unidade padrão = 1 cota,
  -- cobertura = 1 cota + acréscimo. Com tipo 'percentual' e valor 50, cobertura paga 1,5 cota
  -- (ex.: água dividida em partes, onde cada padrão vale 1 parte e cada cobertura vale 1,5 parte).
  regra_cobertura_ativa boolean not null default true,
  tipo_acrescimo text not null default 'percentual' check (tipo_acrescimo in ('percentual', 'fixo')),
  valor_acrescimo numeric(12, 2) not null default 50,
  constraint config_singleton check (id = 1)
);

-- 3. Segurança (RLS): nenhum acesso externo/anônimo, só sessão autenticada -----
alter table public.categorias enable row level security;
alter table public.unidades enable row level security;
alter table public.despesas enable row level security;
alter table public.pagamentos enable row level security;
alter table public.movimentacoes enable row level security;
alter table public.config enable row level security;

-- Usuário com app_metadata.role = 'visualizador' só lê; qualquer outro autenticado
-- (inclusive sem role definida) é tratado como admin e pode cadastrar/editar/excluir.
create or replace function public.eh_visualizador() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'admin') = 'visualizador';
$$;

do $$
declare
  tabela text;
begin
  foreach tabela in array array['categorias', 'unidades', 'despesas', 'pagamentos', 'movimentacoes', 'config'] loop
    execute format('create policy "leitura_autenticados" on public.%I for select to authenticated using (true)', tabela);
    execute format('create policy "insercao_admin" on public.%I for insert to authenticated with check (not public.eh_visualizador())', tabela);
    execute format('create policy "atualizacao_admin" on public.%I for update to authenticated using (not public.eh_visualizador()) with check (not public.eh_visualizador())', tabela);
    execute format('create policy "exclusao_admin" on public.%I for delete to authenticated using (not public.eh_visualizador())', tabela);
  end loop;
end $$;

-- Nenhuma policy é criada para o papel "anon" (visitante não logado), então o
-- Postgres nega por padrão todo acesso de fora do app autenticado.

-- 4. Dados iniciais ---------------------------------------------------------

insert into public.config (id, nome_condominio, endereco, valor_condominio, regra_cobertura_ativa, tipo_acrescimo, valor_acrescimo)
values (1, 'Residencial Catalunha', '', 400, true, 'percentual', 50);

insert into public.categorias (id, nome, rateio_diferenciado_cobertura, cor) values
  ('0d6223af-cf73-43e7-bb77-e9681169aff2', 'Água', true, '#2c6cae'),
  ('5cd38b0f-d57d-4155-a16b-ccb5616436e7', 'Luz', false, '#f2a13c'),
  ('9d6f1c01-9b33-4fe9-a1c8-ebbd4417095c', 'DARF', false, '#5c7690'),
  ('417a1012-ad76-49e3-a0a3-e573fcb0bf4c', 'Faxineira', false, '#1a8a8a'),
  ('0900a00d-70ea-440c-86cd-e6eeef4b981f', 'Conservadora', false, '#7fb0dc'),
  ('de5494d5-a2aa-4a86-af1a-662f64e494ba', 'Manutenção do Elevador', false, '#1f5590'),
  ('fed49c8f-b026-485a-9959-020173475592', 'Jardineiro', false, '#2e9e5b'),
  ('929ef23d-0916-4d93-b873-4469adc98375', 'Fundo de Reserva', false, '#16375d'),
  ('f3f0b76f-9e4e-4970-bce0-f266c27af437', 'Material de Limpeza', false, '#4a8bc9'),
  ('4815feaa-9a40-4510-9cb7-56059e791a4e', 'Internet', false, '#d64545'),
  ('1240e432-fd86-4c9b-877f-026e69f12c41', 'Manutenção Geral', false, '#f2a13c'),
  ('6ed453c8-0f64-42c6-bdf6-d4fddca44593', 'Segurança e Automação', false, '#16375d'),
  ('2cd283f4-e369-4df3-8cb7-59046cffb068', 'Outros', false, '#8a9bad');

-- Histórico jan-ago/2026 (importado da planilha "DESPESAS CONDOMINIO CATALUNHA.xlsx").
insert into public.despesas (categoria_id, descricao, valor, competencia, tipo) values
  ('0d6223af-cf73-43e7-bb77-e9681169aff2', 'Água', 182.28, '2026-01', 'unica'),
  ('0d6223af-cf73-43e7-bb77-e9681169aff2', 'Água', 66,     '2026-02', 'unica'),
  ('0d6223af-cf73-43e7-bb77-e9681169aff2', 'Água', 77.1,   '2026-03', 'unica'),
  ('0d6223af-cf73-43e7-bb77-e9681169aff2', 'Água', 106.7,  '2026-04', 'unica'),
  ('0d6223af-cf73-43e7-bb77-e9681169aff2', 'Água', 83.7,   '2026-05', 'unica'),
  ('0d6223af-cf73-43e7-bb77-e9681169aff2', 'Água', 99,     '2026-06', 'unica'),
  ('0d6223af-cf73-43e7-bb77-e9681169aff2', 'Água', 89.3,   '2026-07', 'unica'),
  ('0d6223af-cf73-43e7-bb77-e9681169aff2', 'Água', 71,     '2026-08', 'unica'),

  ('5cd38b0f-d57d-4155-a16b-ccb5616436e7', 'Luz', 169.24, '2026-01', 'unica'),
  ('5cd38b0f-d57d-4155-a16b-ccb5616436e7', 'Luz', 163.69, '2026-02', 'unica'),
  ('5cd38b0f-d57d-4155-a16b-ccb5616436e7', 'Luz', 198.67, '2026-03', 'unica'),
  ('5cd38b0f-d57d-4155-a16b-ccb5616436e7', 'Luz', 211.05, '2026-04', 'unica'),
  ('5cd38b0f-d57d-4155-a16b-ccb5616436e7', 'Luz', 109.18, '2026-05', 'unica'),
  ('5cd38b0f-d57d-4155-a16b-ccb5616436e7', 'Luz', 80.79,  '2026-06', 'unica'),
  ('5cd38b0f-d57d-4155-a16b-ccb5616436e7', 'Luz', 290.33, '2026-07', 'unica'),
  ('5cd38b0f-d57d-4155-a16b-ccb5616436e7', 'Luz', 280.62, '2026-08', 'unica');

insert into public.despesas (categoria_id, descricao, valor, competencia, tipo, fornecedor_nome, fornecedor_contato) values
  ('0900a00d-70ea-440c-86cd-e6eeef4b981f', 'Conservadora', 990,     '2026-05', 'unica', 'Conservadora Ferreira e Chagas', '31 98120-4557'),
  ('0900a00d-70ea-440c-86cd-e6eeef4b981f', 'Conservadora', 990,     '2026-06', 'unica', 'Conservadora Ferreira e Chagas', '31 98120-4557'),
  ('0900a00d-70ea-440c-86cd-e6eeef4b981f', 'Conservadora', 1011.11, '2026-07', 'unica', 'Conservadora Ferreira e Chagas', '31 98120-4557'),
  ('0900a00d-70ea-440c-86cd-e6eeef4b981f', 'Conservadora', 1010.78, '2026-08', 'unica', 'Conservadora Ferreira e Chagas', '31 98120-4557'),

  ('de5494d5-a2aa-4a86-af1a-662f64e494ba', 'Manutenção do Elevador', 432.53, '2026-01', 'unica', 'Otis Elevadores', '31 3057-8300'),
  ('de5494d5-a2aa-4a86-af1a-662f64e494ba', 'Manutenção do Elevador', 431.41, '2026-02', 'unica', 'Otis Elevadores', '31 3057-8300'),
  ('de5494d5-a2aa-4a86-af1a-662f64e494ba', 'Manutenção do Elevador', 420.49, '2026-03', 'unica', 'Otis Elevadores', '31 3057-8300'),
  ('de5494d5-a2aa-4a86-af1a-662f64e494ba', 'Manutenção do Elevador', 420.49, '2026-04', 'unica', 'Otis Elevadores', '31 3057-8300'),
  ('de5494d5-a2aa-4a86-af1a-662f64e494ba', 'Manutenção do Elevador', 420.49, '2026-05', 'unica', 'Otis Elevadores', '31 3057-8300'),
  ('de5494d5-a2aa-4a86-af1a-662f64e494ba', 'Manutenção do Elevador', 420.49, '2026-06', 'unica', 'Otis Elevadores', '31 3057-8300'),
  ('de5494d5-a2aa-4a86-af1a-662f64e494ba', 'Manutenção do Elevador', 431.55, '2026-07', 'unica', 'Otis Elevadores', '31 3057-8300'),
  ('de5494d5-a2aa-4a86-af1a-662f64e494ba', 'Manutenção do Elevador', 431.55, '2026-08', 'unica', 'Otis Elevadores', '31 3057-8300');

insert into public.despesas (categoria_id, descricao, valor, competencia, tipo) values
  ('fed49c8f-b026-485a-9959-020173475592', 'Jardineiro', 400, '2026-02', 'unica'),
  ('f3f0b76f-9e4e-4970-bce0-f266c27af437', 'Material de Limpeza', 182.28, '2026-02', 'unica'),
  ('f3f0b76f-9e4e-4970-bce0-f266c27af437', 'Material de Limpeza', 259.8,  '2026-03', 'unica'),
  ('f3f0b76f-9e4e-4970-bce0-f266c27af437', 'Material de Limpeza', 226.44, '2026-04', 'unica'),
  ('4815feaa-9a40-4510-9cb7-56059e791a4e', 'Internet', 154.01, '2026-06', 'unica'),
  ('4815feaa-9a40-4510-9cb7-56059e791a4e', 'Internet', 142.8,  '2026-07', 'unica'),
  ('4815feaa-9a40-4510-9cb7-56059e791a4e', 'Internet', 142.8,  '2026-08', 'unica');

insert into public.despesas (categoria_id, descricao, valor, competencia, tipo, observacoes) values
  ('2cd283f4-e369-4df3-8cb7-59046cffb068', 'Insulfilm porta', 300, '2026-01', 'unica', ''),
  ('1240e432-fd86-4c9b-877f-026e69f12c41', 'Torneira + serviço', 150, '2026-06', 'unica', '');

-- Recorrentes (DARF, Fundo de Reserva, Faxineira) e parcelada (Segurança/Automação).
insert into public.despesas (categoria_id, descricao, valor, competencia, tipo, grupo_id, parcela_atual, parcela_total) values
  ('9d6f1c01-9b33-4fe9-a1c8-ebbd4417095c', 'DARF', 20.51, '2026-01', 'recorrente', '675b9285-46cb-4857-8477-78375e179108', null, null),
  ('9d6f1c01-9b33-4fe9-a1c8-ebbd4417095c', 'DARF', 20.51, '2026-02', 'recorrente', '675b9285-46cb-4857-8477-78375e179108', null, null),
  ('9d6f1c01-9b33-4fe9-a1c8-ebbd4417095c', 'DARF', 20.51, '2026-03', 'recorrente', '675b9285-46cb-4857-8477-78375e179108', null, null),
  ('9d6f1c01-9b33-4fe9-a1c8-ebbd4417095c', 'DARF', 20.51, '2026-04', 'recorrente', '675b9285-46cb-4857-8477-78375e179108', null, null),
  ('9d6f1c01-9b33-4fe9-a1c8-ebbd4417095c', 'DARF', 20.51, '2026-05', 'recorrente', '675b9285-46cb-4857-8477-78375e179108', null, null),
  ('9d6f1c01-9b33-4fe9-a1c8-ebbd4417095c', 'DARF', 20.51, '2026-06', 'recorrente', '675b9285-46cb-4857-8477-78375e179108', null, null),
  ('9d6f1c01-9b33-4fe9-a1c8-ebbd4417095c', 'DARF', 20.51, '2026-07', 'recorrente', '675b9285-46cb-4857-8477-78375e179108', null, null),
  ('9d6f1c01-9b33-4fe9-a1c8-ebbd4417095c', 'DARF', 20.51, '2026-08', 'recorrente', '675b9285-46cb-4857-8477-78375e179108', null, null),

  ('929ef23d-0916-4d93-b873-4469adc98375', 'Fundo de Reserva para Imprevistos', 800, '2026-01', 'recorrente', '05a551ca-1778-4ce7-a307-1a0023ab4e7b', null, null),
  ('929ef23d-0916-4d93-b873-4469adc98375', 'Fundo de Reserva para Imprevistos', 800, '2026-02', 'recorrente', '05a551ca-1778-4ce7-a307-1a0023ab4e7b', null, null),
  ('929ef23d-0916-4d93-b873-4469adc98375', 'Fundo de Reserva para Imprevistos', 800, '2026-03', 'recorrente', '05a551ca-1778-4ce7-a307-1a0023ab4e7b', null, null),
  ('929ef23d-0916-4d93-b873-4469adc98375', 'Fundo de Reserva para Imprevistos', 800, '2026-04', 'recorrente', '05a551ca-1778-4ce7-a307-1a0023ab4e7b', null, null),
  ('929ef23d-0916-4d93-b873-4469adc98375', 'Fundo de Reserva para Imprevistos', 800, '2026-05', 'recorrente', '05a551ca-1778-4ce7-a307-1a0023ab4e7b', null, null),
  ('929ef23d-0916-4d93-b873-4469adc98375', 'Fundo de Reserva para Imprevistos', 800, '2026-06', 'recorrente', '05a551ca-1778-4ce7-a307-1a0023ab4e7b', null, null),
  ('929ef23d-0916-4d93-b873-4469adc98375', 'Fundo de Reserva para Imprevistos', 800, '2026-07', 'recorrente', '05a551ca-1778-4ce7-a307-1a0023ab4e7b', null, null),
  ('929ef23d-0916-4d93-b873-4469adc98375', 'Fundo de Reserva para Imprevistos', 800, '2026-08', 'recorrente', '05a551ca-1778-4ce7-a307-1a0023ab4e7b', null, null),

  ('417a1012-ad76-49e3-a0a3-e573fcb0bf4c', 'Faxineira', 600, '2026-01', 'recorrente', '0da00982-3ad2-4526-af34-88f0e686e93f', null, null),
  ('417a1012-ad76-49e3-a0a3-e573fcb0bf4c', 'Faxineira', 600, '2026-02', 'recorrente', '0da00982-3ad2-4526-af34-88f0e686e93f', null, null),
  ('417a1012-ad76-49e3-a0a3-e573fcb0bf4c', 'Faxineira', 600, '2026-03', 'recorrente', '0da00982-3ad2-4526-af34-88f0e686e93f', null, null),
  ('417a1012-ad76-49e3-a0a3-e573fcb0bf4c', 'Faxineira', 600, '2026-04', 'recorrente', '0da00982-3ad2-4526-af34-88f0e686e93f', null, null);

update public.despesas set observacoes = 'Contrato encerrado a partir de maio/2026.'
where grupo_id = '0da00982-3ad2-4526-af34-88f0e686e93f';

insert into public.despesas (categoria_id, descricao, valor, competencia, tipo, grupo_id, parcela_atual, parcela_total, fornecedor_nome, fornecedor_contato, observacoes) values
  ('6ed453c8-0f64-42c6-bdf6-d4fddca44593', 'Automação das entradas', 433, '2026-07', 'parcelada', '181d1579-aa04-409a-90ed-a15b9b7ecb4c', 1,  10, 'Claudiney (Fechaduras/Câmeras)', '31 99759-4998', 'Parcela paga por David · 1ª parcela em julho/2026.'),
  ('6ed453c8-0f64-42c6-bdf6-d4fddca44593', 'Automação das entradas', 433, '2026-08', 'parcelada', '181d1579-aa04-409a-90ed-a15b9b7ecb4c', 2,  10, 'Claudiney (Fechaduras/Câmeras)', '31 99759-4998', 'Parcela paga por David · 1ª parcela em julho/2026.'),
  ('6ed453c8-0f64-42c6-bdf6-d4fddca44593', 'Automação das entradas', 433, '2026-09', 'parcelada', '181d1579-aa04-409a-90ed-a15b9b7ecb4c', 3,  10, 'Claudiney (Fechaduras/Câmeras)', '31 99759-4998', 'Parcela paga por David · 1ª parcela em julho/2026.'),
  ('6ed453c8-0f64-42c6-bdf6-d4fddca44593', 'Automação das entradas', 433, '2026-10', 'parcelada', '181d1579-aa04-409a-90ed-a15b9b7ecb4c', 4,  10, 'Claudiney (Fechaduras/Câmeras)', '31 99759-4998', 'Parcela paga por David · 1ª parcela em julho/2026.'),
  ('6ed453c8-0f64-42c6-bdf6-d4fddca44593', 'Automação das entradas', 433, '2026-11', 'parcelada', '181d1579-aa04-409a-90ed-a15b9b7ecb4c', 5,  10, 'Claudiney (Fechaduras/Câmeras)', '31 99759-4998', 'Parcela paga por David · 1ª parcela em julho/2026.'),
  ('6ed453c8-0f64-42c6-bdf6-d4fddca44593', 'Automação das entradas', 433, '2026-12', 'parcelada', '181d1579-aa04-409a-90ed-a15b9b7ecb4c', 6,  10, 'Claudiney (Fechaduras/Câmeras)', '31 99759-4998', 'Parcela paga por David · 1ª parcela em julho/2026.'),
  ('6ed453c8-0f64-42c6-bdf6-d4fddca44593', 'Automação das entradas', 433, '2027-01', 'parcelada', '181d1579-aa04-409a-90ed-a15b9b7ecb4c', 7,  10, 'Claudiney (Fechaduras/Câmeras)', '31 99759-4998', 'Parcela paga por David · 1ª parcela em julho/2026.'),
  ('6ed453c8-0f64-42c6-bdf6-d4fddca44593', 'Automação das entradas', 433, '2027-02', 'parcelada', '181d1579-aa04-409a-90ed-a15b9b7ecb4c', 8,  10, 'Claudiney (Fechaduras/Câmeras)', '31 99759-4998', 'Parcela paga por David · 1ª parcela em julho/2026.'),
  ('6ed453c8-0f64-42c6-bdf6-d4fddca44593', 'Automação das entradas', 433, '2027-03', 'parcelada', '181d1579-aa04-409a-90ed-a15b9b7ecb4c', 9,  10, 'Claudiney (Fechaduras/Câmeras)', '31 99759-4998', 'Parcela paga por David · 1ª parcela em julho/2026.'),
  ('6ed453c8-0f64-42c6-bdf6-d4fddca44593', 'Automação das entradas', 433, '2027-04', 'parcelada', '181d1579-aa04-409a-90ed-a15b9b7ecb4c', 10, 10, 'Claudiney (Fechaduras/Câmeras)', '31 99759-4998', 'Parcela paga por David · 1ª parcela em julho/2026.');

insert into public.movimentacoes (data, descricao, tipo, valor) values
  ('2026-08-31', 'Saldo inicial de caixa (fechamento anterior ao sistema)', 'entrada', 1590.94);

-- Cadastre as unidades (apartamentos) pela tela "Unidades" do app — não há como
-- pré-cadastrá-las aqui porque a planilha original não trazia essa lista.

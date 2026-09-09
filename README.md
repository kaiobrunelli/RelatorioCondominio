# Gestão do Condomínio — Residencial Catalunha

Aplicação Angular para controlar despesas, rateio da taxa de condomínio e caixa. Os dados ficam no
Supabase (Postgres + RLS); o acesso exige login (usuário/senha do Supabase Auth).

## Rodando localmente

```bash
npm install
npm start
```

Abra `http://localhost:4200`. Antes de rodar, configure `src/app/core/supabase/supabase.config.ts`
com a URL e a `anon key` do seu projeto Supabase (Settings → API no dashboard).

## Configurando o Supabase

1. Rode `supabase/schema.sql` inteiro no **SQL Editor** do seu projeto Supabase — ele apaga e recria
   as tabelas, ativa RLS (só sessão autenticada acessa; anônimo é bloqueado) e insere as categorias e
   o histórico de despesas jan–ago/2026.
2. Em **Authentication → Users → Add user**, crie o usuário de login do síndico (e-mail
   `catalunha@residencialcatalunha.local`, a senha combinada, marcando "Auto Confirm User"). A tela de
   login do app pede apenas um "login" simples (ex.: `catalunha`), que é convertido internamente nesse
   e-mail antes de chamar o Supabase Auth.
3. Cadastre as unidades (apartamentos) pela tela **Unidades** do app — a planilha original não trazia
   essa lista, então elas não vêm pré-cadastradas.

## Como o rateio funciona

- Cada despesa lançada em **Despesas** tem uma competência (mês/ano), pode ser **única**, **recorrente**
  (gera vários lançamentos iguais em meses seguintes) ou **parcelada** (gera N parcelas fixas).
- Em **Unidades**, cadastre os apartamentos e marque quais são do tipo **cobertura**.
- Em **Configurações**, defina se as unidades cobertura pagam um valor fixo (R$) ou percentual (%) a
  mais nas categorias marcadas como "rateio diferenciado" (por padrão, só a categoria Água). O padrão
  de fábrica é **percentual +50%**, ou seja: cada apartamento padrão vale 1 cota e cada cobertura vale
  1,5 cota — equivalente a dividir a conta de água em partes (ex.: 6 padrão + 2 cobertura = 6 + 3 = 9
  partes).
- A tela **Rateio** mostra o cálculo do mês: cada categoria é dividida igualmente entre as unidades
  ativas, exceto as marcadas como diferenciadas, que aplicam a regra de acréscimo para coberturas. A
  soma dos valores por unidade sempre bate com o total de despesas do mês (o eventual resto de
  arredondamento é absorvido na última unidade).
- A tela **Caixa** registra os pagamentos recebidos de cada unidade (selecione a unidade na lista e
  informe o valor recebido) e permite lançar movimentações manuais (saldo inicial, retiradas, aportes).
- A tela **Relatório** consolida, por período, o total lançado (despesas rateadas) x total recebido dos
  moradores, com detalhamento por mês e por unidade.

## Autenticação e segurança

- Login único (síndico) via Supabase Auth, e-mail/senha. Sem sessão válida, o app redireciona para
  `/login` e o banco recusa qualquer leitura/escrita (RLS: só role `authenticated`, sem policy para
  `anon`).
- A `anon key` do Supabase não é secreta — ela só abre o que o RLS permitir, por isso pode ficar no
  código do front-end.

## Estrutura

- `src/app/core/models` — tipos de domínio (Despesa, Unidade, Categoria, Pagamento, Movimentação, Config).
- `src/app/core/supabase` — cliente Supabase, config de URL/anon key e o mapeador camelCase ↔ snake_case.
- `src/app/core/services` — um serviço por entidade, todos construídos sobre `EntityStore`
  (`core/services/entity-store.ts`), que centraliza a persistência no Supabase com atualização
  otimista do estado local (signals).
- `src/app/core/services/auth.service.ts` / `core/guards/auth.guard.ts` — sessão e proteção de rotas.
- `src/app/core/services/rateio.service.ts` — motor de cálculo do rateio.
- `src/app/features/*` — uma pasta por tela (login, dashboard, despesas, unidades, rateio, caixa,
  relatorio, configuracoes).
- `src/app/shared/ui` — componentes visuais reutilizáveis (cards, modal, badge, etc.).
- `supabase/schema.sql` — schema completo (tabelas, RLS, seed) para colar no SQL Editor.

## Deploy no Vercel

O projeto já inclui `vercel.json` (build `npm run build`, saída em
`dist/condominio-catalunha/browser`, com rewrite de SPA para `index.html`).

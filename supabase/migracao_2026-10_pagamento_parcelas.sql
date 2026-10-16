alter table public.pagamentos
  add column if not exists pago_condominio boolean not null default false,
  add column if not exists pago_agua boolean not null default false;

update public.pagamentos p
set pago_condominio = p.valor_pago >= c.valor_condominio - 0.01
from public.config c
where c.id = 1;

update public.pagamentos p
set pago_agua = true
from public.config c
where c.id = 1
  and p.valor_pago > c.valor_condominio + 0.01
  and exists (
    select 1
    from public.despesas d
    join public.categorias cat on cat.id = d.categoria_id
    where cat.rateio_diferenciado_cobertura
      and d.competencia = p.competencia
      and d.valor > 0
  );

notify pgrst, 'reload schema';

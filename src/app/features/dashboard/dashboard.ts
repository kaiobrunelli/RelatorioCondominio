import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAlertTriangle,
  LucideCalendarClock,
  LucideCircleCheck,
  LucideClock,
  LucidePiggyBank,
  LucideReceiptText,
  LucideWallet,
} from '@lucide/angular';
import { CaixaService } from '../../core/services/caixa.service';
import { CategoriasService } from '../../core/services/categorias.service';
import { DespesasService } from '../../core/services/despesas.service';
import { MonthService } from '../../core/services/month.service';
import { PagamentosService } from '../../core/services/pagamentos.service';
import { RateioService } from '../../core/services/rateio.service';
import { UnidadesService } from '../../core/services/unidades.service';
import { somarMeses } from '../../core/utils/competencia.util';
import { BrlPipe } from '../../shared/pipes/brl.pipe';
import { CompetenciaPipe } from '../../shared/pipes/competencia.pipe';
import { Card } from '../../shared/ui/card/card';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { KpiCard } from '../../shared/ui/kpi-card/kpi-card';
import { MonthSwitcher } from '../../shared/ui/month-switcher/month-switcher';
import { PageHeader } from '../../shared/ui/page-header/page-header';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    BrlPipe,
    CompetenciaPipe,
    Card,
    EmptyState,
    KpiCard,
    MonthSwitcher,
    PageHeader,
    LucideAlertTriangle,
    LucideCalendarClock,
    LucideCircleCheck,
    LucideClock,
    LucidePiggyBank,
    LucideReceiptText,
    LucideWallet,
  ],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly despesasService = inject(DespesasService);
  private readonly categoriasService = inject(CategoriasService);
  private readonly unidadesService = inject(UnidadesService);
  private readonly pagamentosService = inject(PagamentosService);
  private readonly caixaService = inject(CaixaService);
  protected readonly rateioService = inject(RateioService);
  protected readonly month = inject(MonthService);

  protected readonly rateio = computed(() => this.rateioService.calcular(this.month.competencia()));

  // -- Despesas do mês (contas do condomínio: o que já saiu e o que ainda vai sair) --
  protected readonly despesasDoMes = computed(() => this.despesasService.porCompetencia(this.month.competencia()));
  protected readonly totalDespesas = computed(() => this.despesasDoMes().reduce((s, d) => s + d.valor, 0));
  protected readonly despesasPagas = computed(() =>
    this.despesasDoMes()
      .filter((d) => d.pago)
      .reduce((s, d) => s + d.valor, 0),
  );
  protected readonly despesasAPagar = computed(() => this.totalDespesas() - this.despesasPagas());

  // -- Recebimento dos moradores no mês (cobrança: condomínio fixo + água) --
  protected readonly totalCobrado = computed(() => this.rateio().totalCobrado);
  protected readonly totalRecebido = computed(() =>
    this.pagamentosService
      .porCompetencia(this.month.competencia())
      .reduce((soma, p) => soma + p.valorPago, 0),
  );
  protected readonly emAbertoMoradores = computed(() => Math.max(0, this.totalCobrado() - this.totalRecebido()));

  // -- Saldo real de caixa (o que importa: sobra ou falta dinheiro) --
  protected readonly saldoCaixa = computed(() => this.caixaService.saldoAcumulado(this.month.competencia()));

  protected readonly categoriasOrdenadas = computed(() => {
    const despesasMes = this.despesasDoMes();
    const total = this.totalDespesas();

    const totalPorCategoria = new Map<string, number>();
    for (const despesa of despesasMes) {
      totalPorCategoria.set(despesa.categoriaId, (totalPorCategoria.get(despesa.categoriaId) ?? 0) + despesa.valor);
    }

    return [...totalPorCategoria.entries()]
      .map(([categoriaId, valor]) => ({
        categoriaId,
        categoriaNome: this.categoriasService.byId(categoriaId)?.nome ?? 'Sem categoria',
        total: valor,
        percentual: total > 0 ? (valor / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  });

  protected readonly tendencia = computed(() => {
    const meses = Array.from({ length: 6 }, (_, i) => somarMeses(this.month.competencia(), i - 5));
    const valores = meses.map((competencia) =>
      this.despesasService.porCompetencia(competencia).reduce((s, d) => s + d.valor, 0),
    );
    const max = Math.max(1, ...valores);
    return meses.map((competencia, i) => ({
      competencia,
      valor: valores[i],
      altura: Math.max(4, Math.round((valores[i] / max) * 100)),
    }));
  });

  protected readonly semUnidades = computed(() => this.unidadesService.ativas().length === 0);

  protected readonly parceladasEmAberto = computed(() => {
    const hoje = this.month.competencia();
    return this.despesasService
      .all()
      .filter((d) => d.tipo === 'parcelada' && d.competencia >= hoje).length;
  });
}

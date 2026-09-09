import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideCircleCheck, LucideCircleDollarSign, LucideScale, LucideWallet } from '@lucide/angular';
import { Unidade } from '../../core/models';
import { DespesasService } from '../../core/services/despesas.service';
import { PagamentosService } from '../../core/services/pagamentos.service';
import { RateioService } from '../../core/services/rateio.service';
import { UnidadesService } from '../../core/services/unidades.service';
import { competenciaAtual, formatarCompetenciaCurta } from '../../core/utils/competencia.util';
import { BrlPipe } from '../../shared/pipes/brl.pipe';
import { Card } from '../../shared/ui/card/card';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { KpiCard } from '../../shared/ui/kpi-card/kpi-card';
import { PageHeader } from '../../shared/ui/page-header/page-header';

interface LinhaMes {
  competencia: string;
  lancado: number;
  recebido: number;
  saldo: number;
}

interface LinhaUnidade {
  unidade: Unidade;
  devido: number;
  pago: number;
  saldo: number;
}

@Component({
  selector: 'app-relatorio',
  imports: [
    FormsModule,
    DecimalPipe,
    BrlPipe,
    Card,
    EmptyState,
    KpiCard,
    PageHeader,
    LucideCircleCheck,
    LucideCircleDollarSign,
    LucideScale,
    LucideWallet,
  ],
  templateUrl: './relatorio.html',
})
export class RelatorioPage {
  private readonly despesasService = inject(DespesasService);
  private readonly pagamentosService = inject(PagamentosService);
  private readonly unidadesService = inject(UnidadesService);
  private readonly rateioService = inject(RateioService);

  private readonly competenciaPadrao = computed<string>(() => {
    const disponiveis = this.despesasService.competenciasDisponiveis();
    return disponiveis.length > 0 ? disponiveis[0] : competenciaAtual();
  });

  protected desde = signal<string>('');
  protected ate = signal<string>('');

  private readonly desdeEfetivo = computed(() => this.desde() || this.competenciaPadrao());
  private readonly ateEfetivo = computed(() => this.ate() || competenciaAtual());

  protected readonly formatarMes = formatarCompetenciaCurta;

  protected readonly competenciasNoPeriodo = computed<string[]>(() => {
    const desde = this.desdeEfetivo();
    const ate = this.ateEfetivo();
    const todas = new Set<string>([
      ...this.despesasService.competenciasDisponiveis(),
      ...this.pagamentosService.all().map((p) => p.competencia),
    ]);
    return [...todas].filter((c) => c >= desde && c <= ate).sort();
  });

  protected readonly linhasPorMes = computed<LinhaMes[]>(() =>
    this.competenciasNoPeriodo().map((competencia) => {
      const rateio = this.rateioService.calcular(competencia);
      const recebido = this.pagamentosService
        .porCompetencia(competencia)
        .reduce((s, p) => s + p.valorPago, 0);
      return {
        competencia,
        lancado: rateio.totalDespesas,
        recebido,
        saldo: recebido - rateio.totalDespesas,
      };
    }),
  );

  protected readonly totalLancado = computed(() => this.linhasPorMes().reduce((s, l) => s + l.lancado, 0));
  protected readonly totalRecebido = computed(() => this.linhasPorMes().reduce((s, l) => s + l.recebido, 0));
  protected readonly saldoPeriodo = computed(() => this.totalRecebido() - this.totalLancado());
  protected readonly percentualRecebido = computed(() =>
    this.totalLancado() > 0 ? (this.totalRecebido() / this.totalLancado()) * 100 : 0,
  );

  protected readonly linhasPorUnidade = computed<LinhaUnidade[]>(() => {
    const competencias = this.competenciasNoPeriodo();
    const mapa = new Map<string, LinhaUnidade>(
      this.unidadesService.all().map((u) => [u.id, { unidade: u, devido: 0, pago: 0, saldo: 0 }]),
    );

    for (const competencia of competencias) {
      const rateio = this.rateioService.calcular(competencia);
      for (const linha of rateio.unidades) {
        const acumulado = mapa.get(linha.unidade.id);
        if (acumulado) acumulado.devido += linha.total;
      }
      for (const pagamento of this.pagamentosService.porCompetencia(competencia)) {
        const acumulado = mapa.get(pagamento.unidadeId);
        if (acumulado) acumulado.pago += pagamento.valorPago;
      }
    }

    return [...mapa.values()]
      .map((l) => ({ ...l, saldo: l.pago - l.devido }))
      .sort((a, b) => a.unidade.identificacao.localeCompare(b.unidade.identificacao, 'pt-BR', { numeric: true }));
  });
}

import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAlertTriangle,
  LucideCalendarClock,
  LucideCircleCheck,
  LucideClock,
  LucideDownload,
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
import { RelatorioBackupService } from '../../core/services/relatorio-backup.service';
import { UnidadesService } from '../../core/services/unidades.service';
import { BrlPipe } from '../../shared/pipes/brl.pipe';
import { CompetenciaPipe } from '../../shared/pipes/competencia.pipe';
import { Badge, BadgeTone } from '../../shared/ui/badge/badge';
import { Card } from '../../shared/ui/card/card';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { KpiCard } from '../../shared/ui/kpi-card/kpi-card';
import { MonthSwitcher } from '../../shared/ui/month-switcher/month-switcher';
import { PageHeader } from '../../shared/ui/page-header/page-header';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    DatePipe,
    BrlPipe,
    CompetenciaPipe,
    Badge,
    Card,
    EmptyState,
    KpiCard,
    MonthSwitcher,
    PageHeader,
    LucideAlertTriangle,
    LucideCalendarClock,
    LucideCircleCheck,
    LucideClock,
    LucideDownload,
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
  private readonly relatorioBackup = inject(RelatorioBackupService);
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

  /** Lembrete de contas a pagar: atrasadas + as que vencem nos próximos 30 dias. */
  protected readonly proximosVencimentos = computed(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const umDia = 24 * 60 * 60 * 1000;

    const todas = this.despesasService.all();
    const diaPorGrupo = new Map<string, number>();
    const diaPorCategoria = new Map<string, { competencia: string; dia: number }>();
    for (const d of todas) {
      if (!d.vencimento) continue;
      const dia = Number(d.vencimento.slice(8, 10));
      if (d.grupoId) diaPorGrupo.set(d.grupoId, dia);
      const atual = diaPorCategoria.get(d.categoriaId);
      if (!atual || d.competencia > atual.competencia) diaPorCategoria.set(d.categoriaId, { competencia: d.competencia, dia });
    }

    return todas
      .filter((d) => !d.pago)
      .map((despesa) => {
        let data: Date | null = null;
        let previsto = false;
        if (despesa.vencimento) {
          const [ano, mes, dia] = despesa.vencimento.slice(0, 10).split('-').map(Number);
          data = new Date(ano, mes - 1, dia);
        } else {
          const dia =
            (despesa.grupoId ? diaPorGrupo.get(despesa.grupoId) : undefined) ?? diaPorCategoria.get(despesa.categoriaId)?.dia;
          if (dia) {
            const [ano, mes] = despesa.competencia.split('-').map(Number);
            const ultimoDia = new Date(ano, mes, 0).getDate();
            data = new Date(ano, mes - 1, Math.min(dia, ultimoDia));
            previsto = true;
          }
        }
        if (!data) return null;
        return {
          despesa,
          data,
          previsto,
          conta: this.categoriasService.byId(despesa.categoriaId)?.nome ?? despesa.descricao,
          cor: this.categoriasService.byId(despesa.categoriaId)?.cor ?? '#8a9bad',
          dias: Math.round((data.getTime() - hoje.getTime()) / umDia),
        };
      })
      .filter((item) => item !== null)
      .filter((item) => item.dias <= 30 && (!item.previsto || item.dias >= 0))
      .sort((a, b) => a.data.getTime() - b.data.getTime());
  });

  /** Backup em texto dos 3 meses que terminam no mês selecionado. */
  baixarRelatorio(): void {
    this.relatorioBackup.baixar(this.month.competencia());
  }

  rotuloPrazo(dias: number): string {
    if (dias < 0) return `atrasada ${-dias} dia(s)`;
    if (dias === 0) return 'vence hoje';
    if (dias === 1) return 'vence amanhã';
    return `em ${dias} dias`;
  }

  tonePrazo(dias: number): BadgeTone {
    if (dias < 0) return 'red';
    if (dias <= 3) return 'amber';
    return 'neutral';
  }

  protected readonly semUnidades = computed(() => this.unidadesService.ativas().length === 0);

  protected readonly parceladasEmAberto = computed(() => {
    const hoje = this.month.competencia();
    return this.despesasService
      .all()
      .filter((d) => d.tipo === 'parcelada' && d.competencia >= hoje).length;
  });
}

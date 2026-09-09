import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideLandmark, LucidePlus, LucideTrash2, LucideWallet } from '@lucide/angular';
import { Movimentacao, TipoMovimentacao, Unidade } from '../../core/models';
import { INICIO_CONTROLE_CAIXA } from '../../core/constants';
import { DespesasService } from '../../core/services/despesas.service';
import { MonthService } from '../../core/services/month.service';
import { MovimentacoesService } from '../../core/services/movimentacoes.service';
import { NovoPagamento, PagamentosService } from '../../core/services/pagamentos.service';
import { RateioService } from '../../core/services/rateio.service';
import { UnidadesService } from '../../core/services/unidades.service';
import { BrlPipe } from '../../shared/pipes/brl.pipe';
import { CompetenciaPipe } from '../../shared/pipes/competencia.pipe';
import { Badge, BadgeTone } from '../../shared/ui/badge/badge';
import { Card } from '../../shared/ui/card/card';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { KpiCard } from '../../shared/ui/kpi-card/kpi-card';
import { Modal } from '../../shared/ui/modal/modal';
import { MonthSwitcher } from '../../shared/ui/month-switcher/month-switcher';
import { PageHeader } from '../../shared/ui/page-header/page-header';

type StatusLinha = 'pago' | 'parcial' | 'pendente';

interface LinhaPagamento {
  unidade: Unidade;
  valorDevido: number;
  valorPago: number;
  dataPagamento: string | null;
  formaPagamento: string;
  status: StatusLinha;
}

interface FormularioPagamento {
  unidadeId: string;
  valorPago: number | null;
  dataPagamento: string;
  formaPagamento: string;
  observacoes: string;
}

interface FormularioMovimentacao {
  data: string;
  descricao: string;
  tipo: TipoMovimentacao;
  valor: number | null;
}

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'app-caixa',
  imports: [
    FormsModule,
    BrlPipe,
    CompetenciaPipe,
    Badge,
    Card,
    EmptyState,
    KpiCard,
    Modal,
    MonthSwitcher,
    PageHeader,
    LucideLandmark,
    LucidePlus,
    LucideTrash2,
    LucideWallet,
  ],
  templateUrl: './caixa.html',
})
export class CaixaPage {
  private readonly rateioService = inject(RateioService);
  private readonly despesasService = inject(DespesasService);
  protected readonly unidadesService = inject(UnidadesService);
  protected readonly pagamentosService = inject(PagamentosService);
  protected readonly movimentacoesService = inject(MovimentacoesService);
  protected readonly month = inject(MonthService);

  protected readonly modalPagamentoAberto = signal(false);
  protected formularioPagamento: FormularioPagamento = {
    unidadeId: '',
    valorPago: null,
    dataPagamento: hojeIso(),
    formaPagamento: 'Pix',
    observacoes: '',
  };

  protected readonly modalMovimentacaoAberto = signal(false);
  protected formularioMovimentacao: FormularioMovimentacao = {
    data: hojeIso(),
    descricao: '',
    tipo: 'entrada',
    valor: null,
  };

  private readonly rateio = computed(() => this.rateioService.calcular(this.month.competencia()));

  protected readonly linhas = computed<LinhaPagamento[]>(() => {
    const pagamentos = this.pagamentosService.porCompetencia(this.month.competencia());
    return [...this.rateio().unidades]
      .sort((a, b) => a.unidade.identificacao.localeCompare(b.unidade.identificacao, 'pt-BR', { numeric: true }))
      .map((linha) => {
        const pagamento = pagamentos.find((p) => p.unidadeId === linha.unidade.id);
        const valorPago = pagamento?.valorPago ?? 0;
        let status: StatusLinha = 'pendente';
        if (valorPago > 0 && valorPago >= linha.total - 0.01) status = 'pago';
        else if (valorPago > 0) status = 'parcial';
        return {
          unidade: linha.unidade,
          valorDevido: linha.total,
          valorPago,
          dataPagamento: pagamento?.dataPagamento ?? null,
          formaPagamento: pagamento?.formaPagamento ?? '',
          status,
        };
      });
  });

  protected readonly totalDevido = computed(() => this.linhas().reduce((s, l) => s + l.valorDevido, 0));
  protected readonly totalRecebidoMes = computed(() => this.linhas().reduce((s, l) => s + l.valorPago, 0));
  protected readonly totalEmAberto = computed(() => Math.max(0, this.totalDevido() - this.totalRecebidoMes()));

  /**
   * Saldo acumulado até o mês selecionado. Só entra dinheiro de fato movimentado: pagamentos
   * recebidos, despesas já marcadas como "pago" (uma despesa lançada mas ainda não paga não
   * deduz do caixa) e movimentações manuais.
   */
  protected readonly saldoAcumulado = computed(() => {
    const limite = this.month.competencia();
    const totalPagamentos = this.pagamentosService
      .all()
      .filter((p) => p.competencia >= INICIO_CONTROLE_CAIXA && p.competencia <= limite)
      .reduce((s, p) => s + p.valorPago, 0);
    const totalDespesas = this.despesasService
      .all()
      .filter((d) => d.pago && d.competencia >= INICIO_CONTROLE_CAIXA && d.competencia <= limite)
      .reduce((s, d) => s + d.valor, 0);
    const totalMovimentacoes = this.movimentacoesService
      .all()
      .filter((m) => m.data.slice(0, 7) <= limite)
      .reduce((s, m) => s + (m.tipo === 'entrada' ? m.valor : -m.valor), 0);
    return totalPagamentos - totalDespesas + totalMovimentacoes;
  });

  protected readonly movimentacoesOrdenadas = computed(() =>
    [...this.movimentacoesService.all()].sort((a, b) => b.data.localeCompare(a.data)),
  );

  abrirPagamento(linha: LinhaPagamento): void {
    this.formularioPagamento = {
      unidadeId: linha.unidade.id,
      valorPago: linha.valorPago > 0 ? linha.valorPago : linha.valorDevido,
      dataPagamento: linha.dataPagamento ?? hojeIso(),
      formaPagamento: linha.formaPagamento || 'Pix',
      observacoes: '',
    };
    this.modalPagamentoAberto.set(true);
  }

  fecharPagamento(): void {
    this.modalPagamentoAberto.set(false);
  }

  salvarPagamento(): void {
    const dados = this.formularioPagamento;
    if (!dados.unidadeId || dados.valorPago === null || dados.valorPago < 0) return;

    const registro: NovoPagamento = {
      unidadeId: dados.unidadeId,
      competencia: this.month.competencia(),
      valorPago: dados.valorPago,
      dataPagamento: dados.dataPagamento || null,
      formaPagamento: dados.formaPagamento,
      observacoes: dados.observacoes,
    };
    this.pagamentosService.registrar(registro);
    this.modalPagamentoAberto.set(false);
  }

  abrirMovimentacao(): void {
    this.formularioMovimentacao = { data: hojeIso(), descricao: '', tipo: 'entrada', valor: null };
    this.modalMovimentacaoAberto.set(true);
  }

  fecharMovimentacao(): void {
    this.modalMovimentacaoAberto.set(false);
  }

  salvarMovimentacao(): void {
    const dados = this.formularioMovimentacao;
    if (!dados.descricao.trim() || dados.valor === null || dados.valor <= 0) return;
    this.movimentacoesService.criar({
      data: dados.data,
      descricao: dados.descricao,
      tipo: dados.tipo,
      valor: dados.valor,
    });
    this.modalMovimentacaoAberto.set(false);
  }

  removerMovimentacao(movimentacao: Movimentacao): void {
    this.movimentacoesService.remove(movimentacao.id);
  }

  toneStatus(status: StatusLinha): BadgeTone {
    const mapa: Record<StatusLinha, BadgeTone> = { pago: 'green', parcial: 'amber', pendente: 'red' };
    return mapa[status];
  }

  rotuloStatus(status: StatusLinha): string {
    return { pago: 'Pago', parcial: 'Parcial', pendente: 'Pendente' }[status];
  }
}

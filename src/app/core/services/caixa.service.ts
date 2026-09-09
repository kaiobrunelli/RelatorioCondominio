import { Injectable, inject } from '@angular/core';
import { INICIO_CONTROLE_CAIXA } from '../constants';
import { DespesasService } from './despesas.service';
import { MovimentacoesService } from './movimentacoes.service';
import { PagamentosService } from './pagamentos.service';

/**
 * Saldo real de caixa: só conta dinheiro que de fato entrou ou saiu — pagamentos recebidos dos
 * moradores, despesas já marcadas como "pago" (uma despesa lançada mas ainda não paga não deduz)
 * e movimentações manuais (saldo inicial, retiradas, aportes). É a mesma conta usada na tela Caixa
 * e no Dashboard, pra nunca mostrar dois números diferentes para a mesma pergunta.
 */
@Injectable({ providedIn: 'root' })
export class CaixaService {
  private readonly pagamentos = inject(PagamentosService);
  private readonly despesas = inject(DespesasService);
  private readonly movimentacoes = inject(MovimentacoesService);

  saldoAcumulado(competencia: string): number {
    const totalPagamentos = this.pagamentos
      .all()
      .filter((p) => p.competencia >= INICIO_CONTROLE_CAIXA && p.competencia <= competencia)
      .reduce((s, p) => s + p.valorPago, 0);
    const totalDespesasPagas = this.despesas
      .all()
      .filter((d) => d.pago && d.competencia >= INICIO_CONTROLE_CAIXA && d.competencia <= competencia)
      .reduce((s, d) => s + d.valor, 0);
    const totalMovimentacoes = this.movimentacoes
      .all()
      .filter((m) => m.data.slice(0, 7) <= competencia)
      .reduce((s, m) => s + (m.tipo === 'entrada' ? m.valor : -m.valor), 0);
    return totalPagamentos - totalDespesasPagas + totalMovimentacoes;
  }
}

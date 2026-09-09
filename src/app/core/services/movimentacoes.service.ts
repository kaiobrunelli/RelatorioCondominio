import { Injectable, computed } from '@angular/core';
import { Movimentacao, TipoMovimentacao } from '../models';
import { EntityStore, newId, nowIso } from './entity-store';

export interface NovaMovimentacao {
  data: string;
  descricao: string;
  tipo: TipoMovimentacao;
  valor: number;
}

@Injectable({ providedIn: 'root' })
export class MovimentacoesService extends EntityStore<Movimentacao> {
  readonly saldoManual = computed(() =>
    this.all().reduce((soma, m) => soma + (m.tipo === 'entrada' ? m.valor : -m.valor), 0),
  );

  constructor() {
    super('movimentacoes');
  }

  criar(dados: NovaMovimentacao): Movimentacao {
    const movimentacao: Movimentacao = {
      id: newId(),
      data: dados.data,
      descricao: dados.descricao.trim(),
      tipo: dados.tipo,
      valor: dados.valor,
      criadoEm: nowIso(),
    };
    this.add(movimentacao);
    return movimentacao;
  }
}

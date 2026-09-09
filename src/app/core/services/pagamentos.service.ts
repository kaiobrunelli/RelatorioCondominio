import { Injectable } from '@angular/core';
import { Pagamento } from '../models';
import { EntityStore, newId, nowIso } from './entity-store';

export interface NovoPagamento {
  unidadeId: string;
  competencia: string;
  valorPago: number;
  dataPagamento: string | null;
  formaPagamento: string;
  observacoes: string;
}

@Injectable({ providedIn: 'root' })
export class PagamentosService extends EntityStore<Pagamento> {
  constructor() {
    super('pagamentos');
  }

  porCompetencia(competencia: string): Pagamento[] {
    return this.all().filter((p) => p.competencia === competencia);
  }

  porUnidadeECompetencia(unidadeId: string, competencia: string): Pagamento | undefined {
    return this.all().find((p) => p.unidadeId === unidadeId && p.competencia === competencia);
  }

  registrar(dados: NovoPagamento): Pagamento {
    const existente = this.porUnidadeECompetencia(dados.unidadeId, dados.competencia);
    if (existente) {
      this.update(existente.id, {
        valorPago: dados.valorPago,
        dataPagamento: dados.dataPagamento,
        formaPagamento: dados.formaPagamento.trim(),
        observacoes: dados.observacoes.trim(),
      });
      return { ...existente, ...dados };
    }

    const pagamento: Pagamento = {
      id: newId(),
      unidadeId: dados.unidadeId,
      competencia: dados.competencia,
      valorPago: dados.valorPago,
      dataPagamento: dados.dataPagamento,
      formaPagamento: dados.formaPagamento.trim(),
      observacoes: dados.observacoes.trim(),
      criadoEm: nowIso(),
    };
    this.add(pagamento);
    return pagamento;
  }
}

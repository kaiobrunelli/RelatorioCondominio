import { Injectable } from '@angular/core';
import { Pagamento } from '../models';
import { EntityStore, newId, nowIso } from './entity-store';

export interface NovoPagamento {
  unidadeId: string;
  competencia: string;
  valorPago: number;
  pagoCondominio?: boolean;
  pagoAgua?: boolean;
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
      const patch: Partial<Pagamento> = {
        valorPago: dados.valorPago,
        dataPagamento: dados.dataPagamento,
        formaPagamento: dados.formaPagamento.trim(),
        observacoes: dados.observacoes.trim(),
      };
      if (dados.pagoCondominio !== undefined) patch.pagoCondominio = dados.pagoCondominio;
      if (dados.pagoAgua !== undefined) patch.pagoAgua = dados.pagoAgua;
      this.update(existente.id, patch);
      return { ...existente, ...patch };
    }

    const pagamento: Pagamento = {
      id: newId(),
      unidadeId: dados.unidadeId,
      competencia: dados.competencia,
      valorPago: dados.valorPago,
      pagoCondominio: dados.pagoCondominio ?? false,
      pagoAgua: dados.pagoAgua ?? false,
      dataPagamento: dados.dataPagamento,
      formaPagamento: dados.formaPagamento.trim(),
      observacoes: dados.observacoes.trim(),
      criadoEm: nowIso(),
    };
    this.add(pagamento);
    return pagamento;
  }
}

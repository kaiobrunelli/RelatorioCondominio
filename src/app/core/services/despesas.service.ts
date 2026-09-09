import { Injectable } from '@angular/core';
import { Despesa, TipoDespesa } from '../models';
import { somarMeses } from '../utils/competencia.util';
import { EntityStore, newId, nowIso } from './entity-store';

export interface NovaDespesa {
  categoriaId: string;
  descricao: string;
  valor: number;
  competencia: string;
  tipo: TipoDespesa;
  /** Para recorrente: quantos meses (incluindo o inicial) gerar. Para parcelada: total de parcelas. */
  repeticoes: number;
  fornecedorNome: string;
  fornecedorContato: string;
  observacoes: string;
}

@Injectable({ providedIn: 'root' })
export class DespesasService extends EntityStore<Despesa> {
  constructor() {
    super('despesas');
  }

  porCompetencia(competencia: string): Despesa[] {
    return this.all().filter((d) => d.competencia === competencia);
  }

  competenciasDisponiveis(): string[] {
    const set = new Set(this.all().map((d) => d.competencia));
    return [...set].sort();
  }

  criar(dados: NovaDespesa): Despesa[] {
    const base = {
      categoriaId: dados.categoriaId,
      descricao: dados.descricao.trim(),
      fornecedorNome: dados.fornecedorNome.trim(),
      fornecedorContato: dados.fornecedorContato.trim(),
      observacoes: dados.observacoes.trim(),
    };

    if (dados.tipo === 'unica') {
      const despesa: Despesa = {
        ...base,
        id: newId(),
        valor: dados.valor,
        competencia: dados.competencia,
        tipo: 'unica',
        grupoId: null,
        parcelaAtual: null,
        parcelaTotal: null,
        pago: false,
        criadoEm: nowIso(),
      };
      this.add(despesa);
      return [despesa];
    }

    const repeticoes = Math.max(1, Math.floor(dados.repeticoes || 1));
    const grupoId = newId();
    const criadoEm = nowIso();

    const geradas: Despesa[] = Array.from({ length: repeticoes }, (_, indice) => ({
      ...base,
      id: newId(),
      valor: dados.valor,
      competencia: somarMeses(dados.competencia, indice),
      tipo: dados.tipo,
      grupoId,
      parcelaAtual: dados.tipo === 'parcelada' ? indice + 1 : null,
      parcelaTotal: dados.tipo === 'parcelada' ? repeticoes : null,
      pago: false,
      criadoEm,
    }));

    this.addMany(geradas);
    return geradas;
  }

  removerGrupo(grupoId: string): void {
    const ids = this.all()
      .filter((d) => d.grupoId === grupoId)
      .map((d) => d.id);
    this.removeMany(ids);
  }

  marcarPago(id: string, pago: boolean): void {
    this.update(id, { pago });
  }
}

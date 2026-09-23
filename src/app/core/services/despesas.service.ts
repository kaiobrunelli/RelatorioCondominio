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
  /** Data de vencimento (AAAA-MM-DD) da primeira parcela/ocorrência, opcional. */
  vencimento: string | null;
}

/**
 * Soma meses a uma data completa (AAAA-MM-DD), mantendo o dia do vencimento. Se o mês de
 * destino for mais curto (ex.: dia 31 em fevereiro), usa o último dia desse mês.
 */
function somarMesesData(data: string, quantidade: number): string {
  const [ano, mes, dia] = data.split('-').map(Number);
  const primeiroDia = new Date(ano, mes - 1 + quantidade, 1);
  const ultimoDiaDoMes = new Date(primeiroDia.getFullYear(), primeiroDia.getMonth() + 1, 0).getDate();
  return `${primeiroDia.getFullYear()}-${String(primeiroDia.getMonth() + 1).padStart(2, '0')}-${String(Math.min(dia, ultimoDiaDoMes)).padStart(2, '0')}`;
}

/** Diferença em meses entre duas competências AAAA-MM (b − a). */
function mesesEntre(a: string, b: string): number {
  const [anoA, mesA] = a.split('-').map(Number);
  const [anoB, mesB] = b.split('-').map(Number);
  return (anoB - anoA) * 12 + (mesB - mesA);
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
        vencimento: dados.vencimento || null,
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
      vencimento: dados.vencimento ? somarMesesData(dados.vencimento, indice) : null,
      pago: false,
      criadoEm,
    }));

    this.addMany(geradas);
    return geradas;
  }

  /**
   * Aplica o vencimento a um lançamento e, se ele fizer parte de uma recorrência/parcelamento,
   * projeta o mesmo dia de vencimento para os meses seguintes da série.
   */
  definirVencimento(id: string, vencimento: string | null): void {
    const despesa = this.byId(id);
    if (!despesa) return;

    const alvos = despesa.grupoId
      ? this.all().filter((d) => d.grupoId === despesa.grupoId && d.competencia >= despesa.competencia)
      : [despesa];

    for (const alvo of alvos) {
      const novo = vencimento ? somarMesesData(vencimento, mesesEntre(despesa.competencia, alvo.competencia)) : null;
      if (alvo.vencimento !== novo) this.update(alvo.id, { vencimento: novo });
    }
  }

  /** Contas ainda não pagas com vencimento definido, da mais urgente para a mais distante. */
  proximosVencimentos(): Despesa[] {
    return this.all()
      .filter((d) => !d.pago && !!d.vencimento)
      .sort((a, b) => a.vencimento!.localeCompare(b.vencimento!));
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

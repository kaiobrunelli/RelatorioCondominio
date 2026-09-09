import { Injectable, computed } from '@angular/core';
import { TipoUnidade, Unidade } from '../models';
import { EntityStore, newId, nowIso } from './entity-store';

export interface NovaUnidade {
  identificacao: string;
  morador: string;
  email: string;
  telefone: string;
  tipo: TipoUnidade;
  ativo: boolean;
}

@Injectable({ providedIn: 'root' })
export class UnidadesService extends EntityStore<Unidade> {
  readonly ativas = computed(() => this.all().filter((u) => u.ativo));
  readonly coberturas = computed(() => this.ativas().filter((u) => u.tipo === 'cobertura'));
  readonly padrao = computed(() => this.ativas().filter((u) => u.tipo === 'padrao'));

  constructor() {
    super('unidades');
  }

  criar(dados: NovaUnidade): Unidade {
    const unidade: Unidade = {
      id: newId(),
      identificacao: dados.identificacao.trim(),
      morador: dados.morador.trim(),
      email: dados.email.trim(),
      telefone: dados.telefone.trim(),
      tipo: dados.tipo,
      ativo: dados.ativo,
      criadoEm: nowIso(),
    };
    this.add(unidade);
    return unidade;
  }
}

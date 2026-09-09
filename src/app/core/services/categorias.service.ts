import { Injectable } from '@angular/core';
import { Categoria } from '../models';
import { EntityStore, newId, nowIso } from './entity-store';

export interface NovaCategoria {
  nome: string;
  rateioDiferenciadoCobertura: boolean;
  cor: string;
}

@Injectable({ providedIn: 'root' })
export class CategoriasService extends EntityStore<Categoria> {
  constructor() {
    super('categorias');
  }

  criar(dados: NovaCategoria): Categoria {
    const categoria: Categoria = {
      id: newId(),
      nome: dados.nome.trim(),
      rateioDiferenciadoCobertura: dados.rateioDiferenciadoCobertura,
      cor: dados.cor,
      criadoEm: nowIso(),
    };
    this.add(categoria);
    return categoria;
  }
}

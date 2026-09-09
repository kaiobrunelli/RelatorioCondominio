import { computed, inject, Signal, signal, WritableSignal } from '@angular/core';
import { entidadeParaLinha, linhaParaEntidade } from '../supabase/entity-mapper';
import { SupabaseClientService } from '../supabase/supabase-client.service';

export interface Entity {
  id: string;
}

/**
 * Base reutilizável para serviços de domínio persistidos no Supabase (Postgres + RLS).
 * Mantém uma lista reativa (signal) em memória; mutações são otimistas (atualizam o
 * signal na hora) e disparam a chamada ao Supabase em seguida, revertendo o estado local
 * se o servidor recusar (ex.: RLS, coluna inválida). Chame `load()` uma vez, no boot do
 * app, antes de exibir as telas.
 */
export abstract class EntityStore<T extends Entity> {
  private readonly client = inject(SupabaseClientService).client;
  private readonly table: string;
  private readonly items: WritableSignal<T[]> = signal<T[]>([]);

  readonly all: Signal<T[]> = computed(() => this.items());
  readonly erro: WritableSignal<string | null> = signal<string | null>(null);

  protected constructor(table: string) {
    this.table = table;
  }

  protected get snapshot(): T[] {
    return this.items();
  }

  async load(): Promise<void> {
    const { data, error } = await this.client.from(this.table).select('*');
    if (error) {
      this.erro.set(error.message);
      return;
    }
    this.items.set((data ?? []).map((linha) => linhaParaEntidade<T>(linha)));
  }

  byId(id: string): T | undefined {
    return this.items().find((item) => item.id === id);
  }

  add(item: T): void {
    this.items.set([...this.items(), item]);
    this.client
      .from(this.table)
      .insert(entidadeParaLinha(item))
      .then(({ error }) => {
        if (error) {
          this.erro.set(error.message);
          this.items.set(this.items().filter((i) => i.id !== item.id));
        }
      });
  }

  addMany(newItems: T[]): void {
    this.items.set([...this.items(), ...newItems]);
    this.client
      .from(this.table)
      .insert(newItems.map(entidadeParaLinha))
      .then(({ error }) => {
        if (error) {
          this.erro.set(error.message);
          const ids = new Set(newItems.map((i) => i.id));
          this.items.set(this.items().filter((i) => !ids.has(i.id)));
        }
      });
  }

  update(id: string, patch: Partial<T>): void {
    const anterior = this.items();
    this.items.set(anterior.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    this.client
      .from(this.table)
      .update(entidadeParaLinha(patch))
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          this.erro.set(error.message);
          this.items.set(anterior);
        }
      });
  }

  remove(id: string): void {
    const anterior = this.items();
    this.items.set(anterior.filter((item) => item.id !== id));
    this.client
      .from(this.table)
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          this.erro.set(error.message);
          this.items.set(anterior);
        }
      });
  }

  removeMany(ids: string[]): void {
    if (ids.length === 0) return;
    const anterior = this.items();
    const set = new Set(ids);
    this.items.set(anterior.filter((item) => !set.has(item.id)));
    this.client
      .from(this.table)
      .delete()
      .in('id', ids)
      .then(({ error }) => {
        if (error) {
          this.erro.set(error.message);
          this.items.set(anterior);
        }
      });
  }

  isEmpty(): boolean {
    return this.items().length === 0;
  }
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

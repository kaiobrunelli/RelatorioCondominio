import { Injectable, computed, inject, signal } from '@angular/core';
import { CONFIG_PADRAO, ConfigCondominio } from '../models';
import { entidadeParaLinha, linhaParaEntidade } from '../supabase/entity-mapper';
import { SupabaseClientService } from '../supabase/supabase-client.service';

/** Linha única (id fixo) que guarda a configuração do condomínio no Supabase. */
const CONFIG_ID = 1;

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly client = inject(SupabaseClientService).client;
  private readonly state = signal<ConfigCondominio>(CONFIG_PADRAO);

  readonly config = computed(() => this.state());
  readonly erro = signal<string | null>(null);

  async load(): Promise<void> {
    const { data, error } = await this.client.from('config').select('*').eq('id', CONFIG_ID).maybeSingle();
    if (error) {
      this.erro.set(error.message);
      return;
    }
    if (data) {
      this.state.set(linhaParaEntidade<ConfigCondominio>(data));
    }
  }

  atualizar(patch: Partial<ConfigCondominio>): void {
    const anterior = this.state();
    const next = { ...anterior, ...patch };
    this.state.set(next);
    this.client
      .from('config')
      .update(entidadeParaLinha(patch))
      .eq('id', CONFIG_ID)
      .then(({ error }) => {
        if (error) {
          this.erro.set(error.message);
          this.state.set(anterior);
        }
      });
  }
}

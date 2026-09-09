import { Injectable, computed, inject, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { AUTH_EMAIL_DOMAIN } from '../supabase/supabase.config';
import { SupabaseClientService } from '../supabase/supabase-client.service';

/** Transforma um "login" simples (ex.: catalunha) no e-mail usado internamente pelo Supabase Auth. */
function loginParaEmail(login: string): string {
  return `${login.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly client = inject(SupabaseClientService).client;
  private readonly session = signal<Session | null>(null);
  private restaurada: Promise<void> | null = null;

  readonly autenticado = computed(() => !!this.session());

  /** Papel do usuário logado, vindo do app_metadata (só editável via painel/admin, nunca pelo próprio usuário). */
  readonly perfil = computed<'admin' | 'visualizador'>(() =>
    this.session()?.user.app_metadata?.['role'] === 'visualizador' ? 'visualizador' : 'admin',
  );

  /** Quando true, a UI deve esconder/desabilitar qualquer ação de cadastro/edição/exclusão. */
  readonly somenteLeitura = computed(() => this.perfil() === 'visualizador');

  constructor() {
    this.client.auth.onAuthStateChange((_evento, session) => {
      this.session.set(session);
    });
  }

  /** Recupera a sessão salva (se houver) antes do guard de rotas decidir. Chamar uma única vez, no boot. */
  restaurar(): Promise<void> {
    if (!this.restaurada) {
      this.restaurada = this.client.auth.getSession().then(({ data }) => {
        this.session.set(data.session);
      });
    }
    return this.restaurada;
  }

  async login(login: string, senha: string): Promise<{ sucesso: boolean; erro?: string }> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: loginParaEmail(login),
      password: senha,
    });
    if (error || !data.session) {
      return { sucesso: false, erro: 'Login ou senha inválidos.' };
    }
    this.session.set(data.session);
    return { sucesso: true };
  }

  async logout(): Promise<void> {
    await this.client.auth.signOut();
    this.session.set(null);
  }
}

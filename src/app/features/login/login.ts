import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideBuilding2, LucideLoaderCircle } from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, LucideBuilding2, LucideLoaderCircle],
  templateUrl: './login.html',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected login = '';
  protected senha = '';
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);

  async entrar(): Promise<void> {
    if (!this.login.trim() || !this.senha) return;
    this.carregando.set(true);
    this.erro.set(null);
    const resultado = await this.auth.login(this.login, this.senha);
    this.carregando.set(false);
    if (!resultado.sucesso) {
      this.erro.set(resultado.erro ?? 'Não foi possível entrar.');
      return;
    }
    this.router.navigateByUrl('/dashboard');
  }
}

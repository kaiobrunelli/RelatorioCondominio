import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideBuilding2, LucideCheck, LucideDroplets } from '@lucide/angular';
import { ConfigCondominio } from '../../core/models';
import { ConfigService } from '../../core/services/config.service';
import { Card } from '../../shared/ui/card/card';
import { PageHeader } from '../../shared/ui/page-header/page-header';

@Component({
  selector: 'app-configuracoes',
  imports: [FormsModule, Card, PageHeader, LucideBuilding2, LucideCheck, LucideDroplets],
  templateUrl: './configuracoes.html',
})
export class ConfiguracoesPage {
  private readonly configService = inject(ConfigService);

  protected formulario: ConfigCondominio = { ...this.configService.config() };
  protected readonly salvo = signal(false);

  salvar(): void {
    this.configService.atualizar(this.formulario);
    this.salvo.set(true);
    setTimeout(() => this.salvo.set(false), 2500);
  }
}

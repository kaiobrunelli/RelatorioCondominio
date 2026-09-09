import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideBuilding2, LucidePencil, LucidePlus, LucideTrash2 } from '@lucide/angular';
import { TipoUnidade, Unidade } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { UnidadesService } from '../../core/services/unidades.service';
import { Badge, BadgeTone } from '../../shared/ui/badge/badge';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { Modal } from '../../shared/ui/modal/modal';
import { PageHeader } from '../../shared/ui/page-header/page-header';

interface FormularioUnidade {
  identificacao: string;
  morador: string;
  email: string;
  telefone: string;
  tipo: TipoUnidade;
  ativo: boolean;
}

function formularioVazio(): FormularioUnidade {
  return { identificacao: '', morador: '', email: '', telefone: '', tipo: 'padrao', ativo: true };
}

@Component({
  selector: 'app-unidades',
  imports: [FormsModule, Badge, ConfirmDialog, EmptyState, Modal, PageHeader, LucideBuilding2, LucidePencil, LucidePlus, LucideTrash2],
  templateUrl: './unidades.html',
})
export class UnidadesPage {
  protected readonly unidadesService = inject(UnidadesService);
  protected readonly somenteLeitura = inject(AuthService).somenteLeitura;

  protected readonly modalAberto = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected formulario: FormularioUnidade = formularioVazio();

  protected readonly excluindo = signal<Unidade | null>(null);

  protected readonly unidadesOrdenadas = computed(() =>
    [...this.unidadesService.all()].sort((a, b) => a.identificacao.localeCompare(b.identificacao, 'pt-BR', { numeric: true })),
  );

  protected readonly resumo = computed(() => {
    const todas = this.unidadesService.all();
    return {
      total: todas.length,
      ativas: todas.filter((u) => u.ativo).length,
      coberturas: todas.filter((u) => u.tipo === 'cobertura').length,
    };
  });

  abrirNova(): void {
    this.editandoId.set(null);
    this.formulario = formularioVazio();
    this.modalAberto.set(true);
  }

  abrirEdicao(unidade: Unidade): void {
    this.editandoId.set(unidade.id);
    this.formulario = {
      identificacao: unidade.identificacao,
      morador: unidade.morador,
      email: unidade.email,
      telefone: unidade.telefone,
      tipo: unidade.tipo,
      ativo: unidade.ativo,
    };
    this.modalAberto.set(true);
  }

  fechar(): void {
    this.modalAberto.set(false);
  }

  salvar(): void {
    if (!this.formulario.identificacao.trim() || !this.formulario.morador.trim()) return;

    const editandoId = this.editandoId();
    if (editandoId) {
      this.unidadesService.update(editandoId, {
        identificacao: this.formulario.identificacao.trim(),
        morador: this.formulario.morador.trim(),
        email: this.formulario.email.trim(),
        telefone: this.formulario.telefone.trim(),
        tipo: this.formulario.tipo,
        ativo: this.formulario.ativo,
      });
    } else {
      this.unidadesService.criar(this.formulario);
    }
    this.modalAberto.set(false);
  }

  pedirExclusao(unidade: Unidade): void {
    this.excluindo.set(unidade);
  }

  confirmarExclusao(): void {
    const unidade = this.excluindo();
    if (!unidade) return;
    this.unidadesService.remove(unidade.id);
    this.excluindo.set(null);
  }

  toneTipo(tipo: TipoUnidade): BadgeTone {
    return tipo === 'cobertura' ? 'amber' : 'primary';
  }
}

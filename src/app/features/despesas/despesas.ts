import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideCircleAlert,
  LucideCircleCheck,
  LucideClock,
  LucidePencil,
  LucidePlus,
  LucideReceiptText,
  LucideSettings2,
  LucideTrash2,
} from '@lucide/angular';
import { Despesa, TipoDespesa } from '../../core/models';
import { CategoriasService } from '../../core/services/categorias.service';
import { DespesasService } from '../../core/services/despesas.service';
import { MonthService } from '../../core/services/month.service';
import { competenciaAtual } from '../../core/utils/competencia.util';
import { BrlPipe } from '../../shared/pipes/brl.pipe';
import { CompetenciaPipe } from '../../shared/pipes/competencia.pipe';
import { Badge, BadgeTone } from '../../shared/ui/badge/badge';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { KpiCard } from '../../shared/ui/kpi-card/kpi-card';
import { Modal } from '../../shared/ui/modal/modal';
import { MonthSwitcher } from '../../shared/ui/month-switcher/month-switcher';
import { PageHeader } from '../../shared/ui/page-header/page-header';

interface FormularioDespesa {
  categoriaId: string;
  descricao: string;
  valor: number | null;
  competencia: string;
  tipo: TipoDespesa;
  repeticoes: number;
  fornecedorNome: string;
  fornecedorContato: string;
  observacoes: string;
  vencimento: string;
}

interface FormularioCategoria {
  nome: string;
  rateioDiferenciadoCobertura: boolean;
  cor: string;
}

function formularioVazio(competencia: string): FormularioDespesa {
  return {
    categoriaId: '',
    descricao: '',
    valor: null,
    competencia,
    tipo: 'unica',
    repeticoes: 2,
    fornecedorNome: '',
    fornecedorContato: '',
    observacoes: '',
    vencimento: '',
  };
}

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const CORES_CATEGORIA = ['#2c6cae', '#1a8a8a', '#f2a13c', '#2e9e5b', '#d64545', '#5c7690', '#7fb0dc', '#16375d'];

@Component({
  selector: 'app-despesas',
  imports: [
    FormsModule,
    DatePipe,
    BrlPipe,
    CompetenciaPipe,
    Badge,
    ConfirmDialog,
    EmptyState,
    KpiCard,
    Modal,
    MonthSwitcher,
    PageHeader,
    LucideCircleAlert,
    LucideCircleCheck,
    LucideClock,
    LucidePencil,
    LucidePlus,
    LucideReceiptText,
    LucideSettings2,
    LucideTrash2,
  ],
  templateUrl: './despesas.html',
})
export class DespesasPage {
  protected readonly despesasService = inject(DespesasService);
  protected readonly categoriasService = inject(CategoriasService);
  protected readonly month = inject(MonthService);

  protected readonly mostrarTodosMeses = signal(false);
  protected readonly filtroCategoria = signal('todas');
  protected readonly filtroTipo = signal<'todos' | TipoDespesa>('todos');
  protected readonly busca = signal('');

  protected readonly modalDespesaAberto = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected formulario: FormularioDespesa = formularioVazio(competenciaAtual());

  protected readonly modalCategoriasAberto = signal(false);
  protected formularioCategoria: FormularioCategoria = {
    nome: '',
    rateioDiferenciadoCobertura: false,
    cor: CORES_CATEGORIA[0],
  };

  protected readonly confirmacao = signal<{ tipo: 'unico' | 'grupo'; id: string; grupoId: string | null } | null>(null);

  protected readonly despesasFiltradas = computed(() => {
    const base = this.mostrarTodosMeses()
      ? this.despesasService.all()
      : this.despesasService.porCompetencia(this.month.competencia());

    const categoria = this.filtroCategoria();
    const tipo = this.filtroTipo();
    const termo = this.busca().trim().toLowerCase();

    return base
      .filter((d) => categoria === 'todas' || d.categoriaId === categoria)
      .filter((d) => tipo === 'todos' || d.tipo === tipo)
      .filter(
        (d) =>
          !termo ||
          d.descricao.toLowerCase().includes(termo) ||
          d.fornecedorNome.toLowerCase().includes(termo),
      )
      .sort((a, b) => (a.competencia === b.competencia ? b.valor - a.valor : b.competencia.localeCompare(a.competencia)));
  });

  protected readonly totalFiltrado = computed(() => this.despesasFiltradas().reduce((s, d) => s + d.valor, 0));
  protected readonly totalPago = computed(() =>
    this.despesasFiltradas()
      .filter((d) => d.pago)
      .reduce((s, d) => s + d.valor, 0),
  );
  protected readonly totalAPagar = computed(() =>
    this.despesasFiltradas()
      .filter((d) => !d.pago)
      .reduce((s, d) => s + d.valor, 0),
  );

  nomeCategoria(categoriaId: string): string {
    return this.categoriasService.byId(categoriaId)?.nome ?? 'Sem categoria';
  }

  corCategoria(categoriaId: string): string {
    return this.categoriasService.byId(categoriaId)?.cor ?? '#8a9bad';
  }

  abrirNovaDespesa(): void {
    this.editandoId.set(null);
    this.formulario = formularioVazio(this.month.competencia());
    this.modalDespesaAberto.set(true);
  }

  abrirEdicaoDespesa(despesa: Despesa): void {
    this.editandoId.set(despesa.id);
    this.formulario = {
      categoriaId: despesa.categoriaId,
      descricao: despesa.descricao,
      valor: despesa.valor,
      competencia: despesa.competencia,
      tipo: despesa.tipo,
      repeticoes: despesa.parcelaTotal ?? 2,
      fornecedorNome: despesa.fornecedorNome,
      fornecedorContato: despesa.fornecedorContato,
      observacoes: despesa.observacoes,
      vencimento: despesa.vencimento ?? '',
    };
    this.modalDespesaAberto.set(true);
  }

  fecharModalDespesa(): void {
    this.modalDespesaAberto.set(false);
  }

  salvarDespesa(): void {
    const dados = this.formulario;
    if (!dados.categoriaId || !dados.descricao.trim() || !dados.valor || dados.valor <= 0) return;

    const editandoId = this.editandoId();
    if (editandoId) {
      this.despesasService.update(editandoId, {
        categoriaId: dados.categoriaId,
        descricao: dados.descricao.trim(),
        valor: dados.valor,
        competencia: dados.competencia,
        fornecedorNome: dados.fornecedorNome.trim(),
        fornecedorContato: dados.fornecedorContato.trim(),
        observacoes: dados.observacoes.trim(),
        vencimento: dados.vencimento || null,
      });
    } else {
      this.despesasService.criar({
        categoriaId: dados.categoriaId,
        descricao: dados.descricao,
        valor: dados.valor,
        competencia: dados.competencia,
        tipo: dados.tipo,
        repeticoes: dados.repeticoes,
        fornecedorNome: dados.fornecedorNome,
        fornecedorContato: dados.fornecedorContato,
        observacoes: dados.observacoes,
        vencimento: dados.vencimento || null,
      });
    }

    this.modalDespesaAberto.set(false);
  }

  pedirExclusao(despesa: Despesa, escopo: 'unico' | 'grupo'): void {
    this.confirmacao.set({ tipo: escopo, id: despesa.id, grupoId: despesa.grupoId });
  }

  confirmarExclusao(): void {
    const alvo = this.confirmacao();
    if (!alvo) return;
    if (alvo.tipo === 'grupo' && alvo.grupoId) {
      this.despesasService.removerGrupo(alvo.grupoId);
    } else {
      this.despesasService.remove(alvo.id);
    }
    this.confirmacao.set(null);
  }

  abrirCategorias(): void {
    this.formularioCategoria = { nome: '', rateioDiferenciadoCobertura: false, cor: CORES_CATEGORIA[0] };
    this.modalCategoriasAberto.set(true);
  }

  salvarCategoria(): void {
    const dados = this.formularioCategoria;
    if (!dados.nome.trim()) return;
    this.categoriasService.criar(dados);
    this.formularioCategoria = {
      nome: '',
      rateioDiferenciadoCobertura: false,
      cor: CORES_CATEGORIA[(this.categoriasService.all().length + 1) % CORES_CATEGORIA.length],
    };
  }

  categoriaEmUso(categoriaId: string): boolean {
    return this.despesasService.all().some((d) => d.categoriaId === categoriaId);
  }

  removerCategoria(categoriaId: string): void {
    if (this.categoriaEmUso(categoriaId)) return;
    this.categoriasService.remove(categoriaId);
  }

  rotuloTipo(tipo: TipoDespesa): string {
    return { unica: 'Única', recorrente: 'Recorrente', parcelada: 'Parcelada' }[tipo];
  }

  toneTipo(tipo: TipoDespesa): BadgeTone {
    const mapa: Record<TipoDespesa, BadgeTone> = { unica: 'neutral', recorrente: 'primary', parcelada: 'amber' };
    return mapa[tipo];
  }

  alternarPago(despesa: Despesa): void {
    this.despesasService.marcarPago(despesa.id, !despesa.pago);
  }

  atrasada(despesa: Despesa): boolean {
    return !despesa.pago && !!despesa.vencimento && despesa.vencimento < hojeIso();
  }
}

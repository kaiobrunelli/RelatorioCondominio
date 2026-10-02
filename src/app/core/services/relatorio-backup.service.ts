import { Injectable, inject } from '@angular/core';
import { INICIO_CONTROLE_CAIXA } from '../constants';
import { Despesa } from '../models';
import { formatarCompetenciaCurta, formatarCompetenciaExtenso, somarMeses } from '../utils/competencia.util';
import { CaixaService } from './caixa.service';
import { CategoriasService } from './categorias.service';
import { ConfigService } from './config.service';
import { DespesasService } from './despesas.service';
import { MovimentacoesService } from './movimentacoes.service';
import { PagamentosService } from './pagamentos.service';
import { RateioService } from './rateio.service';
import { UnidadesService } from './unidades.service';

const LARGURA = 100;
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function valor(v: number): string {
  return brl.format(v);
}

/** AAAA-MM-DD (ou ISO completo) → DD/MM/AAAA. */
function data(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

function esq(texto: string, largura: number): string {
  return texto.length > largura ? texto.slice(0, largura - 1) + '…' : texto.padEnd(largura);
}

function dir(texto: string, largura: number): string {
  return texto.padStart(largura);
}

function titulo(texto: string): string[] {
  return ['', '='.repeat(LARGURA), texto.toUpperCase(), '='.repeat(LARGURA)];
}

function subtitulo(texto: string): string[] {
  return ['', texto, '-'.repeat(LARGURA)];
}

interface LinhaExtrato {
  data: string | null;
  descricao: string;
  valor: number;
}

/**
 * Gera o relatório de backup dos últimos 3 meses em texto puro (abre no Bloco de Notas ou em
 * qualquer celular): resumo da situação atual, evolução do saldo mês a mês e, para cada mês, as
 * contas lançadas (pagas / em aberto), o recebimento de cada unidade, as movimentações manuais e
 * o extrato do caixa com o saldo após cada lançamento. Usa as mesmas regras do CaixaService, então
 * o saldo final de cada mês bate com o que aparece no Dashboard e na tela Caixa.
 */
@Injectable({ providedIn: 'root' })
export class RelatorioBackupService {
  private readonly caixa = inject(CaixaService);
  private readonly despesas = inject(DespesasService);
  private readonly pagamentos = inject(PagamentosService);
  private readonly movimentacoes = inject(MovimentacoesService);
  private readonly categorias = inject(CategoriasService);
  private readonly rateio = inject(RateioService);
  private readonly config = inject(ConfigService);
  private readonly unidades = inject(UnidadesService);

  /** Baixa o arquivo .txt com os 3 meses que terminam em `competenciaFinal` (AAAA-MM). */
  baixar(competenciaFinal: string): void {
    const conteudo = this.gerar(competenciaFinal);
    // BOM para o Bloco de Notas reconhecer UTF-8 (acentos) e \r\n para quebras de linha no Windows.
    const blob = new Blob(['﻿' + conteudo.replace(/\n/g, '\r\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-condominio-${somarMeses(competenciaFinal, -2)}-a-${competenciaFinal}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  gerar(competenciaFinal: string): string {
    const meses = [somarMeses(competenciaFinal, -2), somarMeses(competenciaFinal, -1), competenciaFinal];
    const agora = new Date();
    const linhas: string[] = [];

    linhas.push(
      '='.repeat(LARGURA),
      `RELATÓRIO FINANCEIRO — ${this.config.config().nomeCondominio.toUpperCase()}`,
      `Período: ${formatarCompetenciaExtenso(meses[0])} a ${formatarCompetenciaExtenso(competenciaFinal)}`,
      `Gerado em: ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      '='.repeat(LARGURA),
    );

    linhas.push(...this.resumo(competenciaFinal));
    linhas.push(...this.evolucao(meses));
    for (const competencia of meses) linhas.push(...this.mes(competencia));

    linhas.push(
      '',
      '='.repeat(LARGURA),
      'Como ler este relatório:',
      '- "Saldo em caixa" é o dinheiro que de fato existe: recebimentos dos moradores + movimentações manuais',
      '  (saldo inicial, aportes, retiradas) − contas já pagas. Conta EM ABERTO ainda não saiu do caixa.',
      `- O controle de caixa começa em ${formatarCompetenciaExtenso(INICIO_CONTROLE_CAIXA)}; antes disso o efeito`,
      '  das contas antigas já está no lançamento de "Saldo inicial".',
      '='.repeat(LARGURA),
      '',
    );

    return linhas.map((l) => l.trimEnd()).join('\n');
  }

  // ---------------------------------------------------------------------------------------------

  private resumo(competenciaFinal: string): string[] {
    const saldo = this.caixa.saldoAcumulado(competenciaFinal);
    const contasAbertas = this.contasEmAberto(competenciaFinal);
    const totalContasAbertas = contasAbertas.reduce((s, d) => s + d.valor, 0);
    const moradoresPendentes = this.moradoresPendentes(competenciaFinal);
    const totalMoradoresPendentes = moradoresPendentes.reduce((s, m) => s + m.falta, 0);
    const saldoPrevisto = saldo - totalContasAbertas + totalMoradoresPendentes;

    const linhas = [...titulo(`Situação atual (até ${formatarCompetenciaExtenso(competenciaFinal)})`)];
    const item = (rotulo: string, v: string) => linhas.push(`${esq(rotulo, 60)}${dir(v, 20)}`);

    item(`Saldo em caixa ${saldo >= 0 ? '(sobrando)' : '(FALTANDO)'}`, valor(saldo));
    item(`(−) Contas do condomínio ainda não pagas (${contasAbertas.length})`, valor(totalContasAbertas));
    item(`(+) A receber dos moradores (${moradoresPendentes.length} pendência(s))`, valor(totalMoradoresPendentes));
    linhas.push(' '.repeat(60) + '-'.repeat(20));
    item('Saldo previsto se tudo for pago e recebido', valor(saldoPrevisto));

    linhas.push(...subtitulo('O QUE FALTA PAGAR (contas do condomínio em aberto)'));
    if (contasAbertas.length === 0) {
      linhas.push('Nenhuma conta em aberto. Tudo pago.');
    } else {
      linhas.push(`${esq('Mês', 10)}${esq('Vencimento', 13)}${esq('Conta', 57)}${dir('Valor', 20)}`);
      for (const d of contasAbertas) {
        linhas.push(
          `${esq(formatarCompetenciaCurta(d.competencia), 10)}${esq(data(d.vencimento), 13)}${esq(this.nomeConta(d), 57)}${dir(valor(d.valor), 20)}`,
        );
      }
    }

    linhas.push(...subtitulo('QUEM FALTA PAGAR (moradores com pagamento pendente)'));
    if (moradoresPendentes.length === 0) {
      linhas.push('Nenhum morador com pagamento pendente.');
    } else {
      linhas.push(`${esq('Mês', 10)}${esq('Unidade', 12)}${esq('Morador', 38)}${dir('Cobrado', 14)}${dir('Pago', 13)}${dir('Falta', 13)}`);
      for (const m of moradoresPendentes) {
        linhas.push(
          `${esq(formatarCompetenciaCurta(m.competencia), 10)}${esq(m.unidade, 12)}${esq(m.morador, 38)}${dir(valor(m.cobrado), 14)}${dir(valor(m.pago), 13)}${dir(valor(m.falta), 13)}`,
        );
      }
    }
    return linhas;
  }

  private evolucao(meses: string[]): string[] {
    const linhas = [...titulo('Evolução do saldo de caixa')];
    linhas.push(`${esq('Mês', 12)}${dir('Saldo inicial', 18)}${dir('Entradas', 17)}${dir('Saídas', 17)}${dir('Saldo final', 18)}${dir('Variação', 18)}`);
    for (const competencia of meses) {
      const { entradas, saidas } = this.extrato(competencia);
      const inicial = this.caixa.saldoAcumulado(somarMeses(competencia, -1));
      const final = this.caixa.saldoAcumulado(competencia);
      const totalEntradas = entradas.reduce((s, l) => s + l.valor, 0);
      const totalSaidas = saidas.reduce((s, l) => s + l.valor, 0);
      linhas.push(
        `${esq(formatarCompetenciaCurta(competencia), 12)}${dir(valor(inicial), 18)}${dir(valor(totalEntradas), 17)}${dir(valor(totalSaidas), 17)}${dir(valor(final), 18)}${dir((final - inicial >= 0 ? '+' : '') + valor(final - inicial), 18)}`,
      );
    }
    return linhas;
  }

  private mes(competencia: string): string[] {
    const linhas = [...titulo(`Mês: ${formatarCompetenciaExtenso(competencia)}`)];
    const inicial = this.caixa.saldoAcumulado(somarMeses(competencia, -1));
    const final = this.caixa.saldoAcumulado(competencia);

    // -- Contas do condomínio --
    const despesas = [...this.despesas.porCompetencia(competencia)].sort((a, b) =>
      (a.vencimento ?? '9999').localeCompare(b.vencimento ?? '9999'),
    );
    linhas.push(...subtitulo('1) CONTAS DO CONDOMÍNIO (lançamentos do mês)'));
    if (despesas.length === 0) {
      linhas.push('Nenhuma conta lançada neste mês.');
    } else {
      linhas.push(`${esq('Situação', 12)}${esq('Vencimento', 13)}${esq('Conta', 55)}${dir('Valor', 20)}`);
      for (const d of despesas) {
        linhas.push(
          `${esq(d.pago ? 'PAGA' : 'EM ABERTO', 12)}${esq(data(d.vencimento), 13)}${esq(this.nomeConta(d), 55)}${dir(valor(d.valor), 20)}`,
        );
      }
      const total = despesas.reduce((s, d) => s + d.valor, 0);
      const pago = despesas.filter((d) => d.pago).reduce((s, d) => s + d.valor, 0);
      linhas.push(
        '-'.repeat(LARGURA),
        `${esq('Total lançado', 80)}${dir(valor(total), 20)}`,
        `${esq('Já pago', 80)}${dir(valor(pago), 20)}`,
        `${esq('Em aberto (falta pagar)', 80)}${dir(valor(total - pago), 20)}`,
      );
    }

    // -- Recebimento dos moradores --
    const rateio = this.rateio.calcular(competencia);
    const pagamentosMes = this.pagamentos.porCompetencia(competencia);
    linhas.push(...subtitulo('2) RECEBIMENTO DOS MORADORES (condomínio + água)'));
    if (competencia < INICIO_CONTROLE_CAIXA) {
      linhas.push(
        `Mês anterior ao início do controle de caixa (${formatarCompetenciaCurta(INICIO_CONTROLE_CAIXA)}): recebimentos não registrados no sistema.`,
      );
    } else if (rateio.unidades.length === 0) {
      linhas.push('Nenhuma unidade cadastrada.');
    } else {
      linhas.push(
        `${esq('Unidade', 10)}${esq('Morador', 28)}${dir('Cobrado', 14)}${dir('Pago', 14)}${esq('  Data pgto', 13)}${esq('  Forma', 9)}${esq('  Situação', 12)}`,
      );
      for (const r of rateio.unidades) {
        const p = pagamentosMes.find((pg) => pg.unidadeId === r.unidade.id);
        const pago = p?.valorPago ?? 0;
        const situacao = pago >= r.total - 0.005 ? 'PAGO' : pago > 0 ? 'PARCIAL' : 'PENDENTE';
        linhas.push(
          `${esq(r.unidade.identificacao, 10)}${esq(r.unidade.morador || '—', 28)}${dir(valor(r.total), 14)}${dir(valor(pago), 14)}${esq('  ' + data(p?.dataPagamento), 13)}${esq('  ' + (p?.formaPagamento || '—'), 9)}${esq('  ' + situacao, 12)}`,
        );
      }
      const recebido = pagamentosMes.reduce((s, p) => s + p.valorPago, 0);
      linhas.push(
        '-'.repeat(LARGURA),
        `${esq('Total a cobrar', 80)}${dir(valor(rateio.totalCobrado), 20)}`,
        `${esq('Recebido', 80)}${dir(valor(recebido), 20)}`,
        `${esq('Falta receber', 80)}${dir(valor(Math.max(0, rateio.totalCobrado - recebido)), 20)}`,
      );
    }

    // -- Extrato do caixa --
    const { entradas, saidas } = this.extrato(competencia);
    const lancamentos = [
      ...entradas.map((l) => ({ ...l, sinal: 1 })),
      ...saidas.map((l) => ({ ...l, sinal: -1 })),
    ].sort((a, b) => (a.data ?? '9999').localeCompare(b.data ?? '9999'));

    linhas.push(...subtitulo('3) EXTRATO DO CAIXA (só o que de fato entrou ou saiu, com saldo após cada linha)'));
    if (competencia < INICIO_CONTROLE_CAIXA) {
      linhas.push(
        `Mês anterior ao início do controle de caixa (${formatarCompetenciaCurta(INICIO_CONTROLE_CAIXA)}): só entram as movimentações manuais.`,
      );
    }
    linhas.push(`${esq('Data', 12)}${esq('Descrição', 50)}${dir('Valor', 19)}${dir('Saldo', 19)}`);
    linhas.push(`${esq('', 12)}${esq('Saldo no início do mês', 50)}${dir('', 19)}${dir(valor(inicial), 19)}`);
    let saldo = inicial;
    for (const l of lancamentos) {
      saldo += l.sinal * l.valor;
      linhas.push(
        `${esq(data(l.data), 12)}${esq(l.descricao, 50)}${dir((l.sinal > 0 ? '+' : '−') + valor(l.valor), 19)}${dir(valor(saldo), 19)}`,
      );
    }
    linhas.push('-'.repeat(LARGURA), `${esq('SALDO FINAL DO MÊS', 81)}${dir(valor(final), 19)}`);
    return linhas;
  }

  // ---------------------------------------------------------------------------------------------

  /** Mesmas regras do CaixaService.saldoAcumulado, mas lançamento a lançamento, só no mês informado. */
  private extrato(competencia: string): { entradas: LinhaExtrato[]; saidas: LinhaExtrato[] } {
    const controlado = competencia >= INICIO_CONTROLE_CAIXA;
    const entradas: LinhaExtrato[] = [];
    const saidas: LinhaExtrato[] = [];

    if (controlado) {
      for (const p of this.pagamentos.porCompetencia(competencia)) {
        if (p.valorPago <= 0) continue;
        const u = this.unidades.byId(p.unidadeId);
        entradas.push({
          data: p.dataPagamento,
          descricao: `Recebido — Unid. ${u?.identificacao ?? '?'}${u?.morador ? ' (' + u.morador + ')' : ''}`,
          valor: p.valorPago,
        });
      }
      for (const d of this.despesas.porCompetencia(competencia)) {
        if (!d.pago) continue;
        saidas.push({ data: d.vencimento, descricao: `Conta paga — ${this.nomeConta(d)}`, valor: d.valor });
      }
    }

    for (const m of this.movimentacoes.all()) {
      if (m.data.slice(0, 7) !== competencia) continue;
      const linha = { data: m.data, descricao: `${m.tipo === 'entrada' ? 'Entrada' : 'Saída'} manual — ${m.descricao}`, valor: m.valor };
      (m.tipo === 'entrada' ? entradas : saidas).push(linha);
    }
    return { entradas, saidas };
  }

  /** Contas não pagas a partir do início do controle de caixa até o mês informado (inclusive). */
  private contasEmAberto(competenciaFinal: string): Despesa[] {
    return this.despesas
      .all()
      .filter((d) => !d.pago && d.competencia >= INICIO_CONTROLE_CAIXA && d.competencia <= competenciaFinal)
      .sort((a, b) => a.competencia.localeCompare(b.competencia) || (a.vencimento ?? '').localeCompare(b.vencimento ?? ''));
  }

  /** Unidades que pagaram menos do que o cobrado, a partir do início do controle de caixa até o mês informado. */
  private moradoresPendentes(competenciaFinal: string) {
    const pendencias: { competencia: string; unidade: string; morador: string; cobrado: number; pago: number; falta: number }[] = [];
    for (let c = INICIO_CONTROLE_CAIXA; c <= competenciaFinal; c = somarMeses(c, 1)) {
      const pagamentosMes = this.pagamentos.porCompetencia(c);
      for (const r of this.rateio.calcular(c).unidades) {
        const pago = pagamentosMes.find((p) => p.unidadeId === r.unidade.id)?.valorPago ?? 0;
        const falta = Math.round((r.total - pago) * 100) / 100;
        if (falta > 0) {
          pendencias.push({ competencia: c, unidade: r.unidade.identificacao, morador: r.unidade.morador || '—', cobrado: r.total, pago, falta });
        }
      }
    }
    return pendencias;
  }

  private nomeConta(d: Despesa): string {
    const categoria = this.categorias.byId(d.categoriaId)?.nome;
    const parcela = d.parcelaAtual && d.parcelaTotal ? ` (${d.parcelaAtual}/${d.parcelaTotal})` : '';
    const descricao = d.descricao && d.descricao !== categoria ? d.descricao : '';
    return [categoria, descricao].filter(Boolean).join(' - ') + parcela || 'Sem descrição';
  }
}

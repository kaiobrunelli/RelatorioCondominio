import { Pipe, PipeTransform } from '@angular/core';
import { formatarCompetenciaCurta, formatarCompetenciaExtenso } from '../../core/utils/competencia.util';

@Pipe({ name: 'competencia' })
export class CompetenciaPipe implements PipeTransform {
  transform(valor: string | null | undefined, formato: 'curta' | 'extenso' = 'extenso'): string {
    if (!valor) return '';
    return formato === 'extenso' ? formatarCompetenciaExtenso(valor) : formatarCompetenciaCurta(valor);
  }
}

import { Pipe, PipeTransform } from '@angular/core';

const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

@Pipe({ name: 'brl' })
export class BrlPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return formatter.format(valor ?? 0);
  }
}

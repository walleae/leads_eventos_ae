export interface Cadencia {
  id: string;
  nome: string;
  templateNome: string;
  templateCorpo: string;
  hasImage: boolean;
  imageUrl?: string;
  segmentoIds: string[];
  origemIds: string[];
  // 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sab
  diasSemana: number[];
  // hora em BRT (0-23)
  horario: number;
  ativo: boolean;
  ultimaExecucao?: string;
  createdAt: string;
  updatedAt: string;
}

export const DIAS_SEMANA = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
] as const;
